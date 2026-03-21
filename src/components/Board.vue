<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { getSquareSize } from '../composables/usePrepare';
import { canMoveStatic } from '../composables/useCanMoveStatic';
import { cores, fmcBlitzCores, ControlType, Direction } from '@/const';
import Square from './Square.vue';
import ProSquare from './ProSquare.vue';

const baseStore = useBaseStore();

const { squareSize } = getSquareSize();
const boardSize = computed(() => {
  return baseStore.boardSize(squareSize.value);
});
const borderRadiusVar = computed(() => {
  return '8px';
});
const boxShadow = computed(() => {
  if (baseStore.proMode) {
    return 'none';
  }
  if (baseStore.darkMode) {
    return '0 1px 3px var(--board-shadow-color), 0 3px 6px var(--board-shadow-color)';
  }
  return '0px 3px 10px var(--board-shadow-color)';
});

const container = ref<HTMLElement>();
const position = reactive(useElementBounding(container));
watch(position, value => {
  baseStore.boardPos = { left: value.left, top: value.top, right: value.right, bottom: value.bottom };
},
{ immediate: false, flush: 'post' });

const cageCompleteImg = computed(() => {
  return `/cages/${baseStore.cagePath}/complete.jpg`;
});
const onCageCompleteImgLoaded = (): void => {
  baseStore.cageCompleteImgLoaded = true;
};
const hideWhenCageShowCageCompleteImg = computed(() => {
  return baseStore.cageMode && baseStore.isDone &&
    baseStore.afterDoneAnimationEnd && baseStore.cageCompleteImgLoaded;
});
const { finishLoadingAllCageImages } = storeToRefs(baseStore);
watch(finishLoadingAllCageImages, value => {
  if (value) {
    baseStore.paused = false;
  }
});

const getSid = (clientX: number, clientY: number): number | null => {
  let element = document.elementFromPoint(clientX, clientY);
  while (element && !element.hasAttribute('sid')) {
    element = element.parentElement;
  }
  return element ? Number(element.getAttribute('sid')) : null;
};

const touchMoveLeft = (clientX: number, clientY: number, posX: number, posY: number,
  elementRow: number, sid: number): boolean => {
  if (baseStore.freeElementIndex < sid - 1 && clientX >= posX && clientX < posX + squareSize.value &&
    clientY >= posY && clientY < posY + squareSize.value &&
    clientY <= baseStore.boardPos.bottom - baseStore.boardPos.top &&
    elementRow === baseStore.freeElementRow) {
    if (!baseStore.checkDiffBetweenElementsAndMove(sid, Direction.Left, ControlType.Touch)) {
      baseStore.moveLeft(ControlType.Touch);
    }
    baseStore.isMoving = false;
    return true;
  }
  return false;
};
const touchMoveRight = (clientX: number, clientY: number, posX: number, posY: number,
  elementRow: number, sid: number): boolean => {
  if (baseStore.freeElementIndex > sid - 1 && clientX >= posX && clientX < posX + squareSize.value &&
    clientY >= posY && clientY < posY + squareSize.value &&
    clientY <= baseStore.boardPos.bottom - baseStore.boardPos.top &&
    elementRow === baseStore.freeElementRow) {
    if (!baseStore.checkDiffBetweenElementsAndMove(sid, Direction.Right, ControlType.Touch)) {
      baseStore.moveRight(ControlType.Touch);
    }
    baseStore.isMoving = false;
    return true;
  }
  return false;
};
const touchMoveUp = (clientX: number, clientY: number, posX: number, posY: number,
  elementCol: number, sid: number): boolean => {
  if (baseStore.freeElementIndex < sid - 1 && clientY >= posY && clientY < posY + squareSize.value &&
    clientX >= posX && clientX < posX + squareSize.value &&
    clientX <= baseStore.boardPos.right - baseStore.boardPos.left &&
    elementCol === baseStore.freeElementCol) {
    if (!baseStore.checkDiffBetweenElementsAndMove(sid, Direction.Up, ControlType.Touch)) {
      baseStore.moveUp(ControlType.Touch);
    }
    baseStore.isMoving = false;
    return true;
  }
  return false;
};
const touchMoveDown = (clientX: number, clientY: number, posX: number, posY: number,
  elementCol: number, sid: number): boolean => {
  if (baseStore.freeElementIndex > sid - 1 && clientY >= posY && clientY < posY + squareSize.value &&
    clientX >= posX && clientX < posX + squareSize.value &&
    clientX <= baseStore.boardPos.right - baseStore.boardPos.left &&
    elementCol === baseStore.freeElementCol) {
    if (!baseStore.checkDiffBetweenElementsAndMove(sid, Direction.Down, ControlType.Touch)) {
      baseStore.moveDown(ControlType.Touch);
    }
    baseStore.isMoving = false;
    return true;
  }
  return false;
};

