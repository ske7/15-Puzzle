<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBaseStore } from '../stores/base';
import { Direction } from '../stores/const';
import { storeToRefs } from 'pinia';
import { getElementCol, getElementRow, getArrayKeyByValue } from '../utils';

const props = defineProps<{
  squareSize: number;
  containerTop: number;
  containerLeft: number;
  containerBottom: number;
  containerRight: number;
  order: number;
  mixedOrder: number;
}>();

const baseStore = useBaseStore();

const sizeVar = computed(() => {
  return `${props.squareSize}px`;
});
const borderRadiusVar = computed(() => {
  if (baseStore.cageMode && baseStore.finishLoadingAllCageImages || baseStore.proMode) {
    return '0px';
  }
  return '8px';
});
const blockTransition = computed(() => {
  if (baseStore.proMode) {
    return 'none';
  }
  return 'all 0.2s ease 0s';
});
const bgColor = computed(() => {
  if (baseStore.proMode) {
    if (baseStore.proPalette) {
      if ([1, 2, 3, 4].includes(props.mixedOrder)) {
        return '#ff6767';
      } else if ([5, 9, 13].includes(props.mixedOrder)) {
        return '#fff054';
      } else if ([6, 7, 8].includes(props.mixedOrder)) {
        return '#7eff64';
      } else if ([10, 14].includes(props.mixedOrder)) {
        return '#7effde';
      } else if ([11, 12].includes(props.mixedOrder)) {
        return '#8eb3fe';
      } else if ([15].includes(props.mixedOrder)) {
        return '#cd88fe';
      }
    }
    return '#d2d2d2';
  }
  return 'beige';
});
const fontSizeD = computed(() => {
  if (baseStore.proMode) {
    return '39px';
  }
  return '21px';
});
const fontSizeM = computed(() => {
  if (baseStore.proMode) {
    return '23px';
  }
  return '19px';
});
const inPlaceColor = computed(() => {
  if (baseStore.proMode) {
    return '#40d9ff';
  }
  return '#e0f5fa';
});

const actualOrder = computed(() => {
  return baseStore.actualOrders[props.order];
});

const calculatedLeft = computed(() => {
  return (
    props.containerLeft +
    actualOrder.value % baseStore.numLines * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (actualOrder.value % baseStore.numLines)
  );
});
const calculatedTop = computed(() => {
  return (
    props.containerTop +
    Math.floor(actualOrder.value / baseStore.numLines) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (Math.ceil((actualOrder.value + 1) / baseStore.numLines) - 1)
  );
});

const isSquareInPlace = computed(() => {
  return actualOrder.value + 1 === props.mixedOrder;
});
const isDoneAll = computed(() => {
  return baseStore.isDone;
});

const elementCol = computed(() => {
  return getElementCol(actualOrder.value, baseStore.numLines);
});
const elementRow = computed(() => {
  return getElementRow(actualOrder.value, baseStore.numLines);
});

const canMoveRight = computed(() => {
  return baseStore.freeElementRow === elementRow.value && baseStore.freeElement > actualOrder.value;
});
const canMoveLeft = computed(() => {
  return baseStore.freeElementRow === elementRow.value && baseStore.freeElement < actualOrder.value;
});
const canMoveUp = computed(() => {
  return baseStore.freeElementCol === elementCol.value && baseStore.freeElement < actualOrder.value;
});
const canMoveDown = computed(() => {
  return baseStore.freeElementCol === elementCol.value && baseStore.freeElement > actualOrder.value;
});
const moveDirection = computed(() => {
  if (canMoveRight.value) {
    return Direction.Right;
  } else if (canMoveLeft.value) {
    return Direction.Left;
  } else if (canMoveUp.value) {
    return Direction.Up;
  } else if (canMoveDown.value) {
    return Direction.Down;
  }
  return Direction.None;
});
const cannotMove = computed(() => {
  return isDoneAll.value || baseStore.paused || moveDirection.value === Direction.None;
});

const isCaptured = ref(false);
const capture = (): void => {
  if (cannotMove.value || baseStore.proMode) {
    return;
  }
  isCaptured.value = true;
};
const release = (): void => {
  if (isDoneAll.value || baseStore.proMode) {
    return;
  }
  isCaptured.value = false;
};

