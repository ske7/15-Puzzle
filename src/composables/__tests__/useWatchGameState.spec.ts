import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { FMC_BLITZ_TIME } from '@/const';
import { withSetup } from '../../../tests/withSetup';

// useWatchGameState imports get_key_h from @/utils_x, an obfuscated javascript-obfuscator
// "self-defending" bundle that hijacks console.* as a side effect of merely being imported
// (see vitest.config.ts's coverage exclude comment for utils_x.ts) - mock it so that real
// module is never loaded in-process.
vi.mock('@/utils_x', () => ({
  get_key_h: vi.fn().mockReturnValue('mock-key-h')
}));

// postGame/postUserScramble/patchUserScramble are the real API-calling layer and are
// already covered by useFetching.spec.ts - mock them here so this file can assert *what*
// gets posted without going through fetch.
vi.mock('../useFetching', () => ({
  postGame: vi.fn(),
  postUserScramble: vi.fn(),
  patchUserScramble: vi.fn()
}));

import { useWatchGameState } from '../useWatchGameState';
import { postGame, postUserScramble, patchUserScramble } from '../useFetching';

function mount() {
  const [, unmount] = withSetup(() => useWatchGameState());
  return unmount;
}

// isDone (a store getter) is inPlaceCount === numLines**2 - 1; setting inPlaceCount
// directly after mount reactively triggers the isDoneAll watch, the same technique
// already used in useKeyDown.spec.ts.
function markDone(store: ReturnType<typeof useBaseStore>): void {
  store.numLines = 3;
  store.inPlaceCount = 8;
}

