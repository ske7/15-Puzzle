<script setup lang="ts">
import Board from './components/Board.vue';
import { useBaseStore } from './stores/base';

const baseStore = useBaseStore();
</script>

<template>
  <header>15 Puzzle <img src="./assets/cage.png" alt="Nic Cage" /></header>
  <div class="board-container">
    <Board :square-size="70" :num-lines="4" />
  </div>
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congratulations!</p>
    <p>You've done it.</p>
  </div>
</template>
