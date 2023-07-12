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
  if (windowWidth.value <= 370) {
    if (baseStore.cageMode) {
      value = Math.floor((windowWidth.value - (spaces + 60)) / 4);
    } else {
      value = Math.floor((windowWidth.value - (spaces + 40)) / 4);
    }
  } else if (windowWidth.value <= 420) {
    value = Math.floor((windowWidth.value - (spaces + 60)) / 4);
  } else {
    value = 80;
  }
  return value + cageAdd;
});

const cageImgSize = computed(() => {
  if (windowWidth.value <= 420) {
    return 36;
  }
  return 48;
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
    <img src="./assets/cage.webp" alt="Nic.Cage" :width="cageImgSize" :height="cageImgSize">
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
@media screen and (max-width: 420px) {
  .header {
    margin-top: 20px;
  }
  .header h1 {
    font-size: 32px;
    line-height: 36px;
  }
  .header img {
    width: 36px;
    height: 36px;
  }
  .finish-message p {
    font-size: 18px;
    line-height: 25px;
    font-weight: 600;
  }
}
</style>
