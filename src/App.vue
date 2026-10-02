<script setup lang="ts">
import { useBaseStore } from './stores/base';
import { useKeyDown } from './composables/useKeyDown';
import { useTheme } from './composables/useTheme';
import { usePrepare } from './composables/usePrepare';
import { useWatchGameState } from './composables/useWatchGameState';
import { useLazyComponent } from './composables/useLazyComponent';
import { provideWindowWidth } from './composables/useWindowWidth';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomInfoPanel from './components/BottomInfoPanel.vue';
import ActionPanel from './components/ActionPanel.vue';
const AveragesPanel = useLazyComponent(() => import('./components/AveragesPanel.vue'));
const WinModal = useLazyComponent(() => import('./components/WinModal.vue'));

const baseStore = useBaseStore();
useKeyDown();
useTheme();
usePrepare();
useWatchGameState();

provideWindowWidth();
const touchMove = (e: TouchEvent): void => {
  e.preventDefault();
};
const toggleClearDisplay = (): void => {
  baseStore.clearDisplay = !baseStore.clearDisplay;
  if (baseStore.clearDisplay) {
    document.documentElement.addEventListener('touchmove', touchMove, { passive: false });
  } else {
    document.documentElement.removeEventListener('touchmove', touchMove);
  }
};
</script>

<template>
  <div v-if="baseStore.puzzleLoaded" class="wrapper">
    <div v-show="!baseStore.clearDisplay" class="header">
      <h1>15 Puzzle Online</h1>
      <img
        src="./assets/cage.webp"
        alt="Nic.Cage"
        width="32"
        height="32"
        draggable="false"
      >
    </div>
    <div
      v-show="!baseStore.replayMode && !baseStore.playgroundMode"
      class="clear-field"
      @click="toggleClearDisplay"
    >
      {{ baseStore.clearDisplay ? '&#128316;' : '&#128317;' }}
    </div>
    <AveragesPanel />
    <TopInfoPanel />
    <Board />
    <ActionPanel />
    <BottomInfoPanel />
    <WinModal
      v-if="baseStore.isDone && baseStore.afterDoneAnimationEnd && baseStore.showWinModal"
      @close="baseStore.showWinModal = false"
    />
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin-top: -10px;
}
@media (min-height: 800px), screen and (max-width: 820px) {
  .wrapper {
    align-content: center;
    margin-top: -10%;
  }
}
@media (max-height: 720px) {
  .wrapper {
    margin-top: 0;
  }
}
.header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 5px;
  margin-bottom: 10px;
  width: 100%;
  gap: 10px;
}
.header h1 {
  display: flex;
  justify-content: center;
  font-size: 32px;
  align-items: center;
  line-height: 32px;
  font-weight: 500;
}
.header img {
  display: flex;
  align-items: center;
  border-radius: 8px;
}
.header img[alt] {
  font-size: 15px;
}
.clear-field {
  position: absolute;
  width: 25px;
  height: 25px;
  opacity: 0.7;
  top: 10px;
  right: 10px;
  justify-content: center;
  align-items: center;
  display: flex;
  cursor: pointer;
}
.clear-field:active, .clear-field:hover {
  opacity: 1;
}
@media screen and (min-width: 601px) {
  .clear-field {
    display: none;
  }
}
@media screen and (max-width: 420px) {
  .header {
    margin-top: 10px;
  }
  .header h1 {
    font-size: 27px;
    line-height: 27px;
  }
}
</style>
