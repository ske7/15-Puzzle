<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from './stores/base';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomToolsPanel from './components/BottomToolsPanel.vue';
import { computed } from 'vue';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();

const squareSize = computed(() => {
  if (windowWidth.value <= 400) {
    return 60;
  } else if (windowWidth.value <= 600) {
    return 70;
  } else {
    return 90;
  }
});
</script>

<template>
  <div class="header">
    <h1>15 Puzzle</h1>
    <img src="./assets/cage.webp" alt="Nic.Cage" width="48" height="48" />
  </div>
  <TopInfoPanel />
  <div class="board-container">
    <Board :square-size="squareSize" />
  </div>
  <BottomToolsPanel />
  <p v-if="!baseStore.isDone" class="instruction">Game rule: move blocks until they are in regular order</p>
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congratulations!</p>
    <p>You've done it.</p>
  </div>
</template>
