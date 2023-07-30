<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { Direction, CAGES_PATH_ARR } from '../stores/const';
import Square from './Square.vue';
import { getArrayKeyByValue, randArrayItem } from '../utils';

const props = defineProps<{ squareSize: number }>();

const baseStore = useBaseStore();
baseStore.initStore();

const boardSize = computed(() => {
  return baseStore.boardSize(props.squareSize);
});
const container = ref<HTMLElement>();
const { left, right, top, bottom } = useElementBounding(container);
const borderRadiusVar = computed(() => {
  if (baseStore.cageMode) {
    return '0px';
  }
  return '8px';
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
  baseStore.showSquareNum = false;
  setTimeout(() => {
    baseStore.showSquareNum = true;
  }, 200);

  window.addEventListener('keydown', (event) => {
    event.preventDefault();
    if (baseStore.isDone || baseStore.paused) {
      return;
    }
    let newFreeElement: number | null = null;
    if (event.code === 'ArrowRight') {
      newFreeElement = baseStore.freeElement - 1;
      if (newFreeElement >= 0 && (newFreeElement + 1) % baseStore.numLines !== 0) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Right
        );
      }
    } else if (event.code === 'ArrowLeft') {
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
    } else if (event.code === 'ArrowUp') {
      newFreeElement = baseStore.freeElement + baseStore.numLines;
      if (newFreeElement < baseStore.arrayLength) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Up
        );
      }
    } else if (event.code === 'ArrowDown') {
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
      baseStore.showSquareNum = false;
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
      }, 300);
    }
  },
  { immediate: true, flush: 'post' }
);

const { disableCageMode } = storeToRefs(baseStore);
watch(disableCageMode, async () => {
  await nextTick();
  top.value = useElementBounding(container).top.value;
});
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
      v-if="baseStore.paused || (baseStore.cageMode && !baseStore.finishLoadingAllCageImages)"
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
    <div
      v-if="isMounted && !hideWhenCageShowCageCompleteImg"
    >
      <Square
        v-for="(value, index) in baseStore.mixedOrders"
        :key="index"
        :square-size="squareSize"
        :container-right="right"
        :container-bottom="bottom"
        :container-top="top"
        :container-left="left"
        :order="index"
        :mixed-order="value"
        :class="{ 'board-veil': baseStore.paused,
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
  box-shadow: rgba(0, 0, 0, 0.3) 0px 5px 15px;
  background-color: white;
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
  color: navy;
  font-size: 56px;
  line-height: 56px;
  padding-bottom: 5px;
  display: block;
  text-align: center;
}
.paused-veil .smaller {
  color: navy;
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
