<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useBaseStore } from '../stores/base';
import { Direction, ControlType } from '@/const';
import { storeToRefs } from 'pinia';
import { useEventBus } from '@vueuse/core';
import { useCanMove } from '../composables/useCanMove';
import { getTileColor } from '@/colors';
import { getArrayKeyByValue } from '@/utils';

const props = defineProps<{
  squareSize: number;
  order: number;
  mixedOrder: number;
}>();

const baseStore = useBaseStore();

const currentElementIndex = computed(() => {
  return getArrayKeyByValue(baseStore.currentOrders, props.mixedOrder) + 1;
});
const currentOrder = computed(() => {
  return baseStore.currentOrders[props.order];
});
const { elementCol, elementRow, canMoveRight, canMoveLeft, canMoveUp, canMoveDown } =
  useCanMove(currentElementIndex, props.squareSize);

const sizeVar = computed(() => {
  return `${props.squareSize}px`;
});
const borderRadiusVar = computed(() => {
  if (baseStore.cageMode && baseStore.finishLoadingAllCageImages || baseStore.proMode) {
    const topLeft = elementCol.value === 1 && elementRow.value === 1 ? 8 : 0;
    const topRight = elementCol.value === baseStore.numLines && elementRow.value === 1 ? 8 : 0;
    const bottomRight = elementCol.value === baseStore.numLines &&
    elementRow.value === baseStore.numLines
      ? 8
      : 0;
    const bottomLeft = elementCol.value === 1 && elementRow.value === baseStore.numLines ? 8 : 0;
    return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  }
  return '8px';
});
const blockTransition = computed(() => {
  if (baseStore.inReplay) {
    return `all ${baseStore.replaySpeed / 1000}s ease 0s`;
  }
  if (baseStore.proMode) {
    return 'none';
  }
  return 'all 0.2s ease 0s';
});
const bgColor = computed(() => {
  if (baseStore.proMode) {
    return getTileColor(baseStore.numLines, props.mixedOrder);
  }
  if (baseStore.cageMode) {
    return 'var(--background-color)';
  }
  return 'var(--square-bg-color)';
});
const fontSizeD = computed(() => {
  if (baseStore.proMode) {
    if (baseStore.numLines === 6) {
      return '39px';
    } else if (baseStore.numLines === 7) {
      return '35px';
    } else if (baseStore.numLines === 8) {
      return '33px';
    } else {
      return '45px';
    }
  }
  return '25px';
});
const fontSizeM = computed(() => {
  if (baseStore.proMode) {
    if (baseStore.numLines === 6) {
      return '29px';
    } else if (baseStore.numLines === 7) {
      return '25px';
    } else if (baseStore.numLines === 8) {
      return '24px';
    } else {
      return '33px';
    }
  }
  if (baseStore.numLines === 7) {
    return '21px';
  } else if (baseStore.numLines === 8) {
    return '18px';
  } else {
    return '25px';
  }
});
const inPlaceColor = computed(() => {
  if (baseStore.proMode) {
    return '#40d9ff';
  }
  return 'var(--square-in-place-color)';
});

const calculatedLeft = computed(() => {
  return (
    (Number(elementCol.value) - 1) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (Number(elementCol.value) - 1)
  );
});
const calculatedTop = computed(() => {
  return (
    (Number(elementRow.value) - 1) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (Number(elementRow.value) - 1)
  );
});
const calculatedTopBind = computed(() => {
  return `${calculatedTop.value}px`;
});
const calculatedLeftBind = computed(() => {
  return `${calculatedLeft.value}px`;
});

const isFreeElement = computed(() => {
  return props.mixedOrder === 0;
});
const isSquareInPlace = computed(() => {
  return currentElementIndex.value === props.mixedOrder;
});
const isDoneAll = computed(() => {
  return baseStore.isDone;
});

const moveDirection = computed(() => {
  if (canMoveRight.value as boolean) {
    return Direction.Right;
  } else if (canMoveLeft.value as boolean) {
    return Direction.Left;
  } else if (canMoveUp.value as boolean) {
    return Direction.Up;
  } else if (canMoveDown.value as boolean) {
    return Direction.Down;
  }
  return Direction.None;
});
const cannotMove = computed(() => {
  return isDoneAll.value || baseStore.paused || moveDirection.value === Direction.None;
});
const move = (control: ControlType): void => {
  if (baseStore.isMoving || baseStore.inReplay || baseStore.sharedPlaygroundMode ||
  baseStore.marathonReplay || cannotMove.value) {
    return;
  }
  baseStore.isMoving = true;
  if (!baseStore.checkDiffBetweenElementsAndMove(currentElementIndex.value, moveDirection.value, control)) {
    baseStore.saveState(currentElementIndex.value - 1, moveDirection.value, control);
  }
  baseStore.isMoving = false;
};
const moveByMouse = (event: MouseEvent): void => {
  if (!(baseStore.hoverOnControl && baseStore.proMode)) {
    return;
  }
  if (event.ctrlKey) {
    return;
  }
  move(ControlType.Mouse);
};

const getCursor = computed(() => {
  if (baseStore.hoverOnControl && baseStore.proMode || cannotMove.value) {
    return 'auto';
  }
  return 'pointer';
});

