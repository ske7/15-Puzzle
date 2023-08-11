<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBaseStore } from '../stores/base';
import { Direction } from '../stores/const';
import { storeToRefs } from 'pinia';
import { getElementCol, getElementRow, getArrayKeyByValue } from '../utils';

const props = defineProps<{
  squareSize: number;
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
      if (baseStore.numLines === 4) {
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
      if (baseStore.numLines === 3) {
        if ([1, 2, 3].includes(props.mixedOrder)) {
          return '#ff6767';
        } else if ([4, 7].includes(props.mixedOrder)) {
          return '#fff054';
        } else if ([5, 6].includes(props.mixedOrder)) {
          return '#7eff64';
        } else if ([8].includes(props.mixedOrder)) {
          return '#89dcff';
        }
      }
      if (baseStore.numLines === 5) {
        if ([1, 2, 3, 4, 5].includes(props.mixedOrder)) {
          return '#ff6767';
        } else if ([6, 11, 16, 21].includes(props.mixedOrder)) {
          return '#ffc74c';
        } else if ([7, 8, 9, 10].includes(props.mixedOrder)) {
          return '#fff054';
        } else if ([12, 17, 22].includes(props.mixedOrder)) {
          return '#7eff64';
        } else if ([13, 14, 15].includes(props.mixedOrder)) {
          return '#7effde';
        } else if ([18, 23].includes(props.mixedOrder)) {
          return '#84c8ff';
        } else if ([19, 20].includes(props.mixedOrder)) {
          return '#9b95ff';
        } else if ([24].includes(props.mixedOrder)) {
          return '#cd88fe';
        }
      }
    }
    return '#d2d2d2';
  }
  return 'var(--square-bg-color)';
});
const fontSizeD = computed(() => {
  if (baseStore.proMode) {
    return '45px';
  }
  return '25px';
});
const fontSizeM = computed(() => {
  if (baseStore.proMode) {
    return '33px';
  }
  return '25px';
});
const inPlaceColor = computed(() => {
  if (baseStore.proMode) {
    return '#40d9ff';
  }
  return 'var(--square-in-place-color)';
});
const brightnessImg = computed(() => {
  return baseStore.darkMode ? 'brightness(104%)' : 'brightness(101%)';
});

const actualOrder = computed(() => {
  return baseStore.actualOrders[props.order];
});

const calculatedLeft = computed(() => {
  return (
    actualOrder.value % baseStore.numLines * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (actualOrder.value % baseStore.numLines)
  );
});
const calculatedTop = computed(() => {
  return (
    Math.floor(actualOrder.value / baseStore.numLines) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (Math.ceil((actualOrder.value + 1) / baseStore.numLines) - 1)
  );
});

const isFreeElement = computed(() => {
  return props.mixedOrder === 0;
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

const moveByTouch = (e: TouchEvent): void => {
  if (!isFreeElement.value || isDoneAll.value || baseStore.paused) {
    return;
  }
  const spaceX = baseStore.spaceBetween * (baseStore.freeElementCol + 1);
  const spaceY = baseStore.spaceBetween * (baseStore.freeElementRow + 1);
  const posX = calculatedLeft.value + baseStore.boardPos.left - spaceX;
  const posY = calculatedTop.value + baseStore.boardPos.top - spaceY;
  if (baseStore.freeElementCol < baseStore.numLines && e.touches[0].clientX > posX + props.squareSize &&
  e.touches[0].clientY >= baseStore.boardPos.top && e.touches[0].clientY <= baseStore.boardPos.bottom) {
    baseStore.saveActualOrder(
      getArrayKeyByValue(baseStore.actualOrders, baseStore.freeElement + 1),
      Direction.Left
    );
    return;
  }
  if (baseStore.freeElementCol > 1 && e.touches[0].clientX < posX &&
    e.touches[0].clientY >= baseStore.boardPos.top && e.touches[0].clientY <= baseStore.boardPos.bottom) {
    baseStore.saveActualOrder(
      getArrayKeyByValue(baseStore.actualOrders, baseStore.freeElement - 1),
      Direction.Right
    );
    return;
  }
  if (baseStore.freeElementRow < baseStore.numLines && e.touches[0].clientY > posY + props.squareSize &&
    e.touches[0].clientX >= baseStore.boardPos.left && e.touches[0].clientX <= baseStore.boardPos.right) {
    baseStore.saveActualOrder(
      getArrayKeyByValue(baseStore.actualOrders, baseStore.freeElement + baseStore.numLines),
      Direction.Up
    );
    return;
  }
  if (baseStore.freeElementRow > 1 && e.touches[0].clientY < posY &&
    e.touches[0].clientX >= baseStore.boardPos.left && e.touches[0].clientX <= baseStore.boardPos.right) {
    baseStore.saveActualOrder(
      getArrayKeyByValue(baseStore.actualOrders, baseStore.freeElement - baseStore.numLines),
      Direction.Down
    );
  }
};

const isCaptured = ref(false);
const isMoving = ref(false);
const move = (): void => {
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
    if (newValue && !isFreeElement.value) {
      if (baseStore.proMode) {
        baseStore.afterDoneCount += 1;
        return;
      }
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
</script>

<template>
  <div
    v-show="!baseStore.cageMode || !(isFreeElement && !(baseStore.cageMode && isDoneAll))"
    class="square"
    :class="{
      free: isFreeElement && !(baseStore.cageMode && isDoneAll),
      'in-place': isSquareInPlace && !baseStore.processingReInit &&
        !(baseStore.proMode && baseStore.proPalette),
      captured: isCaptured && !(baseStore.proMode && baseStore.proPalette),
      'animate': isNoBorder,
      'no-border': isNoBorder ||
        (baseStore.cageMode && baseStore.noBordersInCageMode) || baseStore.proMode
    }"
    :style="{ top: `${calculatedTop}px`, left: `${calculatedLeft}px` }"
    @mousedown.left="move"
    @touchstart.prevent="move"
    @touchmove.prevent="moveByTouch"
    @mousemove.prevent="moveByMouse"
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
        v-show="!baseStore.cageHardcoreMode && !isNoBorder && !isFreeElement"
        class="item-img-span"
      >
        {{ props.mixedOrder }}
      </span>
      <Transition :name="baseStore.proMode ? '' : 'bounce'">
        <span v-if="baseStore.showSquareNum && !baseStore.cageMode && !isFreeElement">
          {{ props.mixedOrder }}
        </span>
      </Transition>
    </div>
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
  filter: v-bind(brightnessImg);
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
  background: transparent;
  box-shadow: none;
  border: 1px solid var(--background-color);
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
