<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import Square from './Square.vue';

const props = defineProps<{ squareSize: number }>();

const baseStore = useBaseStore();
baseStore.initStore();

const boardSize = computed(() => {
  return `${baseStore.numLines * props.squareSize}px`;
});
const container = ref();
const { left, right, top, bottom } = useElementBounding(container);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
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
      />
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  width: v-bind(boardSize);
  height: v-bind(boardSize);
  border: 1px solid blue;
  border-radius: 10px;
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
