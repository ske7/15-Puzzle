<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore, Direction } from '../stores/base';
import Square from './Square.vue';
import { getArrayKeyByValue } from '../utils';

const props = defineProps<{ squareSize: number }>();

const baseStore = useBaseStore();
baseStore.initStore();

const spaceBetween = ref(8);
const boardSize = computed(() => {
  return `${baseStore.numLines * props.squareSize + spaceBetween.value * (baseStore.numLines + 1)}px`;
});
const container = ref();
const { left, right, top, bottom } = useElementBounding(container);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;

  window.addEventListener('keydown', (event) => {
    event.preventDefault();
    if (baseStore.isDone || baseStore.paused) {
      return;
    }
    let newFreeElement: number | null = null;
    if (event.code === 'ArrowRight') {
      newFreeElement = baseStore.freeElement - 1;
      if (newFreeElement > 0 && newFreeElement % baseStore.numLines !== 0) {
        baseStore.saveActualOrder(getArrayKeyByValue(baseStore.actualOrders, newFreeElement), Direction.Right);
      }
    } else if (event.code === 'ArrowLeft') {
      newFreeElement = baseStore.freeElement + 1;
      if (newFreeElement <= baseStore.arrayLength && baseStore.freeElement % baseStore.numLines !== 0) {
        baseStore.saveActualOrder(getArrayKeyByValue(baseStore.actualOrders, newFreeElement), Direction.Left);
      }
    } else if (event.code === 'ArrowUp') {
      newFreeElement = baseStore.freeElement + baseStore.numLines;
      if (newFreeElement <= baseStore.arrayLength) {
        baseStore.saveActualOrder(getArrayKeyByValue(baseStore.actualOrders, newFreeElement), Direction.Up);
      }
    } else if (event.code === 'ArrowDown') {
      newFreeElement = baseStore.freeElement - baseStore.numLines;
      if (newFreeElement > 0) {
        baseStore.saveActualOrder(getArrayKeyByValue(baseStore.actualOrders, newFreeElement), Direction.Down);
      }
    }
  });
});

const { doResetList } = storeToRefs(baseStore);
watch(
  doResetList,
  (value, oldValue) => {
    if (value && !oldValue) {
      baseStore.initStore();
    }
  },
  { immediate: true, flush: 'post' }
);
</script>

<template>
  <div ref="container" class="board">
    <div v-if="baseStore.paused" class="paused-veil"><span>Pause</span></div>
    <div v-if="isMounted">
      <Square
        v-for="n in baseStore.numLines ** 2 - 1"
        :key="n"
        :square-size="squareSize"
        :container-right="right"
        :container-bottom="bottom"
        :container-top="top"
        :container-left="left"
        :order="n - 1"
        :mixed-order="baseStore.mixedOrders[n - 1]"
        :space-between="spaceBetween"
      />
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  width: v-bind(boardSize);
  height: v-bind(boardSize);
  border: 0px;
  box-shadow: rgba(0, 0, 0, 0.3) 0px 5px 15px;
  border-radius: 8px;
  align-content: center;
  position: relative;
}
.paused-veil {
  display: flex;
  width: v-bind(boardSize);
  height: v-bind(boardSize);
  border: 1px solid #ccc;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: #ccc;
  opacity: 0.5;
  z-index: 1000;
}
.paused-veil span {
  color: black;
  font-size: 52px;
  padding-bottom: 10px;
}
</style>
