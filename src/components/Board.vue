<script setup lang="ts">
import { computed, ref, onMounted, watch, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { CAGES_PATH_ARR, CORE_NUM } from '../stores/const';
import Square from './Square.vue';
import { randArrayItem } from '../utils';
import { useKeyDown } from '@/useKeyboardControl';

const props = defineProps<{ squareSize: number }>();

const baseStore = useBaseStore();
baseStore.initStore();

if (!(baseStore.disableCageMode || baseStore.marathonMode || baseStore.proMode) &&
  (baseStore.numLines === CORE_NUM) && location.href.toLowerCase().includes('eligibleforcagemode')) {
  baseStore.eligibleForCageMode = true;
  baseStore.reset();
}

useKeyDown();

const boardSize = computed(() => {
  return baseStore.boardSize(props.squareSize);
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

onMounted(() => {
  baseStore.loadUnlockedCagesFromLocalStorage();
  setTimeout(() => {
    if (baseStore.unlockedCages.size > 0) {
      const first = [...baseStore.unlockedCages][0];
      baseStore.preloadImage(CAGES_PATH_ARR[first]);
    }
  }, 1000);
});

const container = ref<HTMLElement>();
const position = reactive(useElementBounding(container));
watch(position, value => {
  baseStore.boardPos = { left: value.left, top: value.top, right: value.right, bottom: value.bottom };
},
{ immediate: false, flush: 'post' });

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
    <div v-if="!hideWhenCageShowCageCompleteImg">
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
  cursor: auto;
}
.loading-veil {
  opacity: 0;
}
.complete-cage {
  z-index: 1001;
  border-radius: v-bind(borderRadiusVar);
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
