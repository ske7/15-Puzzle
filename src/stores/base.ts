import { defineStore, acceptHMRUpdate } from 'pinia';
import { useAppEventBus } from '../composables/useAppEventBus';
import { ref, computed, toRaw } from 'vue';

import { SPACE_BETWEEN_SQUARES } from '@/const';
import { type AverageStats } from '@/types';
import { generateAndShuffle, isSolvable, isSorted, calculateMD } from '../utils';

import { useGetFetchAPI } from '../composables/useFetchAPI';
import { useModalState } from './modules/useModalState';
import { useCageState } from './modules/useCageState';
import { useTimerState } from './modules/useTimerState';
import { useRecordsState } from './modules/useRecordsState';
import { useAveragesState } from './modules/useAveragesState';
import { usePuzzleState } from './modules/usePuzzleState';
import { useReplayState } from './modules/useReplayState';
import { usePlaygroundState } from './modules/usePlaygroundState';
import { useMarathonState } from './modules/useMarathonState';
import { usePreferencesState } from './modules/usePreferencesState';
import { useSessionState } from './modules/useSessionState';

export const useBaseStore = defineStore('base', () => {
  const processingReInit = ref(false);
  const proMode = ref(localStorage.getItem('proMode') === 'true');
  const boardPos = ref({ left: 0, top: 0, right: 0, bottom: 0 });
  const isNetworkError = ref(false);
  const lastError = ref('');
  const linkError = ref('');
  const isFetching = ref(false);
  const puzzleLoaded = ref(false);
  const lastGameID = ref('0');
  const g1000Mode = ref(false);
  const clearDisplay = ref(false);
  const noPlayMode = ref(false);

  const preferences = usePreferencesState();
  const marathon = useMarathonState();
  const replay = useReplayState();
  const modals = useModalState();
  const timer = useTimerState();
  const puzzle = usePuzzleState(marathon, lastGameID, timer, noPlayMode, proMode);
  const records = useRecordsState(marathon.marathonMode, puzzle.numLines);
  const session = useSessionState(g1000Mode);
  const averages = useAveragesState(g1000Mode, puzzle.numLines, session.token, session.consecutiveSolves);
  const cage = useCageState(puzzle.arrayLength);
  const playground = usePlaygroundState(session.token, session.userName, puzzle);

  function initStore() {
    setSpaceBetween();
    timer.time.value = 0;
    timer.savedTime.value = 0;
    puzzle.movesCount.value = 0;
    marathon.solvedPuzzlesInMarathon.value = 0;
    records.newMovesRecord.value = false;
    records.newFMCBlitzMovesRecord.value = false;
    records.newTimeRecord.value = false;
    records.newPlaygroundTimeRecord.value = false;
    records.newPlaygroundMovesRecord.value = false;
    records.setRecords();
    puzzle.afterDoneCount.value = 0;
    puzzle.solvePath.value = [];
    lastGameID.value = '0';
    marathon.clearMarathonData();
    renewPuzzle();
    puzzle.doResetList.value = false;
    puzzle.doneFirstMove.value = false;
    marathon.isTimeFailed.value = false;
    if (marathon.fmcBlitz.value) {
      marathon.blitzScrambleCount.value = marathon.getFMCBlitzScrambleCount(puzzle.numLines.value);
      marathon.stopBlitzInterval();
      marathon.blitzTime.value = 0;
      marathon.blitzMovesCount.value = 0;
    }
  }

  function setPuzzleData() {
    puzzle.currentOrders.value = puzzle.mixedOrders.value.slice();
    puzzle.inPlaceCount.value = puzzle.startOrderedCount.value;
    puzzle.doneFirstMove.value = false;
    if (session.canKeepSession.value) {
      session.restoreStoredSession();
      session.clearStoredSession();
    }
  }

  function renewPuzzle() {
    if (g1000Mode.value) {
      void getNextG1000()
        .then((loaded) => {
          if (!loaded) {
            return;
          }
          setPuzzleData();
          puzzle.opt_m.value = 0;
        });
    } else {
      let solvable = mixAndCheckSolvable();
      while (!solvable) {
        solvable = mixAndCheckSolvable();
      }
      if (playground.playgroundMode.value) {
        playground.playgroundModeRenew();
      } else {
        puzzle.opt_m.value = 0;
      }
      setPuzzleData();
    }
  }

  function nextMarathonReplayPuzzle() {
    puzzle.solvePath.value.push(';');
    marathon.solvedPuzzlesInMarathon.value += 1;
    renewPuzzle();
  }

  async function getNextG1000(): Promise<boolean> {
    return await useGetFetchAPI('next_gt', session.token.value)
      .then((res) => {
        if (res.scramble !== undefined) {
          puzzle.mixedOrders.value = res.scramble.split(',').map(Number);
        }
        session.consecutiveSolves.value = res.id ?? 0;
        loadAverages();
        if (res.id === 1000) {
          noPlayMode.value = true;
        }
        return true;
      })
      .catch((error: unknown) => {
        lastError.value = 'Could not load the next puzzle';
        console.log(error);
        return false;
      });
  }

  function mixAndCheckSolvable() {
    if (replay.replayMode.value) {
      let scramble = replay.repGame.value.scramble;
      if (replay.marathonReplay.value) {
        scramble = replay.repGame.value.scramble.split(';')[marathon.solvedPuzzlesInMarathon.value];
      }
      puzzle.mixedOrders.value = scramble.split(',').map(Number);
    } else if (playground.playgroundMode.value && playground.savedOrders.value.length > 0) {
      puzzle.mixedOrders.value = playground.savedOrders.value;
    } else if (playground.playgroundMode.value && playground.savedOrders.value.length === 0) {
      playground.userScrambleId.value = 0;
      playground.publicId.value = '';
      playground.playgroundBestTime.value = 0;
      playground.playgroundBestTimeMoves.value = 0;
      playground.playgroundBestMoves.value = 0;
      playground.playgroundSolvePath.value = [];
      playground.checkUserScrambleInDB.value = true;
      puzzle.mixedOrders.value = generateAndShuffle(puzzle.arrayLength.value);
    } else {
      puzzle.mixedOrders.value = generateAndShuffle(puzzle.arrayLength.value);
    }
    const orders = toRaw(puzzle.mixedOrders.value);
    if (!(replay.replayMode.value || playground.playgroundMode.value) && calculateMD(orders) < puzzle.numLines.value) {
      return false;
    }
    if (isSorted(orders.slice(0, -1))) {
      return false;
    }
    return isSolvable(orders);
  }

  function setSpaceBetween() {
    if (cage.cageMode.value) {
      puzzle.spaceBetween.value = 0;
    } else if (proMode.value) {
      puzzle.spaceBetween.value = 0;
    } else {
      puzzle.spaceBetween.value = SPACE_BETWEEN_SQUARES;
    }
  }

  function reset(configMode: boolean) {
    if (!puzzle.isDone.value && proMode.value) {
      session.clearStoredSession();
      averages.resetConsecutiveSolves();
    }
    timer.stopInterval();
    marathon.stopBlitzInterval();
    if (proMode.value || modals.showConfig.value || configMode) {
      initStore();
      return;
    }
    puzzle.doResetList.value = true;
  }

  function invertPaused() {
    if (modals.showModal.value || cage.cageMode.value && !cage.finishLoadingAllCageImages.value) {
      return;
    }
    timer.paused.value = !timer.paused.value;
    if (timer.paused.value) {
      timer.saveTime();
    }
  }

  function loadAverages(): void {
    if (proMode.value) {
      if (session.canKeepSession.value) {
        session.restoreStoredSession();
      }
      const puzzleType = marathon.marathonMode.value ? 'marathon' : 'standard';
      // eslint-disable-next-line vue/max-len
      void useGetFetchAPI<AverageStats>(`user_averages?puzzle_size=${puzzle.numLines.value}&puzzle_type=${puzzleType}&cs_param=${session.consecutiveSolves.value}&gt1000mode=${g1000Mode.value}&session_id=${session.sessionId.value}`,
        session.token.value)
        .then((res) => {
          averages.setCurrentAverages(res.stats);
        });
    }
  }

  function updateCurrentAverages() {
    if (proMode.value && session.token.value != null) {
      const puzzleType = marathon.marathonMode.value ? 'marathon' : 'standard';
      void useGetFetchAPI<AverageStats>(`user_averages?puzzle_size=${puzzle.numLines.value}&puzzle_type=${puzzleType}&cs_param=0`,
        session.token.value)
        .then((res) => {
          averages.setCurrentAverages(res.stats, true);
          averages.setWasAvgRecords([]);
        });
    }
  }

  function initAfterNewPuzzleSize() {
    const eventBus = useAppEventBus();
    localStorage.setItem('numLines', puzzle.numLines.value.toString());
    if (!playground.playgroundMode.value) {
      updateCurrentAverages();
    }
    session.clearStoredSession();
    averages.resetConsecutiveSolves();
    playground.savedOrders.value = [];
    eventBus.emit('restart', 'fromConfig');
  }

  // The marathon timer keeps running across all five puzzles.
  const runInProgress = computed((): boolean => {
    return (marathon.marathonMode.value && timer.time.value > 0 && !puzzle.isDone.value) ||
      marathon.blitzInterval.value !== 0;
  });

  const cannotClick = computed((): boolean => {
    return modals.showModal.value || runInProgress.value || replay.inReplay.value;
  });

  return {
    ...timer,
    ...puzzle,
    ...records,
    ...cage,
    ...modals,
    ...marathon,
    ...preferences,
    ...session,
    ...averages,
    ...replay,
    ...playground,
    initStore,
    setPuzzleData,
    renewPuzzle,
    nextMarathonReplayPuzzle,
    getNextG1000,
    mixAndCheckSolvable,
    setSpaceBetween,
    reset,
    invertPaused,
    loadAverages,
    updateCurrentAverages,
    initAfterNewPuzzleSize,
    processingReInit,
    proMode,
    boardPos,
    isNetworkError,
    lastError,
    linkError,
    isFetching,
    puzzleLoaded,
    lastGameID,
    g1000Mode,
    clearDisplay,
    noPlayMode,
    runInProgress,
    cannotClick,
  };
});

/* v8 ignore start -- import.meta.hot is only ever set by Vite's real dev server, never in tests */
if (import.meta.hot != null) {
  import.meta.hot.accept(acceptHMRUpdate(useBaseStore, import.meta.hot));
}
/* v8 ignore stop */
