<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useAppEventBus } from '../composables/useAppEventBus';
import { ControlTypeReverseMap, baseUrl, ControlType } from '@/const';
import { sleep, createLinkAndClick } from '@/utils';
import { useBaseStore } from '../stores/base';

import { useLazyComponent } from '../composables/useLazyComponent';
import { useModalPause } from '../composables/useModalPause';
import { useWindowWidth } from '../composables/useWindowWidth';
const ConfigModal = useLazyComponent(() => import('./ConfigModal.vue'));
const InfoModal = useLazyComponent(() => import('./InfoModal.vue'));
const ImageGallery = useLazyComponent(() => import('./ImageGallery.vue'));
const AddScramble = useLazyComponent(() => import('./AddScramble.vue'));
const ScrambleList = useLazyComponent(() => import('./ScrambleList.vue'));

const baseStore = useBaseStore();
const windowWidth = useWindowWidth();

const aboutModalPause = useModalPause();
const configModalPause = useModalPause();
const imageGalleryPause = useModalPause();
const addScramblePause = useModalPause();
const scrambleListPause = useModalPause();
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
  aboutModalPause.open();
  baseStore.showInfo = true;
};
const closeAboutModal = (): void => {
  baseStore.showInfo = false;
  aboutModalPause.close();
};
const showConfigModal = (): void => {
  configModalPause.open();
  baseStore.showConfig = true;
};
const closeConfigModal = (): void => {
  baseStore.showConfig = false;
  configModalPause.close();
};
const showImageGallery = (): void => {
  imageGalleryPause.open();
  baseStore.showImageGallery = true;
};
const closeImageGallery = (): void => {
  baseStore.showImageGallery = false;
  imageGalleryPause.close();
};
const doReplay = async (walkTime?: number, walkMode = false): Promise<void> => {
  if (!walkMode) {
    doRestart('fromMain');
    await sleep(100);
    savedStep.value = 0;
  }
  baseStore.inReplay = true;

  const control = ControlTypeReverseMap.get(baseStore.repGame.control_type[0]) ?? ControlType.Mouse;
  const moveTime = (walkTime ?? Math.round(baseStore.repGame.time / baseStore.repGame.moves)) || 0;
  baseStore.replaySpeed = moveTime;

  for (let i = savedStep.value; i < baseStore.repGame.solve_path.length; i++) {
    baseStore.wasReplay = true;
    const move = baseStore.repGame.solve_path[i];
    if (move === ';' && (baseStore.inReplay || stopWalk.value)) {
      await showNextMarathonPuzzle(moveTime);
      continue;
    }
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
const showNextMarathonPuzzle = async (moveTime: number): Promise<void> => {
  baseStore.replaySpeed = 0;
  baseStore.nextMarathonReplayPuzzle();
  await sleep(moveTime);
  baseStore.replaySpeed = moveTime;
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
  addScramblePause.open();
  baseStore.showAddScramble = true;
};

const eventBus = useAppEventBus();
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

const closeScrambleList = (): void => {
  baseStore.showScrambleList = false;
  scrambleListPause.close();
};
const closeAddScramble = (): void => {
  baseStore.showAddScramble = false;
  addScramblePause.close();
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
  scrambleListPause.open();
  baseStore.showScrambleList = true;
};
const setWalkMode = (fastWalkMode: boolean): void => {
  baseStore.fastWalkMode = fastWalkMode;
  localStorage.setItem('fastWalkMode', baseStore.fastWalkMode.toString());
};
interface PanelButton {
  key: string;
  label: string;
  show: boolean;
  disabled: boolean;
  cssClass?: string;
  speed?: boolean;
  onClick?: () => void;
}

const isMobile = computed(() => windowWidth.value < 820);

const buttonsByKey = computed((): Record<string, PanelButton> => {
  const inReplayOrPlayground = baseStore.replayMode || baseStore.playgroundMode;
  const isPlayground = baseStore.playgroundMode && !baseStore.sharedPlaygroundMode;
  const isReplay = baseStore.replayMode;
  const busy = disableButton.value || baseStore.inReplay;
  const restartDisabled = disableButton.value || baseStore.paused || baseStore.noPlayMode;
  const restartOnClick = (): void => { doRestart('fromMain') };

  return {
    restart: {
      key: 'restart',
      label: 'Restart',
      show: !baseStore.sharedPlaygroundMode && (!isMobile.value || inReplayOrPlayground),
      disabled: restartDisabled,
      onClick: restartOnClick
    },
    renew: { key: 'renew', label: 'Renew', show: isPlayground, disabled: busy, onClick: doRenew },
    add: { key: 'add', label: 'Add', show: isPlayground, disabled: busy, onClick: addScramble },
    list: {
      key: 'list', label: 'List', show: baseStore.registered && isPlayground, disabled: busy, onClick: showScrambleList
    },
    pause: {
      key: 'pause',
      label: baseStore.paused && !baseStore.showModal ? 'Resume' : 'Pause',
      show: !baseStore.proMode,
      disabled: disableButton.value || baseStore.disableDuringMarathon || !baseStore.doneFirstMove ||
        baseStore.isDone || baseStore.proMode,
      onClick: () => { baseStore.invertPaused() }
    },
    config: {
      key: 'config',
      label: 'Config',
      show: !inReplayOrPlayground && (!isMobile.value || !baseStore.clearDisplay),
      disabled: disableButton.value || baseStore.disableDuringMarathon || baseStore.paused,
      onClick: showConfigModal
    },
    walk: {
      key: 'walk',
      label: baseStore.inReplay ? 'Stop' : 'Walk',
      show: isReplay,
      disabled: false,
      onClick: () => { void doWalk() }
    },
    speed: {
      key: 'speed', label: '', show: isReplay && !baseStore.playgroundMode, disabled: false, speed: true
    },
    replay: {
      key: 'replay', label: 'Replay', show: isReplay, disabled: baseStore.inReplay, onClick: () => { void doReplay() }
    },
    'restart-mobile': {
      key: 'restart-mobile',
      label: 'Restart',
      show: !inReplayOrPlayground && !baseStore.sharedPlaygroundMode,
      disabled: restartDisabled,
      cssClass: 'mobile',
      onClick: restartOnClick
    },
    'try-it': {
      key: 'try-it', label: 'Try It', show: baseStore.sharedPlaygroundMode, disabled: busy, onClick: doTryToImprove
    },
    about: {
      key: 'about',
      label: 'About',
      show: !baseStore.playgroundMode && (!isMobile.value || !baseStore.clearDisplay),
      disabled: disableButton.value || baseStore.disableDuringMarathon || baseStore.inReplay,
      onClick: showAboutModal
    }
  };
});

const DESKTOP_ORDER = ['restart', 'renew', 'add', 'list', 'pause', 'config', 'walk', 'speed', 'replay', 'try-it', 'about'];
const MOBILE_ORDER = ['restart', 'renew', 'add', 'list', 'walk', 'speed', 'replay', 'config', 'restart-mobile', 'try-it', 'about'];

const panelButtons = computed((): PanelButton[] => {
  const order = isMobile.value ? MOBILE_ORDER : DESKTOP_ORDER;
  return order.map((key) => buttonsByKey.value[key]).filter((button) => button.show);
});

const handleEvent = (event: string, payload: unknown): void => {
  listener(event, String(payload)).catch((error: unknown) => { console.log(error) });
};
onMounted(() => {
  eventBus.on(handleEvent);
});
onUnmounted(() => {
  eventBus.off(handleEvent);
});
</script>

<template>
  <div class="action-panel">
    <div class="first-row">
      <template v-for="item in panelButtons" :key="item.key">
        <div v-if="item.speed" class="speed-buttons">
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
          v-else
          type="button"
          class="tool-button"
          :class="item.cssClass"
          :disabled="item.disabled"
          @click="item.onClick"
        >
          {{ item.label }}
        </button>
      </template>
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
  font-family: var(--font-mono);
  font-kerning: none;
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
