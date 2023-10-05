<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, onUnmounted, computed, type AsyncComponentLoader } from 'vue';
import { ControlTypeReverseMap } from '@/const';
import { sleep } from '@/utils';
import { useBaseStore } from '../stores/base';
import { useEventBus, useWindowSize } from '@vueuse/core';
const ConfigModal = defineAsyncComponent({
  loader: async () => await import('../components/ConfigModal.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const InfoModal = defineAsyncComponent({
  loader: async () => await import('../components/InfoModal.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const ImageGallery = defineAsyncComponent({
  loader: async () => await import('../components/ImageGallery.vue') as unknown as AsyncComponentLoader,
  delay: 150
});

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();

const wasPausedBeforeOpenModal = ref(false);

const savedStep = ref(0);
const doRestart = (initRestartPath: string): void => {
  if (!baseStore.afterDoneAnimationEnd ||
     (baseStore.showModal && !['fromConfig', 'fromKeyboard'].includes(initRestartPath))) {
    return;
  }
  savedStep.value = 0;
  stopWalk.value = false;
  baseStore.inReplay = false;
  baseStore.reset(initRestartPath === 'fromConfig');
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
const stopWalk = ref(false);
const doReplay = async(walkTime?: number, walkMode = false): Promise<void> => {
  if (!walkMode) {
    doRestart('fromMain');
    savedStep.value = 0;
  }
  baseStore.inReplay = true;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const control = ControlTypeReverseMap.get(baseStore.repGame.control_type[0])!;
  let moveTime = walkTime;
  if (moveTime == null) {
    moveTime = Math.round(baseStore.repGame.time / (baseStore.repGame.moves));
  }
  baseStore.replaySpeed = moveTime;
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = savedStep.value; i < baseStore.repGame.solve_path.length; i++) {
    const move = baseStore.repGame.solve_path[i];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!baseStore.inReplay) {
      if (stopWalk.value) {
        baseStore.saveTime();
        savedStep.value = i;
      }
      break;
    }
    switch (move) {
      case 'R':
        baseStore.moveRight(control);
        break;
      case 'L':
        baseStore.moveLeft(control);
        break;
      case 'D':
        baseStore.moveDown(control);
        break;
      case 'U':
        baseStore.moveUp(control);
        break;
      default:
    }
    await sleep(moveTime);
  }
  baseStore.inReplay = false;
};
const doWalk = async (): Promise<void> => {
  const solveLen = baseStore.solvePath.length;
  if (solveLen > 0 && baseStore.solvePath.join('') === baseStore.repGame.solve_path) {
    doRestart('fromMain');
    await sleep(200);
    await doReplay(200, true);
    return;
  }
  if (baseStore.isDone ||
  (baseStore.solvePath.join('') !== baseStore.repGame.solve_path.slice(0, solveLen)) ||
  (stopWalk.value && (baseStore.solvePath.join('') !== baseStore.repGame.solve_path.slice(0, savedStep.value)))) {
    savedStep.value = 0;
    stopWalk.value = false;
    doRestart('fromMain');
    await doReplay(200, true);
    return;
  }
  if (baseStore.inReplay) {
    baseStore.inReplay = false;
    stopWalk.value = true;
  } else {
    stopWalk.value = false;
    await doReplay(200, true);
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

const disableDuringMarathon = computed(() => {
  return baseStore.marathonMode && baseStore.doneFirstMove && !baseStore.isDone;
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
    <div v-if="windowWidth >= 820" class="first-row">
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
      >
        Restart
      </button>
      <button
        v-if="!baseStore.proMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || !baseStore.doneFirstMove ||
          baseStore.isDone || baseStore.proMode"
        @click="baseStore.invertPaused"
      >
        {{ baseStore.paused && !baseStore.showModal ? 'Resume' : 'Pause' }}
      </button>
      <button
        v-if="!baseStore.replayMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.paused"
        @click="showConfigModal"
      >
        Config
      </button>
      <button
        v-if="baseStore.replayMode"
        type="button"
        class="tool-button"
        @click="doWalk"
      >
        {{ baseStore.inReplay ? 'Stop' : 'Walk' }}
      </button>
      <button
        v-if="baseStore.replayMode"
        type="button"
        class="tool-button"
        :disabled="baseStore.inReplay"
        @click="doReplay()"
      >
        Replay
      </button>
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.inReplay"
        @click="showAboutModal"
      >
        About
      </button>
    </div>
    <div v-if="windowWidth < 820" class="first-row">
      <button
        v-if="baseStore.replayMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
      >
        Restart
      </button>
      <button
        v-if="baseStore.replayMode"
        type="button"
        class="tool-button"
        @click="doWalk"
      >
        {{ baseStore.inReplay ? 'Stop' : 'Walk' }}
      </button>
      <button
        v-if="baseStore.replayMode"
        type="button"
        class="tool-button"
        :disabled="baseStore.inReplay"
        @click="doReplay()"
      >
        Replay
      </button>
      <button
        v-if="!baseStore.replayMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.paused"
        @click="showConfigModal"
      >
        Config
      </button>
      <button
        v-if="!baseStore.replayMode"
        type="button"
        class="tool-button mobile"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
      >
        Restart
      </button>
      <button
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.inReplay"
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
  font-family: 'consolas', sans-serif;
  line-height: 27px;
}
.action-panel .first-row {
  display: flex;
  margin-bottom: 5px;
  width: 100%;
  justify-content: space-around;
}
@media screen and (max-width: 820px) {
.action-panel .first-row {
  justify-content: space-around;
  align-items: center;
}
}
@media screen and (max-width: 420px) {
  .tool-button {
    height: 28px;
    width: 62px;
  }
}
.tool-button.mobile {
  height: 32px;
  width: 140px;
  font-size: 19px;
}
</style>
