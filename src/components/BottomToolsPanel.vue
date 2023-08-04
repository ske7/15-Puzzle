<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, onUnmounted, computed } from 'vue';
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
const ImageGallery = defineAsyncComponent({
  loader: async () => import('../components/ImageGallery.vue'),
  delay: 150
});

const props = defineProps<{ squareSize: number; }>();

const baseStore = useBaseStore();

const wasPausedBeforeOpenModal = ref(false);

const reset = (): void => {
  baseStore.reset();
};
const doShowConfirm = (noAsk = false): void => {
  if (!baseStore.afterDoneAnimationEnd) {
    return;
  }
  if (baseStore.proMode || noAsk || baseStore.isDone || baseStore.seconds < 10 && baseStore.movesCount < 10) {
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
const showImageGallery = (): void => {
  if (baseStore.paused) {
    return;
  }
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showImageGallery = true;
};
const closeImageGallery = (): void => {
  baseStore.showImageGallery = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};

const eventBus = useEventBus<string>('event-bus');
const listener = (event: string): void => {
  if (event === 'restart') {
    doShowConfirm(true);
  }
};

const disableButton = computed(() => {
  return baseStore.showModal ||
        (baseStore.isDone && !baseStore.afterDoneAnimationEnd) ||
        (baseStore.cageMode && !baseStore.finishLoadingAllCageImages);
});

onMounted(() => {
  eventBus.on(listener);
});
onUnmounted(() => {
  eventBus.off(listener);
});
</script>

<template>
  <div class="bottom-tools-panel" :class="{ paused: baseStore.paused }">
    <div class="tool-items first-row">
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doShowConfirm(false)"
      >
        Restart
      </button>
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || !baseStore.doneFirstMove || baseStore.isDone || baseStore.proMode"
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
    <div class="tool-items second-row">
      <div class="tool-items records consolas">
        <div>
          <span>{{ baseStore.marathonMode ? 'Marathon record' : 'Your record' }}:</span>
          <span v-if="!baseStore.waitForUpdate">
            <span class="ml-5 italic" :class="{ red: baseStore.newTimeRecord }">
              {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeMRecord }}
            </span>s/
          </span>
        </div>
        <span v-if="!baseStore.waitForUpdate" class="italic" :class="{ red: baseStore.newMovesRecord }">
          {{ baseStore.movesRecord || '?' }}
        </span>&nbsp;<span v-if="!baseStore.waitForUpdate">moves</span>
      </div>
      <div v-if="!(baseStore.disableCageMode || baseStore.marathonMode)" class="tool-items records consolas">
        <span :class="{ paused: baseStore.paused }">
          <span class="unlocked" @click="showImageGallery">Completed</span>  <span class="italic">
            {{ baseStore.unlockedCages.size }}
          </span> out of {{ baseStore.cagesCount }} "Cages"
        </span>
      </div>
      <div v-if="baseStore.marathonMode" class="tool-items records consolas">
        <span>
          Solved
          <span class="italic">
            {{ baseStore.solvedPuzzlesInMarathon }}
          </span> out of 5 puzzles
        </span>
      </div>
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
  <ImageGallery
    v-if="baseStore.showImageGallery"
    :square-size="props.squareSize"
    @close="closeImageGallery"
  />
</template>
