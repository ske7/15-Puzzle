import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { postGame, postUserScramble, patchUserScramble } from '../composables/useFetching';

export const useWatchGameState = (): void => {
  const baseStore = useBaseStore();

  const isDoneAll = computed(() => {
    return baseStore.isDone;
  });
  const setRecords = (puzzleType: string): void => {
    const time = baseStore.getTime;
    if (baseStore.movesRecord === 0 || baseStore.movesCount <= baseStore.movesRecord) {
      baseStore.setMovesRecord(baseStore.movesCount, time,
        baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.timeRecord === 0 || time <= baseStore.timeRecord) {
      baseStore.setTimeRecord(time, baseStore.movesCount,
        baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.token != null) {
      let scramble = undefined as unknown as string;
      let solvePath = undefined as unknown as string;
      if (!baseStore.marathonMode) {
        scramble = baseStore.mixedOrders.join(',');
        solvePath = baseStore.solvePath.join('');
      }
      const keyH = String(time + baseStore.movesCount * import.meta.env.VITE_GAME_KEY);
      postGame({
        user_name: baseStore.userName,
        time,
        moves: baseStore.movesCount,
        puzzle_size: baseStore.numLines,
        puzzle_type: puzzleType,
        control_type: baseStore.getControlTypeStr,
        consecutive_solves: baseStore.consecutiveSolves,
        scramble,
        solve_path: solvePath
      }, keyH);
    }
  };
  watch(isDoneAll, (value) => {
    if (value) {
      if (baseStore.replayMode || baseStore.playgroundMode) {
        const time = baseStore.getTime;
        if (baseStore.playgroundBestTime === 0 || time < baseStore.playgroundBestTime) {
          baseStore.playgroundBestTime = time;
          baseStore.playgroundBestTimeMoves = baseStore.movesCount;
          baseStore.newPlaygroundTimeRecord = true;
        }
        if (baseStore.playgroundBestMoves === 0 || baseStore.movesCount < baseStore.playgroundBestMoves) {
          baseStore.playgroundBestMoves = baseStore.movesCount;
          baseStore.playgroundSolvePath = baseStore.solvePath;
          baseStore.newPlaygroundMovesRecord = true;
        }
        if (baseStore.token != null && baseStore.playgroundMode) {
          if (baseStore.userScrambleId === 0) {
            void postUserScramble({
              user_name: baseStore.userName,
              puzzle_size: baseStore.numLines,
              best_time: baseStore.playgroundBestTime,
              best_moves: baseStore.playgroundBestMoves,
              best_time_moves: baseStore.playgroundBestTimeMoves,
              solve_path: baseStore.playgroundSolvePath.join(''),
              scramble: baseStore.mixedOrders.join(',')
            });
          } else {
            if (baseStore.newPlaygroundTimeRecord || baseStore.newPlaygroundMovesRecord) {
              patchUserScramble({
                id: baseStore.userScrambleId,
                best_time: baseStore.playgroundBestTime,
                best_time_moves: baseStore.playgroundBestTimeMoves,
                best_moves: baseStore.playgroundBestMoves,
                solve_path: baseStore.playgroundSolvePath.join('')
              });
            }
          }
        }
        baseStore.stopInterval();
        return;
      }
      if (baseStore.marathonMode) {
        baseStore.solvedPuzzlesInMarathon += 1;
        if (baseStore.solvedPuzzlesInMarathon === 5) {
          baseStore.stopInterval();
          baseStore.incConsecutiveSolves();
          setRecords('marathon');
          if (!baseStore.disableWinMessage) {
            baseStore.showWinModal = true;
          }
        } else {
          baseStore.renewPuzzle();
        }
      } else {
        baseStore.stopInterval();
        baseStore.incConsecutiveSolves();
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
