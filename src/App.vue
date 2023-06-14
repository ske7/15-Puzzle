<script setup lang="ts">
import { watch } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useBaseStore } from './stores/base';
import Board from './components/Board.vue';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
const restartInterval = () => {
  if (baseStore.interval) {
    baseStore.stopInterval();
  }
  baseStore.interval = setInterval(() => {
    if (baseStore.paused) {
      return;
    }
    baseStore.time++;
  }, 1000);
};
const reset = () => {
  baseStore.reset();
  restartInterval();
};
restartInterval();

const { isDone } = storeToRefs(baseStore);
watch(
  isDone,
  (value, oldValue) => {
    if (value && !oldValue) {
      baseStore.stopInterval();
    }
  },
  { immediate: true }
);
</script>

<template>
  <header>15 Puzzle <img src="./assets/cage.png" alt="Nic Cage" /></header>
  <div class="top-tools-panel">
    <div class="tool-item">
      <span>Time:&nbsp;</span>
      <span class="time">{{ baseStore.minutes || '0' }}m&nbsp;</span>
      <span class="time">{{ baseStore.seconds || '00' }}s</span>
    </div>
    <div class="tool-item end">
      <span>Moves:&nbsp;</span>
      <span class="moves-count">{{ baseStore.movesCount }}</span>
    </div>
  </div>
  <div class="board-container">
    <Board :square-size="windowWidth > 600 ? 90 : 70" />
  </div>
  <div class="bottom-tools-panel">
    <div class="tool-item">
      <button @click="reset">Restart</button>
    </div>
    <div class="tool-item">
      <button :class="{ 'green-button': baseStore.paused }" @click="baseStore.invertPaused">
        {{ baseStore.paused ? 'Resume' : 'Pause' }}
      </button>
    </div>
  </div>
  <p v-if="!baseStore.isDone" class="instruction">Game rule: move blocks until they are in regular order</p>
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congratulations!</p>
    <p>You've done it.</p>
  </div>
</template>