const isCaptured = ref(false);
const isNoBorder = ref(false);
watch(
  isDoneAll,
  (newValue) => {
    if (newValue && !isFreeElement.value) {
      if (baseStore.proMode) {
        baseStore.afterDoneCount += 1;
        return;
      }
      if (baseStore.cageMode) {
        setTimeout(() => {
          isNoBorder.value = true;
          baseStore.afterDoneCount += 1;
        }, currentElementIndex.value * 200);
      } else {
        setTimeout(() => {
          isCaptured.value = true;
          baseStore.afterDoneCount += 1;
        }, currentElementIndex.value * 70);
      }
    }
  },
  { immediate: true }
);
watch(currentOrder, (newValue, oldValue) => {
  if (!baseStore.doneFirstMove) {
    return;
  }
  if (newValue === props.order + 1) {
    baseStore.inPlaceCount += 1;
  } else if (oldValue === props.order + 1) {
    baseStore.inPlaceCount -= 1;
  }
}, {
  immediate: false
});
const loadedImg = computed(() => {
  let imgNum = props.mixedOrder.toString().padStart(2, '0');
  if (isFreeElement.value) {
    imgNum = baseStore.arrayLength.toString();
  }
  return `/cages/${baseStore.cagePath}/${imgNum}.jpg`;
});
const onImgLoad = (): void => {
  baseStore.cageImageLoadedCount += 1;
};

const { doResetList } = storeToRefs(baseStore);
watch(
  doResetList,
  (value) => {
    if (value) {
      isCaptured.value = false;
      isNoBorder.value = false;
    }
  },
  { immediate: true }
);
const eventBus = useEventBus<string>('event-bus');
const listener = (event: string, payload: unknown): void => {
  if (event === 'restart' && ['fromConfig', 'fromKeyboard'].includes(payload as string)) {
    isCaptured.value = false;
    isNoBorder.value = false;
  }
};

onMounted(() => {
  eventBus.on(listener);
});
onUnmounted(() => {
  eventBus.off(listener);
});
</script>

<template>
  <div
    v-if="!isFreeElement || baseStore.cageMode"
    :sid="currentElementIndex"
    class="square"
    :class="{
      'free': isFreeElement && !(baseStore.cageMode && isDoneAll),
      'in-place': isSquareInPlace && !baseStore.processingReInit && !baseStore.proMode,
      'captured': isCaptured && !baseStore.proMode,
      'animate': isNoBorder,
      'no-border': isNoBorder ||
        (baseStore.cageMode && baseStore.noBordersInCageMode) || baseStore.proMode
    }"
    @mousedown.left="move(ControlType.Mouse)"
    @touchstart.prevent="move(ControlType.Touch)"
    @mousemove.prevent="moveByMouse"
  >
    <template v-if="baseStore.proMode">
      {{ props.mixedOrder === 0 ? '' : props.mixedOrder }}
    </template>
    <template v-else>
      <img
        v-if="baseStore.cageMode"
        v-show="!baseStore.cageMode || !(isFreeElement && !(baseStore.cageMode && isDoneAll))"
        :src="loadedImg"
        class="item-img"
        draggable="false"
        alt=""
        @load="onImgLoad"
      >
      <span
        v-if="baseStore.cageMode && baseStore.finishLoadingAllCageImages"
        v-show="!baseStore.cageHardcoreMode && !isNoBorder && !isFreeElement"
        class="item-img-span"
      >
        {{ props.mixedOrder }}
      </span>
      <Transition :name="baseStore.proMode ? '' : 'bounce'">
        <span
          v-if="!baseStore.processingReInit && !baseStore.cageMode && !isFreeElement"
        >
          {{ props.mixedOrder }}
        </span>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.bounce-enter-active {
  animation: bounce-in 0.1s ease;
}
@keyframes bounce-in {
  0% {
    transform: scale(0.1);
    color: #0a0a23;
    opacity: 0.5;
  }
  60% {
    transform: scale(0.8);
    color: navy;
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    color: #0a0a23;
    opacity: 1;
  }
}
@keyframes bounce-in2 {
  0% {
    filter: brightness(90%) contrast(90%);
  }
  50% {
    filter: brightness(110%) contrast(110%);
  }
  100% {
    filter: brightness(100%) contrast(100%);
  }
}
.square {
  position: absolute;
  width: v-bind(sizeVar);
  height: v-bind(sizeVar);
  border: 1px solid rgba(136, 165, 191, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: v-bind(bgColor);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  transition: v-bind(blockTransition);
  border-radius: v-bind(borderRadiusVar);
  box-sizing: border-box;
  box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.2);
  -webkit-tap-highlight-color: transparent;
  z-index: 2;
  cursor: v-bind(getCursor);
  top: v-bind(calculatedTopBind);
  left: v-bind(calculatedLeftBind);
  contain: layout size;
  font-size: v-bind(fontSizeD);
  font-weight: 600;
  color: #0a0a23;
  font-family: 'consolas', sans-serif;
}
.item-img {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: v-bind(borderRadiusVar);
  background-color: v-bind(bgColor);
}
.square .item-img-span {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  text-shadow: 0 3px 3px black;
  opacity: 1;
}
.in-place {
  background-color: v-bind(inPlaceColor);
}
.captured {
  background-color: gold;
}
.no-border {
  border: none;
  box-shadow: none;
}
.animate {
  animation: bounce-in2 0.2s ease;
}
.free {
  background: transparent;
  box-shadow: none;
  border: 1px solid var(--background-color);
  z-index: 1;
}
.square span {
  font-size: v-bind(fontSizeD);
  font-weight: 600;
  color: #0a0a23;
  font-family: 'consolas', sans-serif;
}
@media screen and (max-width: 401px) {
  .square, .square span {
    font-size: v-bind(fontSizeM);
  }
}
</style>