describe('useWatchGameState', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('does nothing while the puzzle is not yet done', () => {
    const store = useBaseStore();
    const unmount = mount();
    store.numLines = 3;
    store.inPlaceCount = 3;
    expect(store.showWinModal).toBe(false);
    expect(store.consecutiveSolves).toBe(0);
    unmount();
  });

  // The clock redraws once per animation frame, so the time on screen can trail the real
  // elapsed time by most of a frame. Frames are stubbed to never run here - the displayed
  // time stays at 0 - so a handler that reads the display instead of stopping the clock
  // first records 1ms, the floor getTime applies to a zero time.
  describe('solve time at completion', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(0);
      vi.stubGlobal('requestAnimationFrame', () => 1);
      vi.stubGlobal('cancelAnimationFrame', () => undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('records the exact elapsed time for a standard solve', async () => {
      const store = useBaseStore();
      const unmount = mount();
      store.restartInterval();
      vi.setSystemTime(12345);

      markDone(store);
      await nextTick();

      expect(store.timeRecord).toBe(12345);
      unmount();
    });

    it('records the exact elapsed time as a playground best', async () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      const unmount = mount();
      store.restartInterval();
      vi.setSystemTime(12345);

      markDone(store);
      await nextTick();

      expect(store.playgroundBestTime).toBe(12345);
      expect(store.interval).toBe(0);
      unmount();
    });
  });

  describe('mainWatch (standard/cage completion)', () => {
    it('stops the interval, counts the solve, and shows the win modal', async () => {
      const store = useBaseStore();
      store.interval = 999;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.interval).toBe(0);
      expect(store.consecutiveSolves).toBe(1);
      expect(store.showWinModal).toBe(true);
      unmount();
    });

    it('does not show the win modal when disableWinMessage is set', async () => {
      const store = useBaseStore();
      store.disableWinMessage = true;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.showWinModal).toBe(false);
      unmount();
    });

    it('unlocks the current cage in cage mode', async () => {
      const store = useBaseStore();
      store.cageMode = true;
      store.cagePath = 'test-cage';
      const unlockSpy = vi.spyOn(store, 'setUnlockedCages');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(unlockSpy).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('posts the completed game with puzzle_type "standard" when a token is present', async () => {
      const store = useBaseStore();
      store.token = 'tok';
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(postGame).toHaveBeenCalledTimes(1);
      expect(vi.mocked(postGame).mock.calls[0][0]).toMatchObject({ puzzle_type: 'standard' });
      unmount();
    });

    it('posts puzzle_type "cage_standard" in cage mode', async () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.cageMode = true;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(vi.mocked(postGame).mock.calls[0][0]).toMatchObject({ puzzle_type: 'cage_standard' });
      unmount();
    });

    it('does not post a game when no token is present', async () => {
      const store = useBaseStore();
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(postGame).not.toHaveBeenCalled();
      unmount();
    });

    it('does not overwrite personal records when the current attempt does not beat them', async () => {
      const store = useBaseStore();
      store.movesRecord = 5;
      store.movesCount = 10;
      store.timeRecord = 1000;
      store.time = 5000;
      const movesSpy = vi.spyOn(store, 'setMovesRecord');
      const timeSpy = vi.spyOn(store, 'setTimeRecord');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(movesSpy).not.toHaveBeenCalled();
      expect(timeSpy).not.toHaveBeenCalled();
      unmount();
    });

    it('passes a g1000 gt_id when g1000Mode is active', async () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.g1000Mode = true;
      store.consecutiveSolves = 2;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(vi.mocked(postGame).mock.calls[0][0]).toMatchObject({ gt_id: 2 });
      unmount();
    });
  });

  describe('marathonWatch (marathon mode)', () => {
    it('advances to the next scramble mid-run', async () => {
      const store = useBaseStore();
      store.marathonMode = true;
      store.solvedPuzzlesInMarathon = 0;
      const renewSpy = vi.spyOn(store, 'renewPuzzle');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.solvedPuzzlesInMarathon).toBe(1);
      expect(store.marathonFirstMove).toBe(false);
      expect(store.solvePath).toEqual([]);
      expect(store.marathonScrambles.endsWith(';')).toBe(true);
      expect(renewSpy).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('finalizes the run and shows the win modal on the 5th solve', async () => {
      const store = useBaseStore();
      store.marathonMode = true;
      store.solvedPuzzlesInMarathon = 4;
      const stopSpy = vi.spyOn(store, 'stopInterval');
      const renewSpy = vi.spyOn(store, 'renewPuzzle');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.solvedPuzzlesInMarathon).toBe(5);
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(store.consecutiveSolves).toBe(1);
      expect(store.showWinModal).toBe(true);
      expect(renewSpy).not.toHaveBeenCalled();
      unmount();
    });

    it('posts a marathon-formatted game and skips the win modal when disableWinMessage is set', async () => {
      const store = useBaseStore();
      store.marathonMode = true;
      store.solvedPuzzlesInMarathon = 4;
      store.disableWinMessage = true;
      store.token = 'tok';
      store.marathonScrambles = '1,2,3';
      store.marathonSolves = 'RUD';
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(vi.mocked(postGame).mock.calls[0][0]).toMatchObject({
        puzzle_type: 'marathon', scramble: '1,2,3', solve_path: 'RUD'
      });
      expect(store.showWinModal).toBe(false);
      unmount();
    });
  });

  describe('fmcBlitzWatch (FMC blitz mode)', () => {
    it('accumulates blitz moves and advances to the next scramble mid-run', async () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.numLines = 3;
      store.blitzScrambleCount = 3;
      store.solvedPuzzlesInMarathon = 0;
      store.movesCount = 5;
      const renewSpy = vi.spyOn(store, 'renewPuzzle');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.solvedPuzzlesInMarathon).toBe(1);
      expect(store.blitzMovesCount).toBe(5);
      expect(store.marathonFirstMove).toBe(false);
      expect(renewSpy).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('finalizes the blitz run and records a new record on the last scramble', async () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.numLines = 3;
      store.blitzScrambleCount = 1;
      store.solvedPuzzlesInMarathon = 0;
      store.movesCount = 5;
      store.fmcBlitzMovesRecord = 0;
      const stopBlitzSpy = vi.spyOn(store, 'stopBlitzInterval');
      const recordSpy = vi.spyOn(store, 'setFMCBlitzRecord');
      const renewSpy = vi.spyOn(store, 'renewPuzzle');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.solvedPuzzlesInMarathon).toBe(1);
      expect(recordSpy).toHaveBeenCalledWith(5, expect.any(Number), 3);
      expect(stopBlitzSpy).toHaveBeenCalledTimes(1);
      expect(renewSpy).not.toHaveBeenCalled();
      unmount();
    });

    it('skips the new-record write when the blitz move count did not improve', async () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.numLines = 3;
      store.blitzScrambleCount = 1;
      store.solvedPuzzlesInMarathon = 0;
      store.movesCount = 5;
      store.fmcBlitzMovesRecord = 3;
      const recordSpy = vi.spyOn(store, 'setFMCBlitzRecord');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(recordSpy).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe('playgroundWatch (playground and replay modes)', () => {
    it('sets new best-time and best-moves records on the first solve', async () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      store.time = 5000;
      store.movesCount = 20;
      const stopSpy = vi.spyOn(store, 'stopInterval');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(store.newPlaygroundTimeRecord).toBe(true);
      expect(store.newPlaygroundMovesRecord).toBe(true);
      expect(store.playgroundBestTime).toBe(5000);
      expect(store.playgroundBestMoves).toBe(20);
      expect(stopSpy).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('also fires via replayMode without playgroundMode', async () => {
      const store = useBaseStore();
      store.replayMode = true;
      store.time = 5000;
      const stopSpy = vi.spyOn(store, 'stopInterval');
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(postUserScramble).not.toHaveBeenCalled();
      unmount();
    });

    it('posts a new user scramble when none has been saved yet', async () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      store.token = 'tok';
      store.userScrambleId = 0;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(postUserScramble).toHaveBeenCalledTimes(1);
      expect(patchUserScramble).not.toHaveBeenCalled();
      unmount();
    });

    it('patches the existing user scramble when a new record was set', async () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      store.token = 'tok';
      store.userScrambleId = 5;
      store.time = 100;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(patchUserScramble).toHaveBeenCalledTimes(1);
      expect(postUserScramble).not.toHaveBeenCalled();
      unmount();
    });

    it('does not patch when no new record was set', async () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      store.token = 'tok';
      store.userScrambleId = 5;
      store.playgroundBestTime = 100;
      store.time = 200;
      store.playgroundBestMoves = 50;
      store.movesCount = 60;
      const unmount = mount();

      markDone(store);
      await nextTick();

      expect(patchUserScramble).not.toHaveBeenCalled();
      expect(postUserScramble).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe('doResetList watch (post-reset reinitialization)', () => {
    it('reinitializes the game 200ms after doResetList is set', async () => {
      const store = useBaseStore();
      store.cageCompleteImgLoaded = true;
      const initSpy = vi.spyOn(store, 'initStore');
      const unmount = mount();

      store.doResetList = true;
      await vi.waitFor(() => {
        expect(store.processingReInit).toBe(true);
      });

      await vi.waitFor(() => {
        expect(store.processingReInit).toBe(false);
      });
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(store.cageCompleteImgLoaded).toBe(false);
      unmount();
    });

    it('prepares cage mode first when enableCageMode is on', async () => {
      const store = useBaseStore();
      store.enableCageMode = true;
      const prepareSpy = vi.spyOn(store, 'doPrepareCageMode').mockImplementation(() => undefined);
      const unmount = mount();

      store.doResetList = true;
      await vi.waitFor(() => {
        expect(store.processingReInit).toBe(true);
      });

      await vi.waitFor(() => {
        expect(store.processingReInit).toBe(false);
      });
      expect(prepareSpy).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('blitzTime watch (time-limited blitz failure)', () => {
    // Driven through the real countdown - beforeMove() starts the store's own 5ms blitz
    // interval, and fake timers run it out. Nothing in production ever assigns blitzTime
    // a negative value by hand, so setting one directly would not exercise this path.
    it('flags a time failure once the real blitz countdown runs out', async () => {
      vi.useFakeTimers();
      try {
        const store = useBaseStore();
        store.fmcBlitz = true;
        const stopSpy = vi.spyOn(store, 'stopInterval');
        const stopBlitzSpy = vi.spyOn(store, 'stopBlitzInterval');
        const unmount = mount();

        // The first move starts both the game clock and the blitz countdown.
        store.beforeMove();
        expect(store.blitzInterval).not.toBe(0);

        // Part-way through: clock running, plenty of blitz time left, no failure yet.
        vi.advanceTimersByTime(1000);
        await nextTick();
        expect(store.time).toBeGreaterThan(0);
        expect(store.blitzTime).toBeGreaterThan(0);
        expect(store.isTimeFailed).toBe(false);

        // Run the countdown past zero.
        vi.advanceTimersByTime(FMC_BLITZ_TIME * 1000);
        await nextTick();

        expect(store.isTimeFailed).toBe(true);
        expect(stopSpy).toHaveBeenCalled();
        expect(stopBlitzSpy).toHaveBeenCalled();
        unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not flag a failure when the countdown runs out before the puzzle clock starts', async () => {
      vi.useFakeTimers();
      try {
        const store = useBaseStore();
        store.fmcBlitz = true;
        // A non-zero interval id makes beforeMove skip restartInterval, so the game clock
        // never starts and time stays 0 while the blitz countdown still runs.
        store.interval = 1;
        const unmount = mount();

        store.beforeMove();
        vi.advanceTimersByTime(1000);
        await nextTick();
        vi.advanceTimersByTime(FMC_BLITZ_TIME * 1000);
        await nextTick();

        expect(store.time).toBe(0);
        expect(store.blitzTime).toBeLessThanOrEqual(0);
        expect(store.isTimeFailed).toBe(false);
        unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
