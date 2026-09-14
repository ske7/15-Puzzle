import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../base';
import { ControlType, Direction } from '@/const';

function setup4x4Solved() {
  const store = useBaseStore();
  store.numLines = 4;
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
  return store;
}

describe('useBaseStore - movement, intervals, pausing', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('interval management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('restartInterval advances time based on elapsed ms', () => {
      const store = useBaseStore();
      store.restartInterval();
      vi.advanceTimersByTime(50);
      expect(store.time).toBeGreaterThan(0);
      store.stopInterval();
    });

    it('stopInterval clears and zeroes the interval id', () => {
      const store = useBaseStore();
      store.restartInterval();
      store.stopInterval();
      expect(store.interval).toBe(0);
    });

    it('stopBlitzInterval clamps a negative blitzTime to 0', () => {
      const store = useBaseStore();
      store.blitzTime = -5;
      store.stopBlitzInterval();
      expect(store.blitzTime).toBe(0);
      expect(store.blitzInterval).toBe(0);
    });

    it('saveTime stores the current time and stops the interval', () => {
      const store = useBaseStore();
      store.restartInterval();
      vi.advanceTimersByTime(20);
      store.saveTime();
      expect(store.savedTime).toBe(store.time);
      expect(store.interval).toBe(0);
    });
  });

  // The solve clock redraws once per animation frame rather than on a timer faster than the
  // screen. A hand-driven frame queue decides exactly when the screen refreshes, and Date is
  // faked alone so elapsed time is exact.
  describe('solve clock', () => {
    let frames: Map<number, FrameRequestCallback>;
    let lastId: number;

    const runFrame = (): void => {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) {
        callback(0);
      }
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(0);
      frames = new Map();
      lastId = 0;
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        lastId += 1;
        frames.set(lastId, callback);
        return lastId;
      });
      vi.stubGlobal('cancelAnimationFrame', (id: number) => {
        frames.delete(id);
      });
    });

    it('changes the displayed time only when a frame is drawn', () => {
      const store = useBaseStore();
      store.restartInterval();

      vi.setSystemTime(12); // several of the old 5ms ticks, all inside one frame
      expect(store.time).toBe(0);

      runFrame();
      expect(store.time).toBe(12);
      store.stopInterval();
    });

    it('runs a single frame loop, and keeps the running marker stable across frames', () => {
      const store = useBaseStore();
      store.restartInterval();
      store.restartInterval(); // a second start must not leave the first loop running
      const marker = store.interval;

      runFrame();
      runFrame();

      expect(frames.size).toBe(1);
      expect(store.interval).toBe(marker);
      store.stopInterval();
    });

    // Records are measured in ms and read straight after the clock stops, so stopping has
    // to land on the real elapsed time rather than whatever the last frame showed.
    it('settles on the exact elapsed time when stopped, not the last frame', () => {
      const store = useBaseStore();
      store.restartInterval();
      vi.setSystemTime(16);
      runFrame();

      vi.setSystemTime(23);
      store.stopInterval();

      expect(store.time).toBe(23);
      expect(store.interval).toBe(0);
      expect(frames.size).toBe(0);
    });

    it('saves the exact elapsed time on pause, and carries it into the next run', () => {
      const store = useBaseStore();
      store.restartInterval();
      vi.setSystemTime(16);
      runFrame();
      vi.setSystemTime(23);

      store.saveTime();
      expect(store.savedTime).toBe(23);

      vi.setSystemTime(5000); // paused for a while
      store.restartInterval();
      vi.setSystemTime(5010);
      runFrame();
      expect(store.time).toBe(33);
      store.stopInterval();
    });

    it('leaves the time alone when stopped with no clock running', () => {
      const store = useBaseStore();
      store.time = 500;
      store.interval = 999; // the marker set without a clock behind it

      store.stopInterval();

      expect(store.time).toBe(500);
      expect(store.interval).toBe(0);
    });
  });

  describe('invertPaused', () => {
    it('does nothing while a modal is open', () => {
      const store = useBaseStore();
      store.showConfig = true;
      store.invertPaused();
      expect(store.paused).toBe(false);
    });

    it('does nothing in cage mode before images finish loading', () => {
      const store = useBaseStore();
      store.cageMode = true;
      store.invertPaused();
      expect(store.paused).toBe(false);
    });

    it('toggles paused and saves time when pausing', () => {
      const store = useBaseStore();
      store.time = 123;
      store.invertPaused();
      expect(store.paused).toBe(true);
      expect(store.savedTime).toBe(123);
    });

    it('toggles paused back off without saving time', () => {
      const store = useBaseStore();
      store.paused = true;
      store.invertPaused();
      expect(store.paused).toBe(false);
    });
  });

  describe('movement actions', () => {
    // Every successful move runs beforeMove(), which starts a real setInterval
    // the first time - fake timers keep that from leaking into later tests.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('moveLeft swaps when not on the right edge', () => {
      const store = setup4x4Solved();
      store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
      store.moveLeft(ControlType.Mouse);
      expect(store.movesCount).toBe(1);
    });

    it('moveLeft is a no-op on the right edge', () => {
      const store = setup4x4Solved();
      store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 4];
      store.moveLeft(ControlType.Mouse);
      expect(store.movesCount).toBe(0);
    });

    it('moveRight swaps when not on the left edge', () => {
      const store = setup4x4Solved();
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 0, 9, 10, 11, 12, 13, 14, 15, 8];
      store.moveRight(ControlType.Mouse);
      expect(store.movesCount).toBe(1);
    });

    it('moveRight is a no-op on the left edge', () => {
      const store = setup4x4Solved();
      store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
      store.moveRight(ControlType.Mouse);
      expect(store.movesCount).toBe(0);
    });

    it('moveUp swaps when not on the bottom row', () => {
      const store = setup4x4Solved();
      store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
      store.moveUp(ControlType.Keyboard);
      expect(store.movesCount).toBe(1);
      expect(store.moveDoneBy).toBe(ControlType.Keyboard);
    });

    it('moveUp is a no-op on the bottom row', () => {
      const store = setup4x4Solved();
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 14, 15, 13];
      store.moveUp(ControlType.Mouse);
      expect(store.movesCount).toBe(0);
    });

    it('moveDown swaps when not on the top row', () => {
      const store = setup4x4Solved();
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 14, 15, 13];
      store.moveDown(ControlType.Touch);
      expect(store.movesCount).toBe(1);
    });

    it('moveDown is a no-op on the top row', () => {
      const store = setup4x4Solved();
      store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
      store.moveDown(ControlType.Mouse);
      expect(store.movesCount).toBe(0);
    });
  });

  describe('checkDiffBetweenElementsAndMove', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('returns false and does nothing when the diff is 1 or less', () => {
      const store = setup4x4Solved();
      const result = store.checkDiffBetweenElementsAndMove(15, Direction.Left, ControlType.Mouse);
      expect(result).toBe(false);
      expect(store.movesCount).toBe(0);
    });

    it('walks left across multiple tiles', () => {
      const store = setup4x4Solved();
      store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
      const result = store.checkDiffBetweenElementsAndMove(3, Direction.Left, ControlType.Mouse);
      expect(result).toBe(true);
      expect(store.movesCount).toBe(2);
      expect(store.currentOrders.indexOf(0)).toBe(2);
    });

    it('walks right across multiple tiles', () => {
      const store = setup4x4Solved();
      store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
      const result = store.checkDiffBetweenElementsAndMove(3, Direction.Right, ControlType.Mouse);
      expect(result).toBe(true);
    });

    it('walks up across multiple tiles', () => {
      const store = setup4x4Solved();
      const result = store.checkDiffBetweenElementsAndMove(4, Direction.Up, ControlType.Mouse);
      expect(result).toBe(true);
    });

    it('walks down across multiple tiles', () => {
      const store = setup4x4Solved();
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 14, 15, 13];
      const result = store.checkDiffBetweenElementsAndMove(5, Direction.Down, ControlType.Mouse);
      expect(result).toBe(true);
      expect(store.movesCount).toBe(2);
      expect(store.currentOrders.indexOf(0)).toBe(4);
    });

    it('hits the default branch for an unhandled direction with a large diff', () => {
      const store = setup4x4Solved();
      const result = store.checkDiffBetweenElementsAndMove(1, Direction.None, ControlType.Mouse);
      expect(result).toBe(true);
      expect(store.movesCount).toBe(0);
    });
  });

  describe('beforeMove / saveState', () => {
    // beforeMove() starts a real setInterval on the first move of a store; fake
    // timers keep that from leaking into later tests.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('starts the timer and resets FMC blitz fields on the first move', () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.time = 999;
      store.movesCount = 5;
      store.beforeMove();
      expect(store.doneFirstMove).toBe(true);
      expect(store.time).toBe(0);
      expect(store.movesCount).toBe(0);
      expect(store.interval).not.toBe(0);
      store.stopInterval();
    });

    it('does not reset fields on a subsequent move', () => {
      const store = useBaseStore();
      store.doneFirstMove = true;
      store.movesCount = 5;
      store.beforeMove();
      expect(store.movesCount).toBe(5);
      store.stopInterval();
    });

    it('starts the blitz interval on the very first blitz move', () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.beforeMove();
      expect(store.blitzInterval).not.toBe(0);
      vi.advanceTimersByTime(5);
      expect(store.blitzTime).toBeLessThan(180 * 1000);
      store.stopInterval();
      store.stopBlitzInterval();
    });

    it('saveState swaps tiles, records the move, and appends to the solve path', () => {
      const store = useBaseStore();
      store.numLines = 4;
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
      store.saveState(14, Direction.Right, ControlType.Mouse);
      expect(store.currentOrders[14]).toBe(0);
      expect(store.movesCount).toBe(1);
      expect(store.solvePath).toEqual(['R']);
    });

    it('saveState handles Left/Down/Up and an unmapped default direction', () => {
      const store = useBaseStore();
      store.numLines = 4;
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
      store.saveState(15, Direction.Left, ControlType.Mouse);
      store.saveState(14, Direction.Up, ControlType.Mouse);
      store.saveState(10, Direction.Down, ControlType.Mouse);
      store.saveState(0, Direction.None, ControlType.Mouse);
      expect(store.solvePath).toEqual(['L', 'U', 'D', '']);
    });
  });
});
