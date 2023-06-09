<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useElementBounding } from '@vueuse/core';
import Square from './Square.vue';
import { useBaseStore } from '../stores/base';

function shuffle(array: number[]) {
  const length = array == null ? 0 : array.length;
  if (!length) {
    return [];
  }
  let index = -1;
  const lastIndex = length - 1;
  const result = [...array];
  while (++index < length) {
    const rand = index + Math.floor(Math.random() * (lastIndex - index + 1));
    const value = result[rand];
    result[rand] = result[index];
    result[index] = value;
  }
  return result;
}

function* sequenceGenerator(minVal: number, maxVal: number) {
  let currVal = minVal;
  while (currVal < maxVal) yield currVal++;
}

type PossibleLinesCount = 3 | 4 | 5;

interface Props {
  numLines?: PossibleLinesCount;
  squareSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  numLines: 4,
  squareSize: 60
});

const baseStore = useBaseStore();
baseStore.$patch({
  numLines: props.numLines,
  freeElement: props.numLines ** 2
});

const boardSize = computed(() => {
  return props.numLines * props.squareSize + 'px';
});

const container = ref();
const { left, right, top, bottom } = useElementBounding(container);

const list = shuffle([
  ...sequenceGenerator(1, props.numLines * props.numLines)
]);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});
</script>

<template>
  <div ref="container" class="board">
    <div v-if="isMounted">
      <Square
        v-for="n in numLines * numLines - 1"
        :key="n"
        :order="n - 1"
        :r-order="list[n - 1]"
        :square-size="squareSize"
        :container-right="right"
        :container-bottom="bottom"
        :container-top="top"
        :container-left="left"
        :top="top + squareSize * (Math.ceil(n / numLines) - 1)"
        :left="left + squareSize * ((n - 1) % numLines)"
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
  align-content: center;
  position: relative;
}
</style>
