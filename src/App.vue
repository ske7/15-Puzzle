<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBaseStore } from './stores/base';
import { useKeyDown } from './composables/useKeyDown';
import { useTheme } from './composables/useTheme';
import { usePrepare } from './composables/usePrepare';
import { useWatchGameState } from './composables/useWatchGameState';
import { useLazyComponent } from './composables/useLazyComponent';
import { provideWindowWidth } from './composables/useWindowWidth';
import { provideBoardRoom } from './composables/useBoardRoom';
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
const wrapper = ref<HTMLElement>();
provideBoardRoom(wrapper, () => baseStore.runInProgress ||
  (baseStore.doneFirstMove && !baseStore.isDone && !baseStore.isTimeFailed));
const gameRunning = computed(() => baseStore.runInProgress ||
  (baseStore.doneFirstMove && !baseStore.isDone && !baseStore.isTimeFailed && !baseStore.paused));
watch(gameRunning, (running) => {
  if (running) {
    getSelection()?.removeAllRanges();
  }
});
</script>

<template>
  <div
    v-if="baseStore.puzzleLoaded"
    ref="wrapper"
    class="wrapper"
    :class="{ 'game-running': gameRunning }"
  >
    <div class="header">
      <h1>15 Puzzle Online</h1>
      <img
        src="./assets/cage.webp"
        alt="Nic.Cage"
        width="32"
        height="32"
        draggable="false"
      >
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
.game-running {
  -webkit-user-select: none;
  user-select: none;
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
@media screen and (max-width: 420px) {
  .header {
    margin-top: 10px;
  }
  .header h1 {
    font-size: 27px;
    line-height: 27px;
  }
}
@media screen and (max-width: 480px) and (max-height: 700px) {
  .header {
    margin-top: 6px;
    margin-bottom: 6px;
  }
  .header h1 {
    font-size: 24px;
    line-height: 24px;
  }
  .header img {
    width: 26px;
    height: 26px;
  }
}
</style>
