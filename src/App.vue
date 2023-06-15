<script setup lang="ts">
import { watch, ref } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useBaseStore } from './stores/base';
import Board from './components/Board.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
const showConfirm = ref(false);
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
  newMovesRecord.value = false;
  newTimeRecord.value = false;
  baseStore.reset();
  restartInterval();
};

const wasPausedBeforeConfirm = ref(false);
const doShowConfirm = () => {
  if (baseStore.time < 10 && baseStore.movesCount < 10) {
    reset();
    return;
  }
  wasPausedBeforeConfirm.value = baseStore.paused;
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
  showConfirm.value = true;
};
const doConfirmRestart = () => {
  showConfirm.value = false;
  reset();
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
};
const declineConfirm = () => {
  showConfirm.value = false;
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
};

baseStore.timeRecord = Number(localStorage.getItem('timeRecord'));
baseStore.movesRecord = Number(localStorage.getItem('movesRecord'));
restartInterval();

const newMovesRecord = ref(false);
const newTimeRecord = ref(false);
const { isDone } = storeToRefs(baseStore);
watch(
  isDone,
  (value, oldValue) => {
    if (value && !oldValue) {
      baseStore.stopInterval();
      if (baseStore.movesCount > 0 && (baseStore.movesRecord === 0 || baseStore.movesCount < baseStore.movesRecord)) {
        baseStore.movesRecord = baseStore.movesCount;
        localStorage.setItem('movesRecord', baseStore.movesCount.toString());
        newMovesRecord.value = true;
      }
      if (baseStore.time > 0 && (baseStore.timeRecord === 0 || baseStore.time < baseStore.timeRecord)) {
        baseStore.timeRecord = baseStore.time;
        localStorage.setItem('timeRecord', baseStore.time.toString());
        newTimeRecord.value = true;
      }
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
      <button class="tool-button" :disabled="showConfirm" @click="doShowConfirm">Restart</button>
      <button
        class="tool-button pause-button"
        :class="{ 'green-button': baseStore.paused }"
        :disabled="showConfirm"
        @click="baseStore.invertPaused"
      >
        {{ baseStore.paused ? 'Resume' : 'Pause' }}
      </button>
    </div>
    <div class="tool-item end records">
      <span style="margin-right: 3px">{{ windowWidth > 600 ? 'Record:' : 'Rec.:' }}</span>
      <span class="moves-count" :class="{ red: newMovesRecord }">{{ baseStore.movesRecord || '?' }} </span>&nbsp;/&nbsp;
      <span class="time" :class="{ red: newTimeRecord }">
        {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeRecordMinutes || '0' }}m&nbsp;
      </span>
      <span class="time" :class="{ red: newTimeRecord }">
        {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeRecordSeconds || '00' }}s
      </span>
    </div>
  </div>
  <p v-if="!baseStore.isDone" class="instruction">Game rule: move blocks until they are in regular order</p>
  <div v-if="baseStore.isDone" class="finish-message">
    <p>Congratulations!</p>
    <p>You've done it.</p>
  </div>
  <ConfirmDialog v-if="showConfirm" @confirm="doConfirmRestart" @decline="declineConfirm" />
</template>