let cachedSquareSize = 0;
let cachedBoardPos = { left: 0, top: 0 };

const onTouchStart = () => {
  cachedSquareSize = squareSize.value;
  cachedBoardPos = { ...baseStore.boardPos };
};

const handleTouchMove = (e: TouchEvent) => {
  if (!(baseStore.hoverOnControl && baseStore.proMode) ||
    baseStore.isMoving || baseStore.inReplay ||
    baseStore.sharedPlaygroundMode || baseStore.marathonReplay ||
    baseStore.paused || baseStore.isDone || baseStore.isTimeFailed ||
    baseStore.noPlayMode) {
    return;
  }

  const sid = getSid(e.touches[0].clientX, e.touches[0].clientY);
  if (sid === null) {
    return;
  }

  const moveData = canMoveStatic(sid, cachedSquareSize);
  if (!moveData.canMove || moveData.isFreeElement) {
    return;
  }

  baseStore.isMoving = true;

  const clientX = e.touches[0].clientX - cachedBoardPos.left;
  const clientY = e.touches[0].clientY - cachedBoardPos.top;

  if (touchMoveLeft(clientX, clientY, moveData.calculatedLeft, moveData.calculatedTop, moveData.elementRow, sid)) return;
  if (touchMoveRight(clientX, clientY, moveData.calculatedLeft, moveData.calculatedTop, moveData.elementRow, sid)) return;
  if (touchMoveUp(clientX, clientY, moveData.calculatedLeft, moveData.calculatedTop, moveData.elementCol, sid)) return;
  if (touchMoveDown(clientX, clientY, moveData.calculatedLeft, moveData.calculatedTop, moveData.elementCol, sid)) return;

  baseStore.isMoving = false;
};

let ticking = false;
const touchMove = (e: TouchEvent) => {
  if (!ticking) {
    ticking = true;
    globalThis.requestAnimationFrame(() => {
      handleTouchMove(e);
      ticking = false;
    });
  }
};

const showProSquare = computed(() => {
  return baseStore.proMode && !(baseStore.replayMode || baseStore.sharedPlaygroundMode ||
    baseStore.marathonReplay || baseStore.playgroundMode);
});

const changePuzzleSize = (puzzleSize: number): void => {
  baseStore.numLines = puzzleSize;
  baseStore.initAfterNewPuzzleSize();
};
const filteredCores = computed(() => {
  if (baseStore.fmcBlitz) {
    return fmcBlitzCores;
  }
  return cores;
});
</script>

