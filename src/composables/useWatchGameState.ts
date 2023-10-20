import { computed, watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { type GameData, type AverageStats, type WasAvgRecord, type UserScrambleData } from '@/types';
import { usePostFetchAPI, usePatchFetchAPI } from '../composables/useFetchAPI';

export const useWatchGameState = (): void => {
  const baseStore = useBaseStore();

  const errorMsg = ref('');
  const isFetching = ref(false);
  const postGame = (game: GameData, keyH: string): void => {
    errorMsg.value = '';
    if (isFetching.value) {
      return;
    }
    isFetching.value = true;
    usePostFetchAPI('game', JSON.stringify({ game }) as BodyInit, baseStore.token, keyH)
      .then((res) => {
        if (!baseStore.marathonMode) {
          baseStore.lastGameID = res.game_id ?? 0;
        }
        if (baseStore.proMode) {
          baseStore.setCurrentAverages(res.stats as unknown as AverageStats);
          baseStore.setWasAvgRecords(res.was_avg_records as unknown as WasAvgRecord[]);
        }
        isFetching.value = false;
      })
      .catch(error => {
        errorMsg.value = error as string;
        isFetching.value = false;
      });
  };

  const postUserScramble = (user_scramble: UserScrambleData): void => {
    errorMsg.value = '';
    if (isFetching.value) {
      return;
    }
    isFetching.value = true;
    usePostFetchAPI('user_scramble', JSON.stringify({ user_scramble }) as BodyInit, baseStore.token)
      .then((res) => {
        baseStore.userScrambleId = res.user_scramble_id!;
        isFetching.value = false;
      })
      .catch(error => {
        errorMsg.value = error as string;
        isFetching.value = false;
      });
  };

  const patchUserScramble = (user_scramble: UserScrambleData): void => {
    errorMsg.value = '';
    if (isFetching.value) {
      return;
    }
    isFetching.value = true;
    usePatchFetchAPI('user_scramble', JSON.stringify({ user_scramble }) as BodyInit, baseStore.token)
      .then((_res) => {
        isFetching.value = false;
      })
      .catch(error => {
        errorMsg.value = error as string;
        isFetching.value = false;
      });
  };

  const isDoneAll = computed(() => {
    return baseStore.isDone;
  });
  const setRecords = (puzzleType: string): void => {
    let time = 0;
    if (baseStore.time === 0) {
      time = 1;
    } else {
      time = baseStore.time;
    }
    if (baseStore.movesRecord === 0 || baseStore.movesCount <= baseStore.movesRecord) {
      baseStore.setMovesRecord(baseStore.movesCount, time,
        baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.timeRecord === 0 || time <= baseStore.timeRecord) {
      baseStore.setTimeRecord(time, baseStore.movesCount,
        baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.token != null) {
      let scramble;
      let solvePath;
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
        let time = 0;
        if (baseStore.time === 0) {
          time = 1;
        } else {
          time = baseStore.time;
        }
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
            postUserScramble({
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
                user_name: baseStore.userName,
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
