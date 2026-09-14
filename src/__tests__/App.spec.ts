import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.vue';
import { useBaseStore } from '../stores/base';
import type { RepGame } from '@/types';

// usePrepare and useWatchGameState each have their own dedicated, thorough test suites
// (usePrepare.spec.ts, useWatchGameState.spec.ts) that fully exercise their real network/
// localStorage/DOM side effects - mock the usePrepare() entry point here so App's own tests
// are isolated to what App.vue itself is responsible for: wiring, the puzzleLoaded gate, and
// its own template logic (header visibility, the clear-display toggle, WinModal's render
// condition). getSquareSize is kept real - Board.vue calls it directly to size itself.
vi.mock('../composables/usePrepare', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../composables/usePrepare')>();
  return { ...actual, usePrepare: vi.fn() };
});
vi.mock('../composables/useWatchGameState', () => ({
  useWatchGameState: vi.fn()
}));

import { usePrepare } from '../composables/usePrepare';
import { useWatchGameState } from '../composables/useWatchGameState';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
}

// A real, solved 3x3 board - enough real state for Board/TopInfoPanel/ActionPanel/
// BottomInfoPanel/AveragesPanel to all render without crashing, just like Board.spec.ts.
function setupLoadedPuzzle() {
  const store = useBaseStore();
  store.numLines = 3;
  store.spaceBetween = 8;
  store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  store.boardPos = { left: 0, top: 0, right: 2000, bottom: 2000 };
  store.puzzleLoaded = true;
  return store;
}

// A real replay game record - needed whenever replayMode is on, since TopInfoPanel reads
// repGame's fields unconditionally once that flag is set.
function realRepGame(overrides: Partial<RepGame> = {}): RepGame {
  return {
    time: 12340,
    moves: 42,
    puzzle_size: 3,
    puzzle_type: 'standard',
    control_type: 'mouse',
    consecutive_solves: 3,
    scramble: '4,1,3,2,0,6,7,5,8',
    solve_path: 'RRRUULDD',
    name: 'other_gamer',
    tps: '3.402',
    created_at: '2024-06-01T12:00:00Z',
    opt_moves: 18,
    ...overrides
  };
}