<template>
  <div ref="container" class="board">
    <img
      v-if="baseStore.cageMode && baseStore.isDone && cageCompleteImg"
      v-show="baseStore.afterDoneAnimationEnd && baseStore.cageCompleteImgLoaded"
      :src="cageCompleteImg"
      class="complete-cage"
      draggable="false"
      alt="cage"
      @load="onCageCompleteImgLoaded"
    >
    <div
      v-if="(baseStore.paused && !baseStore.isDone) ||
        (baseStore.cageMode && !baseStore.finishLoadingAllCageImages)"
      class="paused-veil"
      :class="{
        'cur-auto': baseStore.showModal ||
          (baseStore.cageMode && !baseStore.finishLoadingAllCageImages)
      }"
      @click="baseStore.invertPaused"
    >
      <div v-if="baseStore.cageMode && !baseStore.finishLoadingAllCageImages">
        <p>
          <span class="smaller">Loading...</span>
        </p>
        <p>
          <span class="smaller">Please wait a moment</span>
        </p>
      </div>
      <div
        v-if="baseStore.paused && !baseStore.showModal &&
          !(baseStore.cageMode && !baseStore.finishLoadingAllCageImages)"
      >
        <p>
          <span class="bigger">Paused</span>
        </p>
        <p>
          <span class="smaller">Click to resume</span>
        </p>
      </div>
    </div>
    <div
      v-if="!showProSquare && !hideWhenCageShowCageCompleteImg"
      class="p-container"
      @touchstart="onTouchStart"
      @touchmove.prevent="touchMove"
    >
      <Square
        v-for="(value, index) in baseStore.mixedOrders"
        :key="index"
        :square-size="squareSize"
        :order="index"
        :mixed-order="value"
        :class="{
          'board-veil': baseStore.paused && !baseStore.isDone,
          'loading-veil': baseStore.cageMode && !baseStore.finishLoadingAllCageImages
        }"
      />
    </div>
    <div
      v-if="showProSquare && baseStore.currentOrders.length > 0"
      :key="baseStore.mixedOrders.length"
      class="p-container"
      @touchstart="onTouchStart"
      @touchmove.prevent="touchMove"
    >
      <Pro-Square
        v-for="(_value, index) in baseStore.mixedOrders"
        :key="index"
        :square-size="squareSize"
        :order="index"
        :class="{
          'board-veil': baseStore.paused && !baseStore.isDone
        }"
      />
    </div>
    <div
      v-if="!baseStore.replayMode && !baseStore.sharedPlaygroundMode &&
        !baseStore.cageMode && !baseStore.g1000Mode && !baseStore.clearDisplay"
      class="puzzle-sizes"
    >
      <span
        v-for="(item, index) in filteredCores"
        :key="index"
        :class="{ 'selected': baseStore.numLines === item }"
        @click="changePuzzleSize(item)"
      >
        {{ item }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  width: v-bind(boardSize);
  height: v-bind(boardSize);
  min-height: v-bind(boardSize);
  box-shadow: v-bind(boxShadow);
  background-color: var(--background-color);
  border-radius: v-bind(borderRadiusVar);
  align-content: center;
  position: relative;
}
.p-container {
  width: 100%;
  height: 100%;
  contain: layout paint size;
}
.board-veil {
  opacity: 0.2;
}
.paused-veil {
  display: flex;
  flex-direction: column;
  width: v-bind(boardSize);
  height: v-bind(boardSize);
  border-radius: v-bind(borderRadiusVar);
  justify-content: center;
  align-items: center;
  position: absolute;
  background-color: transparent;
  z-index: 1000;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.paused-veil .bigger {
  color: var(--text-color);
  font-size: 56px;
  line-height: 56px;
  padding-bottom: 5px;
  display: block;
  text-align: center;
}
.paused-veil .smaller {
  color: var(--text-color);
  font-size: 32px;
  font-weight: 500;
  display: block;
  text-align: center;
}
.cur-auto {
  cursor: auto;
}
.loading-veil {
  opacity: 0;
}
.complete-cage {
  z-index: 1001;
  border-radius: v-bind(borderRadiusVar);
}
.puzzle-sizes {
  position: absolute;
  right: -15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}
.puzzle-sizes span {
  cursor: pointer;
}
.puzzle-sizes span:hover {
  cursor: pointer;
  color: var(--link-color);
  text-decoration: underline;
}
.puzzle-sizes .selected {
  color: var(--link-color);
  font-weight: 700;
}
@media screen and (max-width: 601px) {
  .paused-veil .bigger {
    font-size: 42px;
    line-height: 42px;
  }
  .paused-veil .smaller {
    font-size: 27px;
  }
}
</style>
