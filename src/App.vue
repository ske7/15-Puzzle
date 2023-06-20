<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from './stores/base';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomToolsPanel from './components/BottomToolsPanel.vue';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
</script>

<template>
  <header>15 Puzzle <img src="./assets/cage.png" alt="Nic Cage" /></header>
  <TopInfoPanel />
  <div class="board-container">
    <Board :square-size="windowWidth > 600 ? 90 : 70" />
  </div>
  <BottomToolsPanel />
  <p v-if="!baseStore.isDone" class="instruction">Game rule: move blocks until they are in regular order</p>
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congratulations!</p>
    <p>You've done it.</p>
  </div>
</template>
