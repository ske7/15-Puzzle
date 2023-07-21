<script setup lang="ts">
import { watch, ref, defineAsyncComponent, onMounted, onUnmounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';
const ConfirmDialog = defineAsyncComponent({
  loader: async () => import('../components/ConfirmDialog.vue'),
  delay: 150
});
const ConfigModal = defineAsyncComponent({
  loader: async () => import('../components/ConfigModal.vue'),
  delay: 150
});
const InfoModal = defineAsyncComponent({
  loader: async () => import('../components/InfoModal.vue'),
  delay: 150
});

const baseStore = useBaseStore();

const wasPausedBeforeOpenModal = ref(false);

const reset = (): void => {
  baseStore.reset();
  baseStore.restartInterval();
};
const doShowConfirm = (): void => {
  if (!baseStore.afterDoneAnimationEnd) {
    return;
  }
  if (baseStore.isDone || baseStore.time < 10 && baseStore.movesCount < 10) {
    reset();
    return;
  }
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused) {
    baseStore.invertPaused();
  }
  baseStore.showConfirm = true;
};
const closeConfirmModal = (): void => {
  baseStore.showConfirm = false;
  if (!wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const confirmRestart = (): void => {
  reset();
  closeConfirmModal();
};
const showAboutModal = (): void => {
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showInfo = true;
};
const closeAboutModal = (): void => {
  baseStore.showInfo = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const showConfigModal = (): void => {
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showConfig = true;
};
const closeConfigModal = (): void => {
  baseStore.showConfig = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
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

const disableButton = computed(() => {
  return baseStore.showModal ||
        (baseStore.isDone && !baseStore.afterDoneAnimationEnd) ||
        (baseStore.cageMode && !baseStore.finishLoadingAllCageImages);
});

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
        baseStore.newMovesRecord = true;
      }
      if (
        baseStore.time > 0 &&
        (baseStore.timeRecord === 0 || baseStore.time < baseStore.timeRecord)
      ) {
        baseStore.timeRecord = baseStore.time;
        localStorage.setItem('timeRecord', baseStore.time.toString());
        baseStore.newTimeRecord = true;
      }
      if (!baseStore.disableCageMode && baseStore.time > 0 && baseStore.time < 60) {
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
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doShowConfirm"
      >
        Restart
      </button>
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || !baseStore.doneFirstMove || isDone"
        @click="baseStore.invertPaused"
      >
        {{ baseStore.paused && !baseStore.showModal ? 'Resume' : 'Pause' }}
      </button>
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton"
        @click="showConfigModal"
      >
        Config
      </button>
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton"
        @click="showAboutModal"
      >
        About
      </button>
    </div>
    <div class="tool-items records consolas">
      <span>Your record:</span>
      <span class="ml-5 italic" :class="{ red: baseStore.newTimeRecord }">
        {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeRecord }}
      </span>s&nbsp;/&nbsp;
      <span class="italic" :class="{ red: baseStore.newMovesRecord }">
        {{ baseStore.movesRecord || '?' }}
      </span>&nbsp;<span>moves</span>
    </div>
    <div v-if="!baseStore.disableCageMode" class="tool-items records consolas">
      <span>
        Unlocked
        <span class="italic">
          {{ baseStore.unlockedCages.size }}
        </span> out of {{ baseStore.cagesCount }} "Cages"
      </span>
    </div>
  </div>
  <ConfirmDialog
    v-if="baseStore.showConfirm"
    @confirm="confirmRestart"
    @decline="closeConfirmModal"
  />
  <ConfigModal
    v-if="baseStore.showConfig"
    @close="closeConfigModal"
  />
  <InfoModal
    v-if="baseStore.showInfo"
    @close="closeAboutModal"
  />
</template>