let currentWrapper: VueWrapper | undefined;
function mountApp() {
  currentWrapper = mount(App, { attachTo: document.body });
  return currentWrapper;
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setWidth(1024);
    vi.mocked(usePrepare).mockClear();
    vi.mocked(useWatchGameState).mockClear();
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
  });

  it('wires up usePrepare and useWatchGameState exactly once', () => {
    setupLoadedPuzzle();
    mountApp();
    expect(usePrepare).toHaveBeenCalledTimes(1);
    expect(useWatchGameState).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while the puzzle has not finished loading', () => {
    const wrapper = mountApp();
    expect(wrapper.find('.wrapper').exists()).toBe(false);
  });

  it('renders the real board and panels once the puzzle is loaded', () => {
    setupLoadedPuzzle();
    const wrapper = mountApp();
    expect(wrapper.find('.wrapper').exists()).toBe(true);
    expect(wrapper.find('.board').exists()).toBe(true);
  });

  describe('cageImgSize', () => {
    it('shrinks the cage image at a narrow width', () => {
      setWidth(400);
      setupLoadedPuzzle();
      const wrapper = mountApp();
      expect(wrapper.find('.header img').attributes('width')).toBe('32');
    });

    it('uses the full cage image size above the narrow-width breakpoint', () => {
      setWidth(1024);
      setupLoadedPuzzle();
      const wrapper = mountApp();
      expect(wrapper.find('.header img').attributes('width')).toBe('42');
    });
  });

  describe('header visibility', () => {
    it('hides the header while the display is cleared', () => {
      const store = setupLoadedPuzzle();
      store.clearDisplay = true;
      const wrapper = mountApp();
      expect(wrapper.find('.header').isVisible()).toBe(false);
    });

    it('shows the header when the display is not cleared', () => {
      const store = setupLoadedPuzzle();
      store.clearDisplay = false;
      const wrapper = mountApp();
      expect(wrapper.find('.header').isVisible()).toBe(true);
    });
  });

  describe('clear-field visibility', () => {
    it('is shown outside replay and playground modes', () => {
      const store = setupLoadedPuzzle();
      store.replayMode = false;
      store.playgroundMode = false;
      const wrapper = mountApp();
      expect(wrapper.find('.clear-field').isVisible()).toBe(true);
    });

    it('is hidden in replay mode', () => {
      const store = setupLoadedPuzzle();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountApp();
      expect(wrapper.find('.clear-field').isVisible()).toBe(false);
    });

    it('is hidden in playground mode', () => {
      const store = setupLoadedPuzzle();
      store.playgroundMode = true;
      const wrapper = mountApp();
      expect(wrapper.find('.clear-field').isVisible()).toBe(false);
    });
  });

  describe('clearDisplay toggling', () => {
    it('flips the real store flag on click', async () => {
      const store = setupLoadedPuzzle();
      const wrapper = mountApp();
      expect(store.clearDisplay).toBe(false);
      await wrapper.find('.clear-field').trigger('click');
      expect(store.clearDisplay).toBe(true);
      await wrapper.find('.clear-field').trigger('click');
      expect(store.clearDisplay).toBe(false);
    });

    it('prevents real touch scrolling once the display is cleared', async () => {
      const store = setupLoadedPuzzle();
      const wrapper = mountApp();
      await wrapper.find('.clear-field').trigger('click');
      expect(store.clearDisplay).toBe(true);
      const event = new Event('touchmove', { cancelable: true });
      document.documentElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      // Undo the toggle so this real document-level listener doesn't leak into other tests.
      await wrapper.find('.clear-field').trigger('click');
    });

    it('allows real touch scrolling again once the display is restored', async () => {
      const store = setupLoadedPuzzle();
      const wrapper = mountApp();
      await wrapper.find('.clear-field').trigger('click');
      await wrapper.find('.clear-field').trigger('click');
      expect(store.clearDisplay).toBe(false);
      const event = new Event('touchmove', { cancelable: true });
      document.documentElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('WinModal', () => {
    // isDone and afterDoneAnimationEnd are real derived getters, not settable state - drive
    // them the same way the puzzle itself does: inPlaceCount vs. arrayLength for isDone,
    // afterDoneCount vs. arrayLength for the post-animation flag.
    function setWinnable() {
      const store = setupLoadedPuzzle();
      store.inPlaceCount = store.arrayLength - 1; // isDone === true
      store.replayMode = false;
      store.proMode = true; // afterDoneAnimationEnd is unconditionally true in pro mode
      store.showWinModal = true;
      return store;
    }

    it('shows once every real condition is satisfied', async () => {
      setWinnable();
      const wrapper = mountApp();
      await vi.waitFor(() => {
        expect(wrapper.find('.win-modal').exists()).toBe(true);
      }, { timeout: 3000 });
    });

    it('stays hidden when the puzzle is not done', () => {
      const store = setWinnable();
      store.inPlaceCount = 0;
      const wrapper = mountApp();
      expect(wrapper.find('.win-modal').exists()).toBe(false);
    });

    it('stays hidden in replay mode', () => {
      const store = setWinnable();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountApp();
      expect(wrapper.find('.win-modal').exists()).toBe(false);
    });

    it('stays hidden outside pro mode before the finish animation ends', () => {
      const store = setWinnable();
      store.proMode = false;
      store.afterDoneCount = 0;
      const wrapper = mountApp();
      expect(wrapper.find('.win-modal').exists()).toBe(false);
    });

    it('shows outside pro mode once the finish animation has ended', async () => {
      const store = setWinnable();
      store.proMode = false;
      // Leave afterDoneCount at its real starting point (0) - each real, non-free Square
      // increments it once its own landing animation finishes, converging back on
      // arrayLength - 1 the same way a real completed game would.
      const wrapper = mountApp();
      await vi.waitFor(() => {
        expect(wrapper.find('.win-modal').exists()).toBe(true);
      }, { timeout: 3000 });
    });

    it('stays hidden when showWinModal was already dismissed', () => {
      const store = setWinnable();
      store.showWinModal = false;
      const wrapper = mountApp();
      expect(wrapper.find('.win-modal').exists()).toBe(false);
    });

    it('closes back into the real store flag', async () => {
      const store = setWinnable();
      const wrapper = mountApp();
      await vi.waitFor(() => {
        expect(wrapper.find('.win-modal').exists()).toBe(true);
      }, { timeout: 3000 });
      await wrapper.find('.win-modal .win-button').trigger('click');
      expect(store.showWinModal).toBe(false);
    });
  });
});
