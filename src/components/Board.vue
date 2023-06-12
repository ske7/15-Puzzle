<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import Square from './Square.vue';
import { generateAndShuffle, generate } from '../utils';

type PossibleLinesCount = 3 | 4 | 5;

interface Props {
  numLines?: PossibleLinesCount;
  squareSize: number;
}

const props = withDefaults(defineProps<Props>(), {
  numLines: 4
});

const boardSize = computed(() => {
  return props.numLines * props.squareSize + 'px';
});
const container = ref();
const { left, right, top, bottom } = useElementBounding(container);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});

const list = ref<number[]>([]);
const baseStore = useBaseStore();
const { doResetList } = storeToRefs(baseStore);
doResetList.value = true;
watch(
  doResetList,
  (value, oldValue) => {
    if (value && !oldValue) {
      list.value = generateAndShuffle(props.numLines ** 2);
      baseStore.$patch({
        numLines: props.numLines,
        freeElement: props.numLines ** 2,
        movesCount: 0,
        time: 0,
        actualOrders: generate(props.numLines ** 2)
      });
      baseStore.doResetList = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div ref="container" class="board">
    <div v-if="isMounted">
      <Square
        v-for="n in numLines ** 2 - 1"
        :key="n"
        :square-size="squareSize"
        :container-right="right"
        :container-bottom="bottom"
        :container-top="top"
        :container-left="left"
        :order="n - 1"
        :mixed-order="list[n - 1]"
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
</style>
