import { watch } from 'vue';
import { useBaseStore } from '../stores/base';
import { postGame, postUserScramble, patchUserScramble } from './useFetching';
import { FMC_BLITZ_TIME } from '@/const';
import { type FMCBlitzData, type PuzzleType } from '@/types';
import { get_key_h } from '@/utils_x';

export function useWatchGameState(): void {
  const baseStore = useBaseStore();

  watch(() => baseStore.isDone, (isDone) => {
    if (isDone) {
      onSolved();
    }
  }, { immediate: true });

  watch(() => baseStore.doResetList, (doResetList) => {
    if (doResetList) {
      reinitAfterReset();
    }
  }, { immediate: true, flush: 'post' });

  watch(() => baseStore.blitzTime, (value, oldValue) => {
    if (oldValue > 0 && value <= 0 && baseStore.time > 0) {
      baseStore.stopInterval();
      baseStore.stopBlitzInterval();
      baseStore.isTimeFailed = true;
    }
  });

  function onSolved(): void {
    if (baseStore.replayMode || baseStore.playgroundMode) {
      finishPlaygroundOrReplay();
    } else if (baseStore.marathonMode) {
      finishMarathonPuzzle();
    } else if (baseStore.fmcBlitz) {
      finishBlitzScramble();
    } else {
      finishSingle();
    }
  }

  function finishSingle(): void {
    countSolve();
    saveSolve(baseStore.cageMode ? 'cage_standard' : 'standard');
    if (baseStore.cageMode) {
      baseStore.setUnlockedCages();
    }
    showWinMessage();
  }

  function finishMarathonPuzzle(): void {
    baseStore.solvedPuzzlesInMarathon += 1;
    baseStore.marathonScrambles = `${baseStore.marathonScrambles}${baseStore.mixedOrders.join(',')};`;
    baseStore.marathonSolves = `${baseStore.marathonSolves}${baseStore.solvePath.join('')};`;
    if (baseStore.solvedPuzzlesInMarathon === 5) {
      countSolve();
      saveSolve('marathon');
      showWinMessage();
    } else {
      baseStore.solvePath = [];
      baseStore.marathonFirstMove = false;
      baseStore.renewPuzzle();
    }
  }

  function finishBlitzScramble(): void {
    baseStore.solvedPuzzlesInMarathon += 1;
    baseStore.blitzMovesCount += baseStore.movesCount;
    countSolve();
    const finishedRun = baseStore.solvedPuzzlesInMarathon === baseStore.blitzScrambleCount;
    const blitzTimeUsed = FMC_BLITZ_TIME * 1000 - baseStore.blitzTime;
    saveSolve('standard', finishedRun
      ? { moves: baseStore.blitzMovesCount, time: blitzTimeUsed, session_id: String(baseStore.sessionId) }
      : undefined);
    if (finishedRun) {
      if (baseStore.fmcBlitzMovesRecord === 0 || baseStore.blitzMovesCount < baseStore.fmcBlitzMovesRecord) {
        baseStore.setFMCBlitzRecord(baseStore.blitzMovesCount, blitzTimeUsed, baseStore.numLines);
      }
      baseStore.stopBlitzInterval();
    } else {
      baseStore.marathonFirstMove = false;
      baseStore.renewPuzzle();
    }
  }

  function finishPlaygroundOrReplay(): void {
    if (hasNextMarathonReplayPuzzle()) {
      if (!baseStore.inReplay) {
        baseStore.nextMarathonReplayPuzzle();
      }
      return;
    }
    baseStore.stopInterval();
    updatePlaygroundBests(baseStore.getTime);
    if (baseStore.token != null && baseStore.playgroundMode) {
      saveUserScramble();
    }
  }

  function hasNextMarathonReplayPuzzle(): boolean {
    return baseStore.marathonReplay &&
      baseStore.solvedPuzzlesInMarathon < baseStore.repGame.scramble.split(';').length - 1;
  }

  function countSolve(): void {
    baseStore.stopInterval();
    baseStore.incConsecutiveSolves();
    baseStore.setSessionId();
  }

  function showWinMessage(): void {
    if (!baseStore.disableWinMessage) {
      baseStore.showWinModal = true;
    }
  }

  function saveSolve(puzzleType: PuzzleType, blitzResult?: FMCBlitzData): void {
    const time = baseStore.getTime;
    updatePersonalRecords(time);
    if (baseStore.token != null) {
      postSolvedGame(puzzleType, time, blitzResult);
    }
  }

  function updatePersonalRecords(time: number): void {
    if (baseStore.movesRecord === 0 || baseStore.movesCount <= baseStore.movesRecord) {
      baseStore.setMovesRecord(baseStore.movesCount, time, baseStore.numLines, baseStore.marathonMode);
    }
    if (baseStore.timeRecord === 0 || time <= baseStore.timeRecord) {
      baseStore.setTimeRecord(time, baseStore.movesCount, baseStore.numLines, baseStore.marathonMode);
    }
  }

  function postSolvedGame(puzzleType: PuzzleType, time: number, blitzResult?: FMCBlitzData): void {
    const [scramble, solvePath] = baseStore.marathonMode
      ? [baseStore.marathonScrambles.slice(0, -1), baseStore.marathonSolves.slice(0, -1)]
      : [baseStore.mixedOrders.join(','), baseStore.solvePath.join('')];
    const keyH = get_key_h(time, baseStore.movesCount);
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
      gt_id: baseStore.g1000Mode ? baseStore.consecutiveSolves - 1 : null,
      session_id: baseStore.sessionId
    }, keyH, blitzResult);
  }

  function updatePlaygroundBests(time: number): void {
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
  }

  function saveUserScramble(): void {
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

  function reinitAfterReset(): void {
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
}
