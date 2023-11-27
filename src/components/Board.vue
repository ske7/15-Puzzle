<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding, useEventBus } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { getSquareSize } from '../composables/usePrepare';
import { useCanMove } from '../composables/useCanMove';
import { cores } from '@/const';
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

const eventBus = useEventBus<string>('event-bus');
const touchMove = (e: TouchEvent): void => {
  if (!baseStore.hoverOnControl || baseStore.isMoving || baseStore.inReplay ||
  baseStore.sharedPlaygroundMode || baseStore.marathonReplay) {
    return;
  }
  let element = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
  if (element === null) {
    return;
  }
  let sid = element.getAttribute('sid');
  while (sid === null) {
    element = element.parentElement;
    if (element !== null) {
      sid = element.getAttribute('sid');
    } else {
      break;
    }
  }
  if (sid === null) {
    return;
  }
  const sidValue = computed(() => {
    return Number(sid);
  });
  const { canMove } = useCanMove(sidValue);
  if (!(canMove.value as boolean)) {
    return;
  }
  eventBus.emit('touchmove-from-board', e);
};

const showProSquare = computed(() => {
  return baseStore.proMode && !(baseStore.replayMode || baseStore.sharedPlaygroundMode ||
  baseStore.marathonReplay || baseStore.playgroundMode);
});

const changePuzzleSize = (puzzleSize: number): void => {
  baseStore.numLines = puzzleSize;
  baseStore.initAfterNewPuzzleSize();
};
</script>

<template>
  <div ref="container" class="board" @touchmove.prevent="touchMove">
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
      :class="{ 'cur-auto': baseStore.showModal ||
        (baseStore.cageMode && !baseStore.finishLoadingAllCageImages) }"
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
    <div v-if="!showProSquare && !hideWhenCageShowCageCompleteImg" class="p-container">
      <Square
        v-for="(value, index) in baseStore.mixedOrders"
        :key="index"
        :square-size="squareSize"
        :mixed-order="value"
        :class="{ 'board-veil': baseStore.paused && !baseStore.isDone,
                  'loading-veil': baseStore.cageMode && !baseStore.finishLoadingAllCageImages }"
      />
    </div>
    <div v-if="showProSquare" :key="baseStore.mixedOrders.length" class="p-container">
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
    <div v-if="!baseStore.replayMode && !baseStore.sharedPlaygroundMode && !baseStore.cageMode" class="puzzle-sizes">
      <span
        v-for="(item, index) in cores"
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
