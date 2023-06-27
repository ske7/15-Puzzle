<script setup lang="ts">
import { watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const baseStore = useBaseStore();

const newMovesRecord = ref(false);
const newTimeRecord = ref(false);
const wasPausedBeforeConfirm = ref(false);

const reset = () => {
  newMovesRecord.value = false;
  newTimeRecord.value = false;
  baseStore.reset();
  baseStore.restartInterval();
};
const doShowConfirm = () => {
  if (!baseStore.afterDoneAnimationEnd) {
    return;
  }
  if (isDone.value || (baseStore.time < 10 && baseStore.movesCount < 10)) {
    reset();
    return;
  }
  wasPausedBeforeConfirm.value = baseStore.paused;
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
  baseStore.showConfirm = true;
};
const doConfirmRestart = () => {
  baseStore.showConfirm = false;
  reset();
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
};
const declineConfirm = () => {
  baseStore.showConfirm = false;
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
};

baseStore.timeRecord = Number(localStorage.getItem('timeRecord'));
baseStore.movesRecord = Number(localStorage.getItem('movesRecord'));
baseStore.restartInterval();

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
  <div class="bottom-tools-panel">
    <div class="tool-items first-row">
      <button
        class="tool-button"
        :disabled="baseStore.showConfirm || !baseStore.afterDoneAnimationEnd || baseStore.paused"
        @click="doShowConfirm"
      >
        Restart
      </button>
      <button
        class="tool-button pause-button"
        :disabled="baseStore.showConfirm || !baseStore.afterDoneAnimationEnd || isDone || !baseStore.doneFirstMove"
        @click="baseStore.invertPaused"
      >
        {{ baseStore.paused && !baseStore.showConfirm ? 'Resume' : 'Pause' }}
      </button>
    </div>
    <div class="tool-items end records">
      <span class="caption">Record:</span>
      <span class="moves-count" :class="{ red: newMovesRecord }">{{ baseStore.movesRecord || '?' }} </span>&nbsp;/&nbsp;
      <span class="time" :class="{ red: newTimeRecord }">
        {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeRecordMinutes || '0' }}m&nbsp;
      </span>
      <span class="time" :class="{ red: newTimeRecord }">
        {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeRecordSeconds || '00' }}s
      </span>
    </div>
  </div>
  <ConfirmDialog v-if="baseStore.showConfirm" @confirm="doConfirmRestart" @decline="declineConfirm" />
</template>