const isMoving = ref(false);
const move = (): void => {
  release();
  if (cannotMove.value) {
    return;
  }
  if (isMoving.value) {
    return;
  }
  isMoving.value = true;
  let diff = Math.abs(baseStore.freeElement - actualOrder.value);
  if ([Direction.Up, Direction.Down].includes(moveDirection.value)) {
    diff = diff / baseStore.numLines;
  }
  if (diff > 1) {
    let newFreeElement = 0;
    for (let i = 0; i < diff; i++) {
      switch (moveDirection.value) {
        case Direction.Right:
          newFreeElement = baseStore.freeElement - 1;
          break;
        case Direction.Left:
          newFreeElement = baseStore.freeElement + 1;
          break;
        case Direction.Down:
          newFreeElement = baseStore.freeElement - baseStore.numLines;
          break;
        case Direction.Up:
          newFreeElement = baseStore.freeElement + baseStore.numLines;
          break;
        default:
      }
      baseStore.saveActualOrder(getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
        moveDirection.value);
    }
  } else {
    baseStore.saveActualOrder(props.order, moveDirection.value);
  }
  isMoving.value = false;
};

const moveByMouse = (): void => {
  if (!baseStore.proMode) {
    return;
  }
  move();
};

const getCursor = computed(() => {
  if (baseStore.proMode) {
    return;
  }
  if (cannotMove.value) {
    return 'auto';
  } else {
    return 'pointer';
  }
});

const isNoBorder = ref(false);
watch(
  isDoneAll,
  (newValue) => {
    if (newValue && props.mixedOrder !== 0) {
      if (baseStore.cageMode) {
        setTimeout(() => {
          isNoBorder.value = true;
          baseStore.afterDoneCount += 1;
        }, actualOrder.value * 200);
      } else {
        setTimeout(() => {
          isCaptured.value = true;
          baseStore.afterDoneCount += 1;
        }, actualOrder.value * 70);
      }
    }
  },
  { immediate: true }
);

const loadedImg = computed(() => {
  let imgNum = props.mixedOrder.toString().padStart(2, '0');
  if (props.mixedOrder === 0) {
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
</script>

<template>
  <div
    class="square"
    :class="{
      free: props.mixedOrder === 0 && !(baseStore.cageMode && isDoneAll),
      'in-place': isSquareInPlace && !baseStore.processingReInit && !baseStore.proPalette,
      captured: isCaptured && !baseStore.proPalette,
      'animate': isNoBorder,
      'no-border': isNoBorder ||
        (baseStore.cageMode && baseStore.noBordersInCageMode) || baseStore.proMode
    }"
    :style="{ top: `${calculatedTop}px`, left: `${calculatedLeft}px` }"
    @mousedown.left="capture"
    @mouseout.left="release"
    @touchstart.passive="capture"
    @touchend="release"
    @touchmove.prevent
    @click="move"
    @mousemove="moveByMouse"
  >
    <div class="item" :style="{ cursor: getCursor }">
      <img
        v-if="baseStore.cageMode"
        :src="loadedImg"
        class="item-img"
        draggable="false"
        @load="onImgLoad"
      >
      <span
        v-if="baseStore.showSquareNum && baseStore.cageMode && baseStore.finishLoadingAllCageImages"
        v-show="!baseStore.cageHardcoreMode && !isNoBorder && props.mixedOrder !== 0"
        class="item-img-span"
      >
        {{ props.mixedOrder }}
      </span>
      <Transition name="bounce">
        <span v-if="baseStore.showSquareNum && !baseStore.cageMode">
          {{ props.mixedOrder }}
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.bounce-enter-active {
  animation: bounce-in 0.3s ease-in-out;
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
  background-color: v-bind(bgColor);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  transition: v-bind(blockTransition);
  border-radius: v-bind(borderRadiusVar);
  box-sizing: border-box;
  box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.2);
  -webkit-tap-highlight-color: transparent;
}
.item-img {
  width: 100%;
  height: 100%;
  position: relative;
}
.item-img-span {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white !important;
  text-shadow: 0 3px 3px black;
  opacity: 1;
}
.captured {
  background-color: gold !important;
}
.in-place {
  background-color: v-bind(inPlaceColor);
}
.no-border {
  border: 0px;
  box-shadow: none;
}
.animate {
  animation: bounce-in2 0.2s ease;
}
.no-border {
  border: none;
}
.free {
  display: none;
}
.item {
  display: flex;
  justify-content: space-evenly;
  width: 100%;
  align-items: center;
}
.item span {
  font-size: v-bind(fontSizeD);
  font-weight: 600;
  color: #0a0a23;
  font-family: 'consolas';
}
@media screen and (max-width: 401px) {
  .item span {
    font-size: v-bind(fontSizeM);
  }
}
</style>
