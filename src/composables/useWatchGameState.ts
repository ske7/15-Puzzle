import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDocumentVisibility } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { CORE_NUM, CAGES_PATH_ARR } from '../stores/const';
import { randArrayItem } from '../utils';

export const useWatchGameState = () => {
  const baseStore = useBaseStore();

  const visibility = useDocumentVisibility();
  watch(visibility, (value) => {
    if (!baseStore.proMode && value === 'hidden' && baseStore.time > 0 && !baseStore.isDone) {
      baseStore.paused = true;
      baseStore.saveTime();
    }
  });

  const isDoneAll = computed(() => {
    return baseStore.isDone;
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
  }, { immediate: true });

  const { doResetList } = storeToRefs(baseStore);
  watch(doResetList, (value) => {
    if (value) {
      baseStore.processingReInit = true;
      setTimeout(() => {
        if (baseStore.cageMode) {
          baseStore.cageMode = false;
        }
        if (baseStore.eligibleForCageMode) {
          baseStore.cageMode = true;
          if (baseStore.unlockedCages.size === baseStore.cagesCount) {
            if (baseStore.shownCages.size === CAGES_PATH_ARR.length) {
              baseStore.shownCages.clear();
            }
            baseStore.cagePath = randArrayItem(CAGES_PATH_ARR, Array.from(baseStore.shownCages));
            baseStore.shownCages.add(baseStore.cagePath);
          } else {
            baseStore.cagePath = randArrayItem(CAGES_PATH_ARR, baseStore.unlockedCagesValues);
          }
          baseStore.eligibleForCageMode = false;
        }
        baseStore.initStore();
        baseStore.cageCompleteImgLoaded = false;
        baseStore.processingReInit = false;
      }, 200);
    }
  }, { immediate: true, flush: 'post' });
};
