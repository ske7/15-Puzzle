<script setup lang="ts">
import { useWindowSize, useDocumentVisibility } from '@vueuse/core';
import { useBaseStore } from './stores/base';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomToolsPanel from './components/BottomToolsPanel.vue';
import { computed, watch } from 'vue';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
const visibility = useDocumentVisibility();

const squareSize = computed(() => {
  const spaces = baseStore.spaceBetween * 5;
  let cageAdd = 0;
  if (baseStore.cageMode) {
    cageAdd = 10;
  }
  let value = 0;
  if (windowWidth.value <= 360) {
    if (baseStore.cageMode) {
      value = Math.floor((windowWidth.value - (spaces + 60)) / 4);
    } else {
      value = Math.floor((windowWidth.value - (spaces + 40)) / 4);
    }
  } else if (windowWidth.value <= 500) {
    value = Math.floor((windowWidth.value - (spaces + 60)) / 4);
  } else {
    value = 80;
  }
  return value + cageAdd;
});

const boardSize = computed(() => {
  return baseStore.boardSize(squareSize.value);
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
    <img src="./assets/cage.webp" alt="Nic.Cage" width="48" height="48">
  </div>
  <TopInfoPanel />
  <div class="board-container">
    <Board :square-size="squareSize" />
  </div>
  <BottomToolsPanel />
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congrats! You've done it. 🏆</p>
    <p v-if="baseStore.eligibleForCageMode">
      You unlocked "cage mode" for the next game!
    </p>
  </div>
  <p v-else class="instruction">
    Game instruction: Move blocks until they are in regular order.
    You can play and beat records of time and moves. Unlock "cage mode" completing the puzzle in less than a minute.
  </p>
</template>

<style scoped>
.board-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
  margin-bottom: 15px;
}
.header h1 {
  display: flex;
  justify-content: center;
  font-size: 40px;
  align-items: center;
  line-height: 48px;
}
.header img {
  width: 48px;
  height: 48px;
  margin-left: 15px;
  display: flex;
  align-items: center;
  border-radius: 8px;
}
.instruction {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  max-width: v-bind(boardSize);
  font-size: 16px;
  margin-top: 5px;
  text-align: left;
  line-height: 1.4;
}
.finish-message {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding-top: 5px;
}
.finish-message p {
  font-size: 21px;
  line-height: 32px;
  text-align: center;
  color: goldenrod;
  font-weight: 600;
  max-width: v-bind(boardSize);
}
@media screen and (max-width: 401px) {
  .header h1 {
    font-size: 36px;
  }
  .finish-message p {
    font-size: 20px;
    line-height: 27px;
    font-weight: 600;
  }
}
</style>
