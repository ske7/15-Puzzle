<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore, Direction, CAGES_PATH_ARR } from '../stores/base';
import Square from './Square.vue';
import { getArrayKeyByValue, randArrayItem } from '../utils';

const props = defineProps<{ squareSize: number }>();

const baseStore = useBaseStore();
baseStore.initStore();

const boardSize = computed(() => {
  return baseStore.boardSize(props.squareSize);
});
const container = ref();
const { left, right, top, bottom } = useElementBounding(container);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;

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
});
const cageCompleteImg = computed(() => {
  return new URL(`../assets/cages/${baseStore.cagePath}/complete.jpg`, import.meta.url).href;
});

const { doResetList } = storeToRefs(baseStore);
watch(
  doResetList,
  (value, oldValue) => {
    if (value && !oldValue) {
      baseStore.showSquareNum = false;
      setTimeout(() => {
        if (baseStore.cageMode) {
          baseStore.cageMode = false;
        }
        if (baseStore.eligibleForCageMode) {
          baseStore.cageMode = true;
          baseStore.cagePath = randArrayItem(CAGES_PATH_ARR);
          baseStore.eligibleForCageMode = false;
        }
        baseStore.initStore();
        baseStore.showSquareNum = true;
      }, 300);
    }
  },
  { immediate: true, flush: 'post' }
);
</script>

<template>
  <div ref="container" class="board" @touchmove.prevent>
    <img
      v-show="baseStore.cageMode && baseStore.isDone &&
        cageCompleteImg && baseStore.afterDoneAnimationEnd"
      :src="cageCompleteImg"
      class="complete-cage"
    >
    <div
      v-if="baseStore.paused"
      class="paused-veil"
      :class="{ 'cur-auto': baseStore.showConfirm }"
      @click="baseStore.invertPaused"
    >
      <p v-if="!baseStore.showConfirm">
        <span class="bigger">Paused</span>
      </p>
      <p v-if="!baseStore.showConfirm">
        <span class="smaller">Click to resume</span>
      </p>
    </div>
    <div v-if="isMounted">
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
        :class="{ 'board-veil': baseStore.paused }"
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
  border-radius: 8px;
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
  border-radius: 8px;
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
}
.paused-veil .smaller {
  color: navy;
  font-size: 32px;
  font-weight: 500;
}
.complete-cage {
  z-index: 3000;
}
@media screen and (max-width: 601px) {
  .paused-veil .bigger {
    font-size: 48px;
    line-height: 48px;
  }
}
</style>
