<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEventBus } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { Direction, CAGES_PATH_ARR } from '../stores/const';
import Square from './Square.vue';
import { getArrayKeyByValue, randArrayItem } from '../utils';

const props = defineProps<{ squareSize: number }>();

const baseStore = useBaseStore();
baseStore.initStore();
if (!(baseStore.disableCageMode || baseStore.marathonMode || baseStore.proMode) &&
location.href.toLowerCase().includes('eligibleforcagemode')) {
  baseStore.eligibleForCageMode = true;
  baseStore.reset();
}
const eventBus = useEventBus<string>('event-bus');
const boardSize = computed(() => {
  return baseStore.boardSize(props.squareSize);
});
const container = ref<HTMLElement>();
const borderRadiusVar = computed(() => {
  if (baseStore.cageMode || baseStore.proMode) {
    return '0px';
  }
  return '8px';
});
const boxShadow = computed(() => {
  if (baseStore.proMode) {
    return 'none';
  }
  if (baseStore.darkMode) {
    return '0 1px 3px var(--board-shadow-color), 0 3px 6px var(--board-shadow-color)';
  }

  return 'var(--board-shadow-color) 0px 3px 10px';
});
const cageCompleteImgLoaded = ref(false);
const cageCompleteImg = computed(() => {
  return `/cages/${baseStore.cagePath}/complete.jpg`;
});

const onCageCompleteImgLoaded = (): void => {
  cageCompleteImgLoaded.value = true;
};

const hideWhenCageShowCageCompleteImg = computed(() => {
  return baseStore.cageMode && baseStore.isDone &&
         baseStore.afterDoneAnimationEnd && cageCompleteImgLoaded;
});

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
  baseStore.loadUnlockedCagesFromLocalStorage();
  baseStore.showSquareNum = true;
  window.addEventListener('keydown', (event) => {
    event.preventDefault();
    if (event.code === 'Space' && !baseStore.paused) {
      eventBus.emit('restart', baseStore.showWinModal ? 'fromKeyboard' : '');
      return;
    }
    if (baseStore.isDone || baseStore.paused) {
      return;
    }
    let newFreeElement: number | null = null;
    if (['ArrowRight', 'KeyD', 'KeyL'].includes(event.code)) {
      newFreeElement = baseStore.freeElement - 1;
      if (newFreeElement >= 0 && (newFreeElement + 1) % baseStore.numLines !== 0) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Right
        );
      }
    } else if (['ArrowLeft', 'KeyA', 'KeyJ'].includes(event.code)) {
      newFreeElement = baseStore.freeElement + 1;
      if (
        newFreeElement < baseStore.arrayLength &&
        (baseStore.freeElement + 1) % baseStore.numLines !== 0
      ) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Left
        );
      }
    } else if (['ArrowUp', 'KeyW', 'KeyI'].includes(event.code)) {
      newFreeElement = baseStore.freeElement + baseStore.numLines;
      if (newFreeElement < baseStore.arrayLength) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Up
        );
      }
    } else if (['ArrowDown', 'KeyS', 'KeyK'].includes(event.code)) {
      newFreeElement = baseStore.freeElement - baseStore.numLines;
      if (newFreeElement >= 0) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Down
        );
      }
    }
  });

  setTimeout(() => {
    if (baseStore.unlockedCages.size > 0) {
      const first = [...baseStore.unlockedCages][0];
      baseStore.preloadImage(CAGES_PATH_ARR[first]);
    }
  }, 1000);
});

const { doResetList } = storeToRefs(baseStore);
watch(
  doResetList,
  (value) => {
    if (value) {
      baseStore.processingReInit = true;
      baseStore.showSquareNum = baseStore.proMode || baseStore.showConfig;
      setTimeout(() => {
        if (baseStore.cageMode) {
          baseStore.cageMode = false;
        }
        if (baseStore.eligibleForCageMode) {
          baseStore.cageMode = true;
          if (baseStore.unlockedCages.size === baseStore.cagesCount) {
            if (baseStore.shownCages.size === CAGES_PATH_ARR.length) {
              baseStore.shownCages.clear();
            }
            baseStore.cagePath = randArrayItem(CAGES_PATH_ARR, Array.from(baseStore.shownCages));
            baseStore.shownCages.add(baseStore.cagePath);
          } else {
            baseStore.cagePath = randArrayItem(CAGES_PATH_ARR, baseStore.unlockedCagesValues);
          }
          baseStore.eligibleForCageMode = false;
        }
        baseStore.initStore();
        cageCompleteImgLoaded.value = false;
        baseStore.processingReInit = false;
        baseStore.showSquareNum = true;
      }, baseStore.proMode || baseStore.showConfig ? 5 : 200);
    }
  },
  { immediate: true, flush: 'post' }
);
</script>

<template>
  <div ref="container" class="board" @touchmove.prevent>
    <img
      v-if="baseStore.cageMode && baseStore.isDone && cageCompleteImg"
      v-show="baseStore.afterDoneAnimationEnd && cageCompleteImgLoaded"
      :src="cageCompleteImg"
      class="complete-cage"
      draggable="false"
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
      <div v-if="baseStore.paused && !baseStore.showModal">
        <p>
          <span class="bigger">Paused</span>
        </p>
        <p>
          <span class="smaller">Click to resume</span>
        </p>
      </div>
    </div>
    <div v-if="isMounted && !hideWhenCageShowCageCompleteImg">
      <Square
        v-for="(value, index) in baseStore.mixedOrders"
        :key="index"
        :square-size="squareSize"
        :order="index"
        :mixed-order="value"
        :class="{ 'board-veil': baseStore.paused && !baseStore.isDone,
                  'loading-veil': baseStore.cageMode && !baseStore.finishLoadingAllCageImages }"
      />
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  width: v-bind(boardSize);
  height: v-bind(boardSize);
  box-shadow: v-bind(boxShadow);
  background-color: var(--background-color);
  border-radius: v-bind(borderRadiusVar);
  align-content: center;
  position: relative;
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
  position: relative;
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
  cursor: auto !important;
}
.loading-veil {
  opacity: 0 !important;
}
.complete-cage {
  z-index: 1001;
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
