<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useSquareSize } from '../composables/useSquareSize';
import { useBoardPointer } from '../composables/useBoardPointer';
import { cores, fmcBlitzCores } from '@/const';
import Square from './Square.vue';
import ProBoard from './ProBoard.vue';

const baseStore = useBaseStore();

const { squareSize } = useSquareSize();
const container = ref<HTMLElement>();
const pointer = useBoardPointer(squareSize, container);
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

const showProBoard = computed(() => {
  return baseStore.proMode && !(baseStore.replayMode || baseStore.sharedPlaygroundMode ||
    baseStore.marathonReplay || baseStore.playgroundMode);
});

// Tiles handle taps and mouse hover themselves; a finger sliding across them is tracked here.
const onTilePointerDown = (event: PointerEvent): void => {
  if (event.pointerType !== 'mouse') {
    pointer.onPointerDown(event);
  }
};
const onTilePointerMove = (event: PointerEvent): void => {
  if (event.pointerType !== 'mouse') {
    pointer.onPointerMove(event);
  }
};

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
      v-if="!showProBoard && !hideWhenCageShowCageCompleteImg"
      class="p-container"
      @pointerdown="onTilePointerDown"
      @pointermove="onTilePointerMove"
      @pointerup="pointer.onPointerUp"
      @pointercancel="pointer.onPointerUp"
      @pointerleave="pointer.onPointerLeave"
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
      v-if="showProBoard && baseStore.currentOrders.length > 0"
      class="p-container"
      @pointerdown="pointer.onPointerDown"
      @pointermove="pointer.onPointerMove"
      @pointerup="pointer.onPointerUp"
      @pointercancel="pointer.onPointerUp"
      @pointerleave="pointer.onPointerLeave"
      @mousedown.left="pointer.onMouseDown"
      @touchstart.prevent="pointer.onTouchStart"
    >
      <Pro-Board
        :square-size="squareSize"
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
  touch-action: none;
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
  z-index: var(--z-board-veil);
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
  z-index: var(--z-board-overlay);
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
  color: var(--link-color);
  text-decoration: underline;
}
.puzzle-sizes .selected {
  color: var(--link-color);
  font-weight: 700;
}
@media (pointer: coarse) {
  .puzzle-sizes span {
    padding: 0 4px 0 5px;
    margin: 0 -4px 0 -5px;
  }
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
