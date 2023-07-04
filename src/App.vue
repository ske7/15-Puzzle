<script setup lang="ts">
import { useWindowSize, useDocumentVisibility } from '@vueuse/core';
import { useBaseStore, SPACE_BETWEEN_SQUARES } from './stores/base';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomToolsPanel from './components/BottomToolsPanel.vue';
import { computed, watch } from 'vue';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
const visibility = useDocumentVisibility();

const squareSize = computed(() => {
  const spaces = SPACE_BETWEEN_SQUARES * 5;
  if (windowWidth.value <= 360) {
    return Math.floor((windowWidth.value - (spaces + 40)) / 4);
  } else if (windowWidth.value <= 500) {
    return Math.floor((windowWidth.value - (spaces + 60)) / 4);
  } else {
    return 90;
  }
});

watch(visibility, (value) => {
  if (value === 'hidden' && baseStore.time > 0 && !baseStore.isDone) {
    baseStore.paused = true;
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
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congrats! You've done it. 🏆</p>
  </div>
</template>
