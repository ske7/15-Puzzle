<script setup lang="ts">
import { computed, watch, defineAsyncComponent } from 'vue';
import { useWindowSize, useDocumentVisibility } from '@vueuse/core';
import { useBaseStore } from './stores/base';
import Board from './components/Board.vue';
import TopInfoPanel from './components/TopInfoPanel.vue';
import BottomToolsPanel from './components/BottomToolsPanel.vue';
import { CORE_NUM, isPuzzleCore, type puzzleCores } from './stores/const';
const WinModal = defineAsyncComponent({
  loader: async () => import('./components/WinModal.vue'),
  delay: 150
});

const baseStore = useBaseStore();

if (location.href.toLowerCase().includes('pro')) {
  baseStore.proMode = true;
  baseStore.proPalette = true;
  localStorage.setItem('proMode', 'true');
  localStorage.setItem('fasterSliding', 'true');
  localStorage.setItem('proPalette', 'true');
}
if (location.href.toLowerCase().includes('dark')) {
  baseStore.darkMode = true;
  localStorage.setItem('darkMode', 'true');
}

const { width: windowWidth } = useWindowSize();
const visibility = useDocumentVisibility();
document.documentElement.setAttribute('data-theme', baseStore.darkMode ? 'dark' : 'light');
const numLines = localStorage.getItem('numLines');
if (numLines === null || isNaN(Number(numLines)) || !isPuzzleCore(Number(numLines))) {
  baseStore.numLines = CORE_NUM;
} else {
  baseStore.numLines = Number(numLines) as puzzleCores;
}

const isDoneAll = computed(() => {
  return baseStore.isDone;
});

const squareSize = computed(() => {
  const spaces = baseStore.spaceBetween * 5;
  let cageAdd = 0;
  if (baseStore.cageMode) {
    cageAdd = 10;
  }
  if (baseStore.proMode) {
    cageAdd = 20;
    if (baseStore.proPalette) {
      cageAdd = 22;
    }
  }
  if (baseStore.numLines === 3) {
    cageAdd += 28;
  }
  if (baseStore.numLines === 5) {
    cageAdd -= 10;
  }
  let value = 0;
  if (windowWidth.value <= 370) {
    if (baseStore.cageMode) {
      value = Math.floor((windowWidth.value - (spaces + 60)) / baseStore.numLines);
    } else {
      value = Math.floor((windowWidth.value - (spaces + 40)) / baseStore.numLines);
    }
    value = Math.floor((windowWidth.value - (spaces + 40)) / baseStore.numLines);
  } else if (windowWidth.value <= 480) {
    value = Math.floor((windowWidth.value - (spaces + 60)) / baseStore.numLines);
  } else if (windowWidth.value <= 820 && windowWidth.value >= 600) {
    value = 100 + cageAdd;
  } else {
    value = 80 + cageAdd;
  }
  return value;
});

const cageImgSize = computed(() => {
  if (windowWidth.value <= 420) {
    return 36;
  }
  return 48;
});

watch(visibility, (value) => {
  if (!baseStore.proMode && value === 'hidden' && baseStore.time > 0 && !baseStore.isDone) {
    baseStore.paused = true;
    baseStore.saveTime();
  }
});

const setRecords = (): void => {
  if (baseStore.movesRecord === 0 || baseStore.movesCount <= baseStore.movesRecord) {
    baseStore.setMovesRecord(baseStore.movesCount, baseStore.time, baseStore.marathonMode);
  }
  if (baseStore.timeRecord === 0 || baseStore.time <= baseStore.timeRecord) {
    baseStore.setTimeRecord(baseStore.time, baseStore.movesCount, baseStore.marathonMode);
  }
};
watch(isDoneAll, (value) => {
  if (value) {
    if (baseStore.marathonMode) {
      baseStore.solvedPuzzlesInMarathon += 1;
      if (baseStore.solvedPuzzlesInMarathon === 5) {
        baseStore.stopInterval();
        setRecords();
        if (!baseStore.disableWinMessage) {
          baseStore.showWinModal = true;
        }
      } else {
        baseStore.renewPuzzle();
      }
    } else {
      baseStore.stopInterval();
      setRecords();
      if (baseStore.numLines === CORE_NUM && !baseStore.disableCageMode &&
      !baseStore.proMode && baseStore.time > 0 && baseStore.time < 60000) {
        baseStore.eligibleForCageMode = true;
      }
      if (baseStore.cageMode) {
        baseStore.setUnlockedCages();
      }
      if (!baseStore.disableWinMessage) {
        baseStore.showWinModal = true;
      }
    }
  }
}, { immediate: true }
);
</script>

<template>
  <div class="wrapper">
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
    <TopInfoPanel />
    <div class="board-container">
      <Board :square-size="squareSize" />
    </div>
    <BottomToolsPanel :square-size="squareSize" />
    <WinModal
      v-if="baseStore.isDone &&
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
  margin-top: -20px;
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
.board-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  margin-top: 20px;
  margin-bottom: 15px;
  width: 100%;
}
.header h1 {
  display: flex;
  justify-content: center;
  font-size: 40px;
  align-items: center;
  line-height: 48px;
}
.header img {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  border-radius: 8px;
}
@media screen and (max-width: 420px) {
  .header {
    margin-top: 20px;
  }
  .header h1 {
    font-size: 31px;
    line-height: 36px;
  }
  .header img {
    width: 36px;
    height: 36px;
  }
}
</style>
