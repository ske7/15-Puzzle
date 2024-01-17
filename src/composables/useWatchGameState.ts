import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { postGame, postUserScramble, patchUserScramble, postFMCBlitz } from '../composables/useFetching';
import { FMC_BLITZ_TIME } from '@/const';

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
      let scramble;
      let solvePath;
      if (!baseStore.marathonMode) {
        scramble = baseStore.mixedOrders.join(',');
        solvePath = baseStore.solvePath.join('');
      } else {
        scramble = baseStore.marathonScrambles.slice(0, -1);
        solvePath = baseStore.marathonSolves.slice(0, -1);
      }
      const keyH = String(time + baseStore.movesCount * import.meta.env.VITE_GAME_KEY);
      const gtId = baseStore.g1000Mode ? baseStore.consecutiveSolves - 1 : null;
      postGame({
        user_name: baseStore.userName,
        time,
        moves: baseStore.movesCount,
        puzzle_size: baseStore.numLines,
        puzzle_type: puzzleType,
        control_type: baseStore.getControlTypeStr,
        consecutive_solves: baseStore.consecutiveSolves,
        scramble,
        solve_path: solvePath,
        gt_id: gtId,
        session_id: baseStore.sessionId
      }, keyH);
    }
  };
  const playgroundWatch = (): void => {
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
      } else if (baseStore.newPlaygroundTimeRecord || baseStore.newPlaygroundMovesRecord) {
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
    baseStore.stopInterval();
  };
  const marathonWatch = (): void => {
    baseStore.solvedPuzzlesInMarathon += 1;
    if (baseStore.solvedPuzzlesInMarathon === 5) {
      baseStore.stopInterval();
      baseStore.incConsecutiveSolves();
      baseStore.setSessionId();
      baseStore.marathonScrambles = `${baseStore.marathonScrambles}${baseStore.mixedOrders.join(',')};`;
      baseStore.marathonSolves = `${baseStore.marathonSolves}${baseStore.solvePath.join('')};`;
      setRecords('marathon');
      if (!baseStore.disableWinMessage) {
        baseStore.showWinModal = true;
      }
    } else {
      baseStore.marathonScrambles = `${baseStore.marathonScrambles}${baseStore.mixedOrders.join(',')};`;
      baseStore.marathonSolves = `${baseStore.marathonSolves}${baseStore.solvePath.join('')};`;
      baseStore.solvePath = [];
      baseStore.renewPuzzle();
    }
  };
  const fmcBlitzWatch = (): void => {
    baseStore.solvedPuzzlesInMarathon += 1;
    baseStore.blitzMovesCount += baseStore.movesCount;
    baseStore.stopInterval();
    baseStore.incConsecutiveSolves();
    baseStore.setSessionId();
    setRecords('standard');
    if (baseStore.solvedPuzzlesInMarathon === baseStore.blitzScrambleCount) {
      if (baseStore.fmcBlitzMovesRecord === 0 || baseStore.blitzMovesCount < baseStore.fmcBlitzMovesRecord) {
        baseStore.setFMCBlitzRecord(baseStore.blitzMovesCount, FMC_BLITZ_TIME * 1000 - baseStore.blitzTime,
          baseStore.numLines);
      }
      baseStore.stopBlitzInterval();
      postFMCBlitz({
        moves: baseStore.blitzMovesCount,
        time: FMC_BLITZ_TIME * 1000 - baseStore.blitzTime,
        session_id: String(baseStore.sessionId)
      });
    } else {
      baseStore.renewPuzzle();
    }
  };
  const mainWatch = (): void => {
    baseStore.stopInterval();
    baseStore.incConsecutiveSolves();
    baseStore.setSessionId();
    setRecords(baseStore.cageMode ? 'cage_standard' : 'standard');
    if (baseStore.cageMode) {
      baseStore.setUnlockedCages();
    }
    if (!baseStore.disableWinMessage) {
      baseStore.showWinModal = true;
    }
  };
  watch(isDoneAll, (value) => {
    if (value) {
      if (baseStore.replayMode || baseStore.playgroundMode) {
        playgroundWatch();
      } else if (baseStore.marathonMode) {
        marathonWatch();
      } else if (baseStore.fmcBlitz) {
        fmcBlitzWatch();
      } else {
        mainWatch();
      }
    }
  }, { immediate: true });
  const { doResetList, blitzTime } = storeToRefs(baseStore);
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
  watch(blitzTime, (value) => {
    if (value <= 0) {
      baseStore.stopBlitzInterval();
      baseStore.reset(false);
    }
  });
};
