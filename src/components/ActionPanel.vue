<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, onUnmounted, computed } from 'vue';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';
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

const baseStore = useBaseStore();

const wasPausedBeforeOpenModal = ref(false);

const doRestart = (initRestartPath: string): void => {
  if (!baseStore.afterDoneAnimationEnd ||
     (baseStore.showModal && !['fromConfig', 'fromKeyboard'].includes(initRestartPath))) {
    return;
  }
  baseStore.reset();
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
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.isDone && !wasPausedBeforeOpenModal.value) {
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
const listener = (event: string, payload: string): void => {
  if (event === 'restart') {
    doRestart(payload);
  }
  if (event === 'show-image-gallery') {
    showImageGallery();
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
  <div class="action-panel">
    <div class="first-row">
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
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
        :disabled="disableButton || baseStore.paused"
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
  </div>
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
    @close="closeImageGallery"
  />
</template>

<style scoped>
.action-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-top: 10px;
  width: 100%;
  font-family: 'consolas';
  line-height: 27px;
}
.action-panel .first-row {
  display: flex;
  margin-bottom: 10px;
  width: 100%;
  justify-content: space-around;
}
@media screen and (max-width: 420px) {
  .action-panel .first-row {
    justify-content: space-between;
  }
}
</style>
