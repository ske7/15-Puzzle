<script setup lang="ts">
import { watch, ref, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';
const ConfirmDialog = defineAsyncComponent({
  loader: async () => import('../components/ConfirmDialog.vue'),
  delay: 150
});
const InfoModal = defineAsyncComponent({
  loader: async () => import('../components/InfoModal.vue'),
  delay: 150
});

const baseStore = useBaseStore();

const newMovesRecord = ref(false);
const newTimeRecord = ref(false);
const wasPausedBeforeConfirm = ref(false);

const reset = (): void => {
  newMovesRecord.value = false;
  newTimeRecord.value = false;
  baseStore.reset();
  baseStore.restartInterval();
};
const doShowConfirm = (): void => {
  if (!baseStore.afterDoneAnimationEnd) {
    return;
  }
  if (baseStore.isDone || (baseStore.time < 10 && baseStore.movesCount < 10)) {
    reset();
    return;
  }
  wasPausedBeforeConfirm.value = baseStore.paused;
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
  baseStore.showConfirm = true;
};
const doConfirmRestart = (): void => {
  baseStore.showConfirm = false;
  reset();
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
};
const declineConfirm = (): void => {
  baseStore.showConfirm = false;
  if (!wasPausedBeforeConfirm.value) {
    baseStore.invertPaused();
  }
};
const showAboutModal = (): void => {
  if (!baseStore.paused && baseStore.doneFirstMove && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showInfo = true;
};
const closeAboutModal = (): void => {
  baseStore.showInfo = false;
  if (baseStore.paused && baseStore.movesCount === 0) {
    baseStore.invertPaused();
  }
};

const eventBus = useEventBus<string>('event-bus');
const listener = (event: string): void => {
  if (event === 'restart') {
    doShowConfirm();
  }
};

baseStore.timeRecord = Number(localStorage.getItem('timeRecord'));
baseStore.movesRecord = Number(localStorage.getItem('movesRecord'));
baseStore.restartInterval();

const { isDone } = storeToRefs(baseStore);
watch(
  isDone,
  (value) => {
    if (value) {
      baseStore.stopInterval();
      if (
        baseStore.movesCount > 0 &&
        (baseStore.movesRecord === 0 || baseStore.movesCount < baseStore.movesRecord)
      ) {
        baseStore.movesRecord = baseStore.movesCount;
        localStorage.setItem('movesRecord', baseStore.movesCount.toString());
        newMovesRecord.value = true;
      }
      if (
        baseStore.time > 0 &&
        (baseStore.timeRecord === 0 || baseStore.time < baseStore.timeRecord)
      ) {
        baseStore.timeRecord = baseStore.time;
        localStorage.setItem('timeRecord', baseStore.time.toString());
        newTimeRecord.value = true;
      }
      if (baseStore.time > 0 && baseStore.time < 60) {
        baseStore.eligibleForCageMode = true;
      }
    }
  },
  { immediate: true }
);
onMounted(() => {
  eventBus.on(listener);
});
onUnmounted(() => {
  eventBus.off(listener);
});
</script>

<template>
  <div class="bottom-tools-panel">
    <div class="tool-items first-row">
      <button
        class="tool-button"
        :disabled="
          baseStore.showConfirm || baseStore.showInfo ||
            !baseStore.afterDoneAnimationEnd || baseStore.paused
        "
        @click="doShowConfirm"
      >
        Restart
      </button>
      <button
        class="tool-button pause-button"
        :disabled="baseStore.showConfirm || baseStore.showInfo ||
          !baseStore.afterDoneAnimationEnd || isDone || !baseStore.doneFirstMove"
        @click="baseStore.invertPaused"
      >
        {{ baseStore.paused && !baseStore.showConfirm && !baseStore.showInfo ? 'Resume' : 'Pause' }}
      </button>
      <button
        class="tool-button"
        :disabled="baseStore.showConfirm || baseStore.showInfo"
        @click="showAboutModal"
      >
        About
      </button>
    </div>
    <div class="tool-items end records">
      <span class="caption">Your record:</span>
      <span class="time" :class="{ red: newTimeRecord }">
        {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeRecord }}s
      </span>
      &nbsp;/&nbsp;
      <span class="moves-count" :class="{ red: newMovesRecord }">
        {{ baseStore.movesRecord || '?' }} moves
      </span>
    </div>
  </div>
  <ConfirmDialog
    v-if="baseStore.showConfirm"
    @confirm="doConfirmRestart"
    @decline="declineConfirm"
  />
  <InfoModal
    v-if="baseStore.showInfo"
    @close="closeAboutModal"
  />
</template>
