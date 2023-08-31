import { computed, watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useDocumentVisibility } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { type GameData } from '../stores/const';
import { usePostFetchAPI } from '../composables/useFetchAPI';

export const useWatchGameState = () => {
  const baseStore = useBaseStore();

  const visibility = useDocumentVisibility();
  watch(visibility, (value) => {
    if (!baseStore.proMode && value === 'hidden' && baseStore.time > 0 && !baseStore.isDone) {
      baseStore.paused = true;
      baseStore.saveTime();
    }
  });

  const errorMsg = ref('');
  const isFetching = ref(false);
  const postGame = (game: GameData): void => {
    errorMsg.value = '';
    if (isFetching.value) {
      return;
    }
    isFetching.value = true;

    usePostFetchAPI('game', JSON.stringify({ game }) as BodyInit, baseStore.token as (string | undefined))
      .then(() => {
        isFetching.value = false;
      })
      .catch(error => {
        errorMsg.value = error as string;
        if (String(errorMsg.value).toLowerCase().includes('networkerror')) {
          baseStore.isNetworkError = true;
        }
        isFetching.value = false;
      });
  };

  const isDoneAll = computed(() => {
    return baseStore.isDone;
  });
  const setRecords = (puzzleType: string): void => {
    if (baseStore.movesRecord === 0 || baseStore.movesCount <= baseStore.movesRecord) {
      baseStore.setMovesRecord(baseStore.movesCount, baseStore.time,
        baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.timeRecord === 0 || baseStore.time <= baseStore.timeRecord) {
      baseStore.setTimeRecord(baseStore.time, baseStore.movesCount,
        baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.token) {
      postGame({
        time: baseStore.time,
        moves: baseStore.movesCount,
        puzzle_size: baseStore.numLines,
        puzzle_type: puzzleType,
        control_type: baseStore.getControlTypeStr
      });
    }
  };
  watch(isDoneAll, (value) => {
    if (value) {
      if (baseStore.marathonMode) {
        baseStore.solvedPuzzlesInMarathon += 1;
        if (baseStore.solvedPuzzlesInMarathon === 5) {
          baseStore.stopInterval();
          setRecords(baseStore.cageMode ? 'cage_marathon' : 'marathon');
          if (!baseStore.disableWinMessage) {
            baseStore.showWinModal = true;
          }
        } else {
          baseStore.renewPuzzle();
        }
      } else {
        baseStore.stopInterval();
        setRecords(baseStore.cageMode ? 'cage_standard' : 'standard');
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
        if (baseStore.enableCageMode) {
          baseStore.doPrepareCageMode();
        }
        baseStore.initStore();
        baseStore.cageCompleteImgLoaded = false;
        baseStore.processingReInit = false;
      }, 200);
    }
  }, { immediate: true, flush: 'post' });
};
