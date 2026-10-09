import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App.vue';
import { useBaseStore } from '@/stores/base';
import { ControlType } from '@/const';
import type { RepGame } from '@/types';

// useKeyDown, usePrepare and useWatchGameState each have their own dedicated, thorough test
// suites that fully exercise their real network/localStorage/DOM side effects - mock them
// here so App's own tests are isolated to what App.vue itself is responsible for: wiring,
// the puzzleLoaded gate, and its own template logic (the header, WinModal's render condition).
// useTheme is small enough to keep real.
vi.mock('@/composables/useKeyDown', () => ({
  useKeyDown: vi.fn()
}));
vi.mock('@/composables/usePrepare', () => ({
  usePrepare: vi.fn()
}));
vi.mock('@/composables/useWatchGameState', () => ({
  useWatchGameState: vi.fn()
}));

import { useKeyDown } from '@/composables/useKeyDown';
import { usePrepare } from '@/composables/usePrepare';
import { useWatchGameState } from '@/composables/useWatchGameState';

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
    vi.mocked(useKeyDown).mockClear();
    vi.mocked(usePrepare).mockClear();
    vi.mocked(useWatchGameState).mockClear();
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.documentElement.dataset['theme'] = '';
  });

  it('wires up useKeyDown, usePrepare and useWatchGameState exactly once', () => {
    setupLoadedPuzzle();
    mountApp();
    expect(useKeyDown).toHaveBeenCalledTimes(1);
    expect(usePrepare).toHaveBeenCalledTimes(1);
    expect(useWatchGameState).toHaveBeenCalledTimes(1);
  });

  it('starts keyboard input before detecting the start mode, as it always has', () => {
    setupLoadedPuzzle();
    mountApp();
    expect(vi.mocked(useKeyDown).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(usePrepare).mock.invocationCallOrder[0]);
  });

  it('keeps the page theme in step with dark mode, as toggled from Config', async () => {
    const store = setupLoadedPuzzle();
    mountApp();
    expect(document.documentElement.dataset['theme']).toBe('light');
    store.darkMode = true;
    await nextTick();
    expect(document.documentElement.dataset['theme']).toBe('dark');
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

  it.each([400, 1024])('shows the cage logo at 32px at width %i, matching its CSS size', (width) => {
    setWidth(width);
    setupLoadedPuzzle();
    const wrapper = mountApp();
    expect(wrapper.find('.header img').attributes('width')).toBe('32');
    expect(wrapper.find('.header img').attributes('height')).toBe('32');
  });

  it('shows the header', () => {
    setupLoadedPuzzle();
    const wrapper = mountApp();
    expect(wrapper.find('.header').isVisible()).toBe(true);
  });

  describe('text selection while a game runs', () => {
    function startGame() {
      const store = setupLoadedPuzzle();
      store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 0, 8];
      store.setPuzzleData();
      const wrapper = mountApp();
      const range = document.createRange();
      range.selectNodeContents(wrapper.find('.header h1').element);
      getSelection()!.addRange(range);
      store.moveRight(ControlType.Keyboard);
      return { store, wrapper };
    }

    afterEach(() => {
      useBaseStore().stopInterval();
      getSelection()!.removeAllRanges();
    });

    it('is open before the first move', () => {
      setupLoadedPuzzle();
      const wrapper = mountApp();
      expect(wrapper.find('.wrapper').classes()).not.toContain('game-running');
    });

    it('is locked from the first move, and clears a selection already made', async () => {
      const { wrapper } = startGame();
      await nextTick();
      expect(wrapper.find('.wrapper').classes()).toContain('game-running');
      expect(getSelection()!.rangeCount).toBe(0);
    });

    it('opens again while the game is paused', async () => {
      const { store, wrapper } = startGame();
      store.paused = true;
      await nextTick();
      expect(wrapper.find('.wrapper').classes()).not.toContain('game-running');
    });

    it('opens again once the puzzle is solved', async () => {
      const { store, wrapper } = startGame();
      await nextTick();
      store.moveLeft(ControlType.Keyboard);
      await nextTick();
      store.moveLeft(ControlType.Keyboard);
      await vi.waitFor(() => {
        expect(store.isDone).toBe(true);
      });
      await nextTick();
      expect(wrapper.find('.wrapper').classes()).not.toContain('game-running');
    });

    it('stays locked between the puzzles of a marathon run', async () => {
      const store = setupLoadedPuzzle();
      store.marathonMode = true;
      store.time = 5000;
      const wrapper = mountApp();
      await nextTick();
      expect(store.doneFirstMove).toBe(false);
      expect(wrapper.find('.wrapper').classes()).toContain('game-running');
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
