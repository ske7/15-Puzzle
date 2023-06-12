<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useElementBounding } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import Square from './Square.vue';
import { generateAndShuffle } from '../utils';

type PossibleLinesCount = 3 | 4 | 5;

interface Props {
  numLines?: PossibleLinesCount;
  squareSize: number;
}

const props = withDefaults(defineProps<Props>(), {
  numLines: 4
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

const list = generateAndShuffle(props.numLines ** 2);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});
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
