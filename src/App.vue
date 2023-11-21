<script setup lang="ts">
import { computed, defineAsyncComponent, type AsyncComponentLoader } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from './stores/base';
import { usePrepare } from './composables/usePrepare';
import { useWatchGameState } from './composables/useWatchGameState';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomInfoPanel from './components/BottomInfoPanel.vue';
import ActionPanel from './components/ActionPanel.vue';
import AveragesPanel from './components/AveragesPanel.vue';
const WinModal = defineAsyncComponent({
  loader: async () => await import('./components/WinModal.vue') as unknown as AsyncComponentLoader,
  delay: 150
});

const baseStore = useBaseStore();
usePrepare();
useWatchGameState();

const { width: windowWidth } = useWindowSize();
const cageImgSize = computed(() => {
  if (windowWidth.value <= 420) {
    return 32;
  }
  return 42;
});
</script>

<template>
  <div v-if="baseStore.puzzleLoaded" class="wrapper">
    <div class="header">
      <h1>15 Puzzle Online</h1>
      <img
        src="./assets/cage.webp"
        alt="Nic.Cage"
        :width="cageImgSize"
        :height="cageImgSize"
        draggable="false"
      >
    </div>
    <AveragesPanel />
    <TopInfoPanel />
    <Board />
    <ActionPanel />
    <BottomInfoPanel />
    <WinModal
      v-if="baseStore.isDone && !baseStore.replayMode &&
        (baseStore.afterDoneAnimationEnd || baseStore.proMode) &&
        baseStore.showWinModal"
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
    padding-top: 0px;
    align-content: center;
    justify-content: center;
    height: 100%;
    margin-top: -10%;
  }
}
@media (max-height: 720px) {
  .wrapper {
    margin-top: 0px;
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
  width: 32px;
  height: 32px;
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
  .header img {
    width: 32px;
    height: 32px;
  }
}
</style>
