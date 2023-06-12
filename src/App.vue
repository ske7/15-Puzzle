<script setup lang="ts">
import Board from './components/Board.vue';
import { useBaseStore } from './stores/base';
import { useWindowSize } from '@vueuse/core';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
</script>

<template>
  <header>15 Puzzle <img src="./assets/cage.png" alt="Nic Cage" /></header>
  <div class="board-container">
    <Board :square-size="windowWidth > 600 ? 90 : 70" />
  </div>
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congratulations!</p>
    <p>You've done it.</p>
  </div>
</template>
