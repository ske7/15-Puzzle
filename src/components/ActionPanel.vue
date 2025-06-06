<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, onUnmounted, computed, type AsyncComponentLoader } from 'vue';
import { ControlTypeReverseMap, baseUrl } from '@/const';
import { sleep, createLinkAndClick } from '@/utils';
import { useBaseStore } from '../stores/base';
import { useEventBus, useWindowSize } from '@vueuse/core';
const ConfigModal = defineAsyncComponent({
  loader: async () => await import('./ConfigModal.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const InfoModal = defineAsyncComponent({
  loader: async () => await import('./InfoModal.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const ImageGallery = defineAsyncComponent({
  loader: async () => await import('./ImageGallery.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const AddScramble = defineAsyncComponent({
  loader: async () => await import('./AddScramble.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const ScrambleList = defineAsyncComponent({
  loader: async () => await import('./ScrambleList.vue') as unknown as AsyncComponentLoader,
  delay: 150
});

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();

const wasPausedBeforeOpenModal = ref(false);
const stopWalk = ref(false);
const savedStep = ref(0);
const doRestart = (initRestartPath: string): void => {
  if (!baseStore.afterDoneAnimationEnd ||
     (baseStore.showModal && !['fromConfig', 'fromKeyboard'].includes(initRestartPath))) {
    return;
  }
  if (baseStore.g1000Mode && !baseStore.isDone) {
    return;
  }
  savedStep.value = 0;
  stopWalk.value = false;
  baseStore.inReplay = false;
  baseStore.wasReplay = false;
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
const doReplay = async (walkTime?: number, walkMode = false): Promise<void> => {
  if (!walkMode) {
    doRestart('fromMain');
    await sleep(100);
    savedStep.value = 0;
  }
  baseStore.inReplay = true;

  const control = ControlTypeReverseMap.get(baseStore.repGame.control_type[0])!;
  const moveTime = (walkTime ?? Math.round(baseStore.repGame.time / baseStore.repGame.moves)) || 0;
  baseStore.replaySpeed = moveTime;

  for (let i = savedStep.value; i < baseStore.repGame.solve_path.length; i++) {
    baseStore.wasReplay = true;
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
    await sleep(100);
    await doReplay(baseStore.walkSpeed, true);
    return;
  }
  if (baseStore.isDone ||
  (baseStore.solvePath.join('') !== baseStore.repGame.solve_path.slice(0, solveLen)) ||
  (stopWalk.value && (baseStore.solvePath.join('') !== baseStore.repGame.solve_path.slice(0, savedStep.value)))) {
    savedStep.value = 0;
    stopWalk.value = false;
    doRestart('fromMain');
    await sleep(100);
    await doReplay(baseStore.walkSpeed, true);
    return;
  }
  if (baseStore.inReplay) {
    baseStore.inReplay = false;
    stopWalk.value = true;
  } else {
    stopWalk.value = false;
    await doReplay(baseStore.walkSpeed, true);
  }
};
const doRenew = (): void => {
  baseStore.savedOrders = [];
  doRestart('fromMain');
};
const addScramble = (): void => {
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showAddScramble = true;
};

const eventBus = useEventBus<string>('event-bus');
const listener = async (event: string, payload: string): Promise<void> => {
  if (event === 'restart') {
    doRestart(payload);
  }
  if (event === 'show-image-gallery') {
    showImageGallery();
  }
  if (event === 'walk') {
    await doWalk();
  }
};

const disableButton = computed(() => {
  return baseStore.showModal ||
        (baseStore.isDone && !baseStore.afterDoneAnimationEnd) ||
        (baseStore.cageMode && !baseStore.finishLoadingAllCageImages);
});

const disableDuringMarathon = computed(() => {
  return baseStore.marathonMode && baseStore.time > 0 && !baseStore.isDone;
});
const closeScrambleList = (): void => {
  baseStore.showScrambleList = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const closeAddScramble = (): void => {
  baseStore.showAddScramble = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const setScramble = (scramble: number[]): void => {
  baseStore.numLines = Math.sqrt(scramble.length);
  localStorage.setItem('numLines', baseStore.numLines.toString());
  baseStore.savedOrders = scramble;
  baseStore.checkUserScrambleInDB = true;
  baseStore.initStore();
  baseStore.newPlaygroundTimeRecord = false;
  baseStore.newPlaygroundMovesRecord = false;
  if (baseStore.showAddScramble) {
    closeAddScramble();
  }
  if (baseStore.showScrambleList) {
    closeScrambleList();
  }
};
const doTryToImprove = (): void => {
  localStorage.setItem('sharedPlaygroundScramble', String(baseStore.mixedOrders));
  createLinkAndClick(`${baseUrl}?playground`, true);
};
const showScrambleList = (): void => {
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showScrambleList = true;
};
const setWalkMode = (fastWalkMode: boolean): void => {
  baseStore.fastWalkMode = fastWalkMode;
  localStorage.setItem('fastWalkMode', baseStore.fastWalkMode.toString());
};
onMounted(() => {
  eventBus.on((event, payload) => {
    listener(event, String(payload)).catch((error: unknown) => { console.log(error) });
  });
});
onUnmounted(() => {
  eventBus.off((event, payload) => {
    listener(event, String(payload)).catch((error: unknown) => { console.log(error) });
  });
});
</script>

<template>
  <div class="action-panel">
    <div v-if="windowWidth >= 820" class="first-row">
      <button
        v-if="!baseStore.sharedPlaygroundMode && !baseStore.marathonReplay"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
      >
        Restart
      </button>
      <button
        v-if="baseStore.playgroundMode && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="doRenew"
      >
        Renew
      </button>
      <button
        v-if="baseStore.playgroundMode && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="addScramble"
      >
        Add
      </button>
      <button
        v-if="baseStore.registered && baseStore.playgroundMode && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="showScrambleList"
      >
        List
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
        v-if="!(baseStore.replayMode || baseStore.playgroundMode)"
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.paused"
        @click="showConfigModal"
      >
        Config
      </button>
      <button
        v-if="baseStore.replayMode && !baseStore.marathonReplay"
        type="button"
        class="tool-button"
        @click="doWalk"
      >
        {{ baseStore.inReplay ? 'Stop' : 'Walk' }}
      </button>
      <div v-if="baseStore.replayMode && !baseStore.playgroundMode && !baseStore.marathonReplay" class="speed-buttons">
        <button
          type="button"
          class="tool-button"
          :class="{ 'black bold': !baseStore.fastWalkMode }"
          :disabled="baseStore.inReplay"
          @click="setWalkMode(false)"
        >
          s
        </button>
        <button
          type="button"
          class="tool-button"
          :class="{ 'black bold': baseStore.fastWalkMode }"
          :disabled="baseStore.inReplay"
          @click="setWalkMode(true)"
        >
          f
        </button>
      </div>
      <button
        v-if="baseStore.replayMode && !baseStore.marathonReplay"
        type="button"
        class="tool-button"
        :disabled="baseStore.inReplay"
        @click="doReplay()"
      >
        Replay
      </button>
      <button
        v-if="baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="doTryToImprove"
      >
        Try It
      </button>
      <button
        v-if="!baseStore.playgroundMode"
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
        v-if="(baseStore.replayMode || baseStore.playgroundMode) &&
          !baseStore.sharedPlaygroundMode && !baseStore.marathonReplay"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
      >
        Restart
      </button>
      <button
        v-if="baseStore.playgroundMode && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="doRenew"
      >
        Renew
      </button>
      <button
        v-if="baseStore.playgroundMode && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="addScramble"
      >
        Add
      </button>
      <button
        v-if="baseStore.registered && baseStore.playgroundMode && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="showScrambleList"
      >
        List
      </button>
      <button
        v-if="baseStore.replayMode && !baseStore.marathonReplay"
        type="button"
        class="tool-button"
        @click="doWalk"
      >
        {{ baseStore.inReplay ? 'Stop' : 'Walk' }}
      </button>
      <div v-if="baseStore.replayMode && !baseStore.playgroundMode && !baseStore.marathonReplay" class="speed-buttons">
        <button
          type="button"
          class="tool-button"
          :class="{ 'black bold': !baseStore.fastWalkMode }"
          :disabled="baseStore.inReplay"
          @click="setWalkMode(false)"
        >
          s
        </button>
        <button
          type="button"
          class="tool-button"
          :class="{ 'black bold': baseStore.fastWalkMode }"
          :disabled="baseStore.inReplay"
          @click="setWalkMode(true)"
        >
          f
        </button>
      </div>
      <button
        v-if="baseStore.replayMode && !baseStore.marathonReplay"
        type="button"
        class="tool-button"
        :disabled="baseStore.inReplay"
        @click="doReplay()"
      >
        Replay
      </button>
      <button
        v-if="!(baseStore.replayMode || baseStore.playgroundMode) && !baseStore.clearDisplay"
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.paused"
        @click="showConfigModal"
      >
        Config
      </button>
      <button
        v-if="!(baseStore.replayMode || baseStore.playgroundMode) && !baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button mobile"
        :disabled="disableButton || baseStore.paused"
        @click="doRestart('fromMain')"
      >
        Restart
      </button>
      <button
        v-if="baseStore.sharedPlaygroundMode"
        type="button"
        class="tool-button"
        :disabled="disableButton || baseStore.inReplay"
        @click="doTryToImprove"
      >
        Try It
      </button>
      <button
        v-if="!baseStore.playgroundMode && !baseStore.clearDisplay"
        type="button"
        class="tool-button"
        :disabled="disableButton || disableDuringMarathon || baseStore.inReplay"
        @click="showAboutModal"
      >
        About
      </button>
    </div>
  </div>
  <ConfigModal v-if="baseStore.showConfig" @close="closeConfigModal" />
  <InfoModal v-if="baseStore.showInfo" @close="closeAboutModal" />
  <ImageGallery v-if="baseStore.showImageGallery" @close="closeImageGallery" />
  <AddScramble v-if="baseStore.showAddScramble" @set="setScramble" @close="closeAddScramble" />
  <ScrambleList v-if="baseStore.showScrambleList" @set="setScramble" @close="closeScrambleList" />
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
.black {
  color: black;
}
.bold {
  font-weight: 600;
}
@media screen and (max-width: 820px) {
.action-panel .first-row {
  justify-content: space-around;
  align-items: center;
  gap: 5px;
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
