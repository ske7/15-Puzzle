import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventBus } from '@vueuse/core';
import ActionPanel from '../ActionPanel.vue';
import { useBaseStore } from '../../stores/base';
import { loadCageImages } from '../../../tests/cageImages';
import { ControlType } from '@/const';
import type { RepGame } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn(), usePostFetchAPI: vi.fn() };
});

import { useGetFetchAPI, usePostFetchAPI } from '../../composables/useFetchAPI';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
}

let currentWrapper: VueWrapper | undefined;
function mountPanel() {
  currentWrapper = mount(ActionPanel, { attachTo: document.body });
  return currentWrapper;
}

interface ActionPanelInternals {
  disableButton: boolean;
  doReplay: (walkTime?: number, walkMode?: boolean) => Promise<void>;
  doWalk: () => Promise<void>;
  setScramble: (scramble: number[]) => void;
  closeAboutModal: () => void;
  closeConfigModal: () => void;
  closeImageGallery: () => void;
  closeAddScramble: () => void;
  closeScrambleList: () => void;
}

function internals(wrapper: VueWrapper): ActionPanelInternals {
  return wrapper.vm as unknown as ActionPanelInternals;
}

// A real short (2-move) replay from the solved board: down then right.
function realRepGame(overrides: Partial<RepGame> = {}): RepGame {
  return {
    time: 100,
    moves: 2,
    puzzle_size: 3,
    puzzle_type: 'standard',
    control_type: 'm',
    consecutive_solves: 0,
    scramble: '4,1,3,2,0,6,7,5,8',
    solve_path: 'DR',
    name: 'gamer_01',
    tps: '20',
    created_at: '2024-06-01T12:00:00Z',
    opt_moves: 2,
    ...overrides
  };
}

function setup3x3Board() {
  const store = useBaseStore();
  store.numLines = 3;
  store.spaceBetween = 8;
  store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  return store;
}

// defineAsyncComponent resolves its dynamic import() the first time the component
// renders, so the first vi.waitFor for a lazily-loaded child is really waiting on module
// resolution and transform, not on the app. Under full-suite parallel load that can
// exceed vi.waitFor's 1000ms default - observed once here, on the About modal, in a run
// that passed on retry and 5/5 in isolation. Resolving these up front (Vite caches by
// resolved id, so this is the same module the component's own import() gets) takes that
// cost out of the timed window instead of hiding it behind a longer timeout.
beforeAll(async () => {
  await Promise.all([
    import('../InfoModal.vue'),
    import('../ConfigModal.vue')
  ]);
});

describe('ActionPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    setWidth(1024);
    vi.mocked(useGetFetchAPI).mockReturnValue(new Promise(() => undefined));
    vi.mocked(usePostFetchAPI).mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  describe('modal open/close pairs', () => {
    it('pauses on opening About, then unpauses on close', async () => {
      const store = setup3x3Board();
      store.paused = false;
      const wrapper = mountPanel();
      const aboutButton = wrapper.findAll('button').find(b => b.text() === 'About')!;
      await aboutButton.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showInfo).toBe(true);
      await vi.waitFor(() => {
        expect(document.querySelector('.info-header')).not.toBeNull();
      });
      internals(wrapper).closeAboutModal();
      expect(store.showInfo).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does not unpause on closing About when it was already paused before opening', async () => {
      const store = setup3x3Board();
      store.paused = true;
      const wrapper = mountPanel();
      const aboutButton = wrapper.findAll('button').find(b => b.text() === 'About')!;
      await aboutButton.trigger('click');
      expect(store.paused).toBe(true);
      internals(wrapper).closeAboutModal();
      expect(store.paused).toBe(true);
    });

    it('does not toggle pause for Config when already paused before opening', async () => {
      const store = setup3x3Board();
      store.paused = true;
      const wrapper = mountPanel();
      const configButton = wrapper.findAll('button').find(b => b.text() === 'Config')!;
      await configButton.trigger('click');
      expect(store.paused).toBe(true);
    });

    it('does not toggle pause for Add/List when already paused before opening', async () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.token = 'real-session-token';
      store.paused = true;
      const wrapper = mountPanel();
      for (const label of ['Add', 'List']) {
        const button = wrapper.findAll('button').find(b => b.text() === label)!;
        await button.trigger('click');
        expect(store.paused).toBe(true);
      }
    });

    it('does not pause the image gallery when it was already paused before opening', async () => {
      const store = setup3x3Board();
      store.paused = true;
      mountPanel();
      useEventBus<string>('event-bus').emit('show-image-gallery', 'fromConfig');
      await vi.waitFor(() => {
        expect(store.showImageGallery).toBe(true);
      });
      expect(store.paused).toBe(true);
    });

    it('does not pause on opening Config once the puzzle is already done', async () => {
      const store = setup3x3Board();
      store.inPlaceCount = store.arrayLength - 1;
      store.afterDoneCount = store.arrayLength - 1; // completion animation finished, so the button stays enabled
      store.paused = false;
      const wrapper = mountPanel();
      const configButton = wrapper.findAll('button').find(b => b.text() === 'Config')!;
      await configButton.trigger('click');
      expect(store.paused).toBe(false);
    });

    it('does not pause on opening the scramble List once the puzzle is already done', async () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.token = 'real-session-token';
      store.inPlaceCount = store.arrayLength - 1;
      store.afterDoneCount = store.arrayLength - 1; // completion animation finished, so the button stays enabled
      store.paused = false;
      const wrapper = mountPanel();
      const listButton = wrapper.findAll('button').find(b => b.text() === 'List')!;
      await listButton.trigger('click');
      expect(store.paused).toBe(false);
    });

    it('pauses on opening Config, then unpauses on close', async () => {
      const store = setup3x3Board();
      store.paused = false;
      const wrapper = mountPanel();
      const configButton = wrapper.findAll('button').find(b => b.text() === 'Config')!;
      await configButton.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showConfig).toBe(true);
      await vi.waitFor(() => {
        expect(document.querySelector('.config-modal')).not.toBeNull();
      });
      internals(wrapper).closeConfigModal();
      expect(store.showConfig).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('leaves paused untouched when closing Config while already unpaused', () => {
      const store = setup3x3Board();
      store.showConfig = true;
      store.paused = false;
      const wrapper = mountPanel();
      internals(wrapper).closeConfigModal();
      expect(store.paused).toBe(false);
    });

    it('leaves paused untouched when closing the image gallery while already unpaused', () => {
      const store = setup3x3Board();
      store.showImageGallery = true;
      store.paused = false;
      const wrapper = mountPanel();
      internals(wrapper).closeImageGallery();
      expect(store.paused).toBe(false);
    });

    it('pauses on opening the image gallery, then unpauses on close', async () => {
      const store = setup3x3Board();
      store.paused = false;
      const wrapper = mountPanel();
      useEventBus<string>('event-bus').emit('show-image-gallery', 'fromConfig');
      await vi.waitFor(() => {
        expect(store.showImageGallery).toBe(true);
      });
      expect(store.paused).toBe(true);
      internals(wrapper).closeImageGallery();
      expect(store.showImageGallery).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does not pause the image gallery when the puzzle is already done', async () => {
      const store = setup3x3Board();
      store.inPlaceCount = store.arrayLength - 1;
      store.paused = false;
      mountPanel();
      useEventBus<string>('event-bus').emit('show-image-gallery', 'fromConfig');
      await vi.waitFor(() => {
        expect(store.showImageGallery).toBe(true);
      });
      expect(store.paused).toBe(false);
    });

    it('pauses on opening playground Add, then unpauses on close', async () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.paused = false;
      const wrapper = mountPanel();
      const addButton = wrapper.findAll('button').find(b => b.text() === 'Add')!;
      await addButton.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showAddScramble).toBe(true);
      internals(wrapper).closeAddScramble();
      expect(store.showAddScramble).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('pauses on opening the registered playground scramble List, then unpauses on close', async () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.token = 'real-session-token';
      store.paused = false;
      const wrapper = mountPanel();
      const listButton = wrapper.findAll('button').find(b => b.text() === 'List')!;
      await listButton.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showScrambleList).toBe(true);
      internals(wrapper).closeScrambleList();
      expect(store.showScrambleList).toBe(false);
      expect(store.paused).toBe(false);
    });
  });

  describe('doRestart', () => {
    it('resets via the store with configMode true for a config-triggered restart', () => {
      const store = setup3x3Board();
      const resetSpy = vi.spyOn(store, 'reset');
      mountPanel();
      useEventBus<string>('event-bus').emit('restart', 'fromConfig');
      expect(resetSpy).toHaveBeenCalledWith(true);
    });

    it('resets via the store with configMode false for a plain restart', () => {
      const store = setup3x3Board();
      const resetSpy = vi.spyOn(store, 'reset');
      const wrapper = mountPanel();
      const restartButton = wrapper.findAll('button').find(b => b.text() === 'Restart')!;
      void restartButton.trigger('click');
      expect(resetSpy).toHaveBeenCalledWith(false);
    });

    it('does nothing mid-completion-animation (afterDoneAnimationEnd false)', () => {
      const store = setup3x3Board();
      store.inPlaceCount = store.arrayLength - 1; // isDone true
      store.afterDoneCount = 0; // animation not finished, proMode false
      const resetSpy = vi.spyOn(store, 'reset');
      const wrapper = mountPanel();
      const restartButton = wrapper.findAll('button').find(b => b.text() === 'Restart')!;
      void restartButton.trigger('click');
      expect(resetSpy).not.toHaveBeenCalled();
    });

    it('does nothing while another modal is open for a plain restart', () => {
      const store = setup3x3Board();
      store.showInfo = true;
      const resetSpy = vi.spyOn(store, 'reset');
      mountPanel();
      useEventBus<string>('event-bus').emit('restart', 'fromMain');
      expect(resetSpy).not.toHaveBeenCalled();
    });

    it('still restarts while a modal is open when triggered from the keyboard', () => {
      const store = setup3x3Board();
      store.showInfo = true;
      const resetSpy = vi.spyOn(store, 'reset');
      mountPanel();
      useEventBus<string>('event-bus').emit('restart', 'fromKeyboard');
      expect(resetSpy).toHaveBeenCalledWith(false);
    });

    it('does nothing in g1000 mode before the puzzle is done', () => {
      const store = setup3x3Board();
      store.g1000Mode = true;
      const resetSpy = vi.spyOn(store, 'reset');
      mountPanel();
      useEventBus<string>('event-bus').emit('restart', 'fromMain');
      expect(resetSpy).not.toHaveBeenCalled();
    });

    it('allows restarting in g1000 mode once the puzzle is done', () => {
      const store = setup3x3Board();
      store.g1000Mode = true;
      store.inPlaceCount = store.arrayLength - 1;
      store.afterDoneCount = store.arrayLength - 1; // completion animation finished
      const resetSpy = vi.spyOn(store, 'reset');
      mountPanel();
      useEventBus<string>('event-bus').emit('restart', 'fromMain');
      expect(resetSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('doRenew', () => {
    it('clears saved orders and restarts', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.savedOrders = [1, 2, 3];
      const resetSpy = vi.spyOn(store, 'reset');
      const wrapper = mountPanel();
      const renewButton = wrapper.findAll('button').find(b => b.text() === 'Renew')!;
      void renewButton.trigger('click');
      expect(store.savedOrders).toEqual([]);
      expect(resetSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('setScramble', () => {
    it('applies a real scramble, sizing the board from its length', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.showAddScramble = true;
      const wrapper = mountPanel();
      const scramble = [4, 1, 3, 2, 0, 6, 7, 5, 8]; // 9 = 3x3
      internals(wrapper).setScramble(scramble);
      expect(store.numLines).toBe(3);
      expect(localStorage.getItem('numLines')).toBe('3');
      expect(store.savedOrders).toEqual(scramble);
      // checkUserScrambleInDB is consumed by the real playground renew flow triggered
      // via initStore(), so it's back to false by the time setScramble returns.
      expect(store.checkUserScrambleInDB).toBe(false);
      expect(store.showAddScramble).toBe(false);
    });

    it('closes the scramble list, if that is what was open, instead of Add', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.showScrambleList = true;
      const wrapper = mountPanel();
      internals(wrapper).setScramble([4, 1, 3, 2, 0, 6, 7, 5, 8]);
      expect(store.showScrambleList).toBe(false);
    });
  });

  describe('doTryToImprove', () => {
    it('saves the current scramble and opens the playground in a new tab', async () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      // sharedPlaygroundMode requires publicId/userName/otherUserName to differ
      store.publicId = 'abc123';
      store.userName = 'me';
      store.otherUserName = 'someone-else';
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      const wrapper = mountPanel();
      const tryItButton = wrapper.findAll('button').find(b => b.text() === 'Try It')!;
      await tryItButton.trigger('click');
      expect(localStorage.getItem('sharedPlaygroundScramble')).toBe('1,2,3,4,5,6,7,8,0');
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('setWalkMode', () => {
    it('switches between slow and fast walk speed', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      expect(store.fastWalkMode).toBe(false);
      const fastButton = wrapper.findAll('button').find(b => b.text() === 'f')!;
      await fastButton.trigger('click');
      expect(store.fastWalkMode).toBe(true);
      expect(localStorage.getItem('fastWalkMode')).toBe('true');
      const slowButton = wrapper.findAll('button').find(b => b.text() === 's')!;
      await slowButton.trigger('click');
      expect(store.fastWalkMode).toBe(false);
    });
  });

  describe('doReplay', () => {
    it('steps through the real solve path with real store moves', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      const promise = internals(wrapper).doReplay();
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(2);
      });
      await promise;
      expect(store.inReplay).toBe(false);
      // Down then Right from the solved board's blank (bottom-right)
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 0, 5, 7, 8, 6]);
    });

    it('uses the real control type recorded on the replayed game', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame({ control_type: 't' });
      const wrapper = mountPanel();
      await internals(wrapper).doReplay();
      expect(store.moveDoneBy).toBe(ControlType.Touch);
    });

    it('stops mid-replay and remembers its step when inReplay is turned off externally', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame({ solve_path: 'DDRR' }); // 4 real, valid moves in a row
      const wrapper = mountPanel();
      const promise = internals(wrapper).doReplay();
      await vi.waitFor(() => {
        expect(store.movesCount).toBeGreaterThanOrEqual(1);
      });
      store.inReplay = false;
      await promise;
      expect(store.movesCount).toBeLessThan(4);
    });

    it('exercises every move direction (right, left, down, up)', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      // Each move is the real inverse of the one before it, landing back on the
      // solved board while still exercising all four switch-case branches.
      store.repGame = realRepGame({ solve_path: 'RLDU', moves: 4 });
      const wrapper = mountPanel();
      await internals(wrapper).doReplay();
      expect(store.movesCount).toBe(4);
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    });

    it('falls back to a mouse control for an unrecognized recorded control type', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame({ control_type: 'x' });
      const wrapper = mountPanel();
      await internals(wrapper).doReplay();
      expect(store.moveDoneBy).toBe(ControlType.Mouse);
    });

    it('falls back to a 0ms move time when the recorded game has no real duration', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame({ time: 0 });
      const wrapper = mountPanel();
      await internals(wrapper).doReplay();
      expect(store.replaySpeed).toBe(0);
      expect(store.movesCount).toBe(2);
    });

    it('ignores an unrecognized character in the solve path', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame({ solve_path: 'D?R', moves: 2 });
      const wrapper = mountPanel();
      await internals(wrapper).doReplay();
      // the '?' step is skipped entirely, so only the real D and R moves count
      expect(store.movesCount).toBe(2);
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 0, 5, 7, 8, 6]);
    });
  });

  describe('doWalk', () => {
    it('runs the walk when the Walk button itself is clicked', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      const walkButton = wrapper.findAll('button').find((b) => b.text() === 'Walk');
      expect(walkButton).toBeDefined();
      await walkButton!.trigger('click');
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(2);
      });
    });

    it('starts a fresh walk replay from the beginning', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      await internals(wrapper).doWalk();
      expect(store.movesCount).toBe(2);
    });

    it('pauses an in-progress walk on a second call', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = false;
      store.repGame = realRepGame({ solve_path: 'DDRR' });
      const wrapper = mountPanel();
      const first = internals(wrapper).doWalk();
      await vi.waitFor(() => {
        expect(store.inReplay).toBe(true);
      });
      await internals(wrapper).doWalk();
      expect(store.inReplay).toBe(false);
      await first;
    });

    it('resumes a stopped walk exactly where it left off', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame({ solve_path: 'DDRR' });
      const wrapper = mountPanel();
      const first = internals(wrapper).doWalk();
      await vi.waitFor(() => {
        expect(store.inReplay).toBe(true);
      });
      await internals(wrapper).doWalk(); // stop
      await first;
      const movesAtStop = store.movesCount;
      expect(movesAtStop).toBeLessThan(4);

      await internals(wrapper).doWalk(); // resume
      expect(store.movesCount).toBe(4);
    });

    it('restarts fresh once the recorded moves already match the full solve path', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame(); // 'DR'
      store.solvePath = ['D', 'R']; // a previous walk already completed this replay
      const wrapper = mountPanel();
      await internals(wrapper).doWalk();
      expect(store.movesCount).toBe(2);
    });

    it('restarts when the recorded moves no longer match the replay', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame(); // 'DR'
      store.solvePath = ['R']; // diverges from the real 'DR' prefix
      const wrapper = mountPanel();
      await internals(wrapper).doWalk();
      expect(store.movesCount).toBe(2);
    });

    it('restarts once the puzzle is already done, even with no recorded moves yet', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame();
      store.inPlaceCount = store.arrayLength - 1; // isDone true
      const wrapper = mountPanel();
      await internals(wrapper).doWalk();
      expect(store.movesCount).toBe(2);
    });

    it('restarts when a stopped walk\'s saved step no longer matches its recorded moves', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame(); // 'DR'
      const wrapper = mountPanel();
      // Stop a real in-progress walk first, so stopWalk is genuinely true...
      const first = internals(wrapper).doWalk();
      await vi.waitFor(() => {
        expect(store.inReplay).toBe(true);
      });
      await internals(wrapper).doWalk(); // stop
      await first;
      // ...then desync its saved step from what was actually recorded, forcing a mismatch.
      (wrapper.vm as unknown as { savedStep: number }).savedStep = 99;
      const movesBeforeRestart = store.movesCount;
      await internals(wrapper).doWalk();
      // the mismatch forces a full restart, replaying both real moves again
      expect(store.movesCount).toBe(movesBeforeRestart + 2);
    });
  });

  describe('marathon replay', () => {
    // Two real one-move legs: sliding 8 left solves the first, sliding 6 up solves the second.
    const firstLeg = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    const secondLeg = [1, 2, 3, 4, 5, 0, 7, 8, 6];
    const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];

    function setupMarathonReplay(fastWalkMode: boolean) {
      const store = setup3x3Board();
      store.proMode = true;
      store.replayMode = true;
      store.marathonReplay = true;
      store.fastWalkMode = fastWalkMode;
      store.repGame = realRepGame({
        puzzle_type: 'marathon',
        scramble: `${firstLeg.join(',')};${secondLeg.join(',')}`,
        solve_path: 'L;U'
      });
      store.initStore();
      return store;
    }

    it('walks every leg in order, keeping one move count and path across puzzles', async () => {
      const store = setupMarathonReplay(true);
      const wrapper = mountPanel();
      const mixedOrdersSeen = [store.mixedOrders.join(',')];
      store.$subscribe(() => {
        const current = store.mixedOrders.join(',');
        if (mixedOrdersSeen.at(-1) !== current) {
          mixedOrdersSeen.push(current);
        }
      }, { flush: 'sync' });

      await internals(wrapper).doWalk();

      expect(mixedOrdersSeen).toEqual([firstLeg.join(','), secondLeg.join(',')]);
      expect(store.currentOrders).toEqual(solved);
      expect(store.movesCount).toBe(2);
      expect(store.solvePath).toEqual(['L', ';', 'U']);
      expect(store.solvedPuzzlesInMarathon).toBe(1);
      expect(store.inReplay).toBe(false);
    });

    it('shows the next scramble without animating the tiles, then moves at replay speed again', async () => {
      const store = setupMarathonReplay(false);
      const wrapper = mountPanel();
      const walk = internals(wrapper).doWalk();

      await vi.waitFor(() => {
        expect(store.mixedOrders).toEqual(secondLeg);
      }, { interval: 5 });
      expect(store.replaySpeed).toBe(0);
      expect(store.currentOrders).toEqual(secondLeg);

      await walk;
      expect(store.replaySpeed).toBe(store.walkSpeed);
      expect(store.currentOrders).toEqual(solved);
    });

    it('stopped on a solved puzzle, resumes from the start of the next one', async () => {
      const store = setupMarathonReplay(false);
      const wrapper = mountPanel();
      const first = internals(wrapper).doWalk();
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(1);
      }, { interval: 5 });
      expect(store.currentOrders).toEqual(solved);

      await internals(wrapper).doWalk(); // stop
      await first;
      expect(store.mixedOrders).toEqual(secondLeg);
      expect(store.currentOrders).toEqual(secondLeg);
      expect(store.movesCount).toBe(1);

      await internals(wrapper).doWalk(); // resume
      expect(store.movesCount).toBe(2);
      expect(store.currentOrders).toEqual(solved);
      expect(store.solvePath).toEqual(['L', ';', 'U']);
    });

    it('restarted on a solved puzzle, goes back to the first scramble instead of the next', async () => {
      const store = setupMarathonReplay(false);
      const wrapper = mountPanel();
      const walk = internals(wrapper).doWalk();
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(1);
      }, { interval: 5 });

      const restartButton = wrapper.findAll('button').find((b) => b.text() === 'Restart');
      expect(restartButton).toBeDefined();
      await restartButton!.trigger('click');
      await walk;

      expect(store.mixedOrders).toEqual(firstLeg);
      expect(store.currentOrders).toEqual(firstLeg);
      expect(store.solvedPuzzlesInMarathon).toBe(0);
      expect(store.movesCount).toBe(0);
    });

    it.each([
      [1024, ['Restart', 'Walk', 's', 'f', 'Replay']],
      [400, ['Restart', 'Walk', 's', 'f', 'Replay']]
    ])('shows the same controls as a single replay at width %i', (width, labels) => {
      setWidth(width);
      setupMarathonReplay(false);
      const wrapper = mountPanel();
      const shown = wrapper.findAll('button').map(b => b.text());
      for (const label of labels) {
        expect(shown).toContain(label);
      }
    });
  });

  describe('eventBus listener', () => {
    it('runs doWalk on a walk event', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.fastWalkMode = true;
      store.repGame = realRepGame();
      mountPanel();
      useEventBus<string>('event-bus').emit('walk', 'fromMain');
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(2);
      });
    });

    it('swallows a listener error instead of throwing', () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = null as unknown as RepGame; // makes doReplay throw when reading its fields
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      mountPanel();
      expect(() => {
        useEventBus<string>('event-bus').emit('walk', 'fromMain');
      }).not.toThrow();
      return vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
    });

    it('stops responding to events after being unmounted', () => {
      const store = setup3x3Board();
      const resetSpy = vi.spyOn(store, 'reset');
      const wrapper = mountPanel();
      wrapper.unmount();
      currentWrapper = undefined;
      useEventBus<string>('event-bus').emit('restart', 'fromMain');
      expect(resetSpy).not.toHaveBeenCalled();
    });
  });

  describe('disableButton / disableDuringMarathon', () => {
    it('disables buttons while any modal is open', () => {
      const store = setup3x3Board();
      store.showInfo = true;
      const wrapper = mountPanel();
      expect(internals(wrapper).disableButton).toBe(true);
    });

    it('disables buttons while the completion animation is still playing', () => {
      const store = setup3x3Board();
      store.inPlaceCount = store.arrayLength - 1;
      store.afterDoneCount = 0;
      const wrapper = mountPanel();
      expect(internals(wrapper).disableButton).toBe(true);
    });

    it('disables buttons in cage mode until every image has loaded', () => {
      const store = setup3x3Board();
      store.cageMode = true;
      loadCageImages(store, 3);
      const wrapper = mountPanel();
      expect(internals(wrapper).disableButton).toBe(true);
    });

    it('is enabled for a plain, active game', () => {
      const wrapper = mountPanel();
      expect(internals(wrapper).disableButton).toBe(false);
    });

    it('disables marathon-restricted controls only while a marathon run is active', () => {
      const store = setup3x3Board();
      store.marathonMode = true;
      store.time = 5000;
      mountPanel();
      expect(store.disableDuringMarathon).toBe(true);
      store.inPlaceCount = store.arrayLength - 1;
      expect(store.disableDuringMarathon).toBe(false);
    });
  });

  describe('clicking desktop controls', () => {
    it('toggles paused via the real store action when Pause is clicked', async () => {
      const store = setup3x3Board();
      store.doneFirstMove = true;
      const wrapper = mountPanel();
      const pauseButton = wrapper.findAll('button').find(b => b.text() === 'Pause')!;
      await pauseButton.trigger('click');
      expect(store.paused).toBe(true);
    });

    it('runs a real replay when Replay is clicked', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      const replayButton = wrapper.findAll('button').find(b => b.text() === 'Replay')!;
      await replayButton.trigger('click');
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(2);
      });
    });
  });

  describe('button visibility (desktop, >= 820px)', () => {
    it('shows the standard controls for a plain active game', () => {
      const wrapper = mountPanel();
      const labels = wrapper.findAll('button').map(b => b.text());
      expect(labels).toContain('Restart');
      expect(labels).toContain('Config');
      expect(labels).toContain('About');
      expect(labels).not.toContain('Renew');
      expect(labels).not.toContain('Walk');
    });

    it('shows playground-only controls in playground mode', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      const wrapper = mountPanel();
      const labels = wrapper.findAll('button').map(b => b.text());
      expect(labels).toContain('Renew');
      expect(labels).toContain('Add');
      expect(labels).not.toContain('Config');
    });

    it('shows the registered-only List button once a token exists', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.token = 'real-session-token';
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('List');
    });

    it('shows replay controls in replay mode', () => {
      const store = setup3x3Board();
      store.replayMode = true;
      const wrapper = mountPanel();
      const labels = wrapper.findAll('button').map(b => b.text());
      expect(labels).toContain('Walk');
      expect(labels).toContain('Replay');
      expect(labels).toContain('s');
      expect(labels).toContain('f');
    });

    it('hides the speed buttons during a playground replay', () => {
      const store = setup3x3Board();
      store.replayMode = true;
      store.playgroundMode = true;
      const wrapper = mountPanel();
      expect(wrapper.find('.speed-buttons').exists()).toBe(false);
    });

    it('shows Try It only in a shared playground session', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.publicId = 'abc123';
      store.userName = 'me';
      store.otherUserName = 'someone-else';
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('Try It');
    });

    it('hides Restart during a shared playground session', () => {
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.publicId = 'abc123';
      store.userName = 'me';
      store.otherUserName = 'someone-else';
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Restart');
    });

    it('shows the Pause/Resume label based on paused state', async () => {
      const store = setup3x3Board();
      store.doneFirstMove = true;
      const wrapper = mountPanel();
      const pauseButton = wrapper.findAll('button').find(b => b.text() === 'Pause')!;
      expect(pauseButton.exists()).toBe(true);
      store.paused = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('Resume');
    });

    it('hides Config in replay/playground mode', () => {
      const store = setup3x3Board();
      store.replayMode = true;
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Config');
    });

    it('shows the Stop label while a replay is in progress', async () => {
      const store = setup3x3Board();
      store.replayMode = true;
      const wrapper = mountPanel();
      store.inReplay = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('Stop');
    });

    it('hides Pause in pro mode', () => {
      const store = setup3x3Board();
      store.proMode = true;
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Pause');
    });
  });

  describe('button visibility (mobile, < 820px)', () => {
    it('shows the mobile restart button and hides the desktop-only row', () => {
      setWidth(500);
      const wrapper = mountPanel();
      expect(wrapper.find('.tool-button.mobile').exists()).toBe(true);
    });

    it('shows restart in the compact row for replay/playground modes too', () => {
      setWidth(500);
      const store = setup3x3Board();
      store.replayMode = true;
      const wrapper = mountPanel();
      const labels = wrapper.findAll('button').map(b => b.text());
      expect(labels.filter(l => l === 'Restart').length).toBeGreaterThanOrEqual(1);
    });

    it('hides Config and About when clearDisplay is set', () => {
      setWidth(500);
      const store = setup3x3Board();
      store.clearDisplay = true;
      const wrapper = mountPanel();
      const labels = wrapper.findAll('button').map(b => b.text());
      expect(labels).not.toContain('Config');
      expect(labels).not.toContain('About');
    });

    it('hides the mobile restart button in a shared playground session', () => {
      setWidth(500);
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.publicId = 'abc123';
      store.userName = 'me';
      store.otherUserName = 'someone-else';
      const wrapper = mountPanel();
      expect(wrapper.find('.tool-button.mobile').exists()).toBe(false);
    });

    it('shows Try It in a shared playground session', () => {
      setWidth(500);
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.publicId = 'abc123';
      store.userName = 'me';
      store.otherUserName = 'someone-else';
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('Try It');
    });

    it('hides About in playground mode', () => {
      setWidth(500);
      const store = setup3x3Board();
      store.playgroundMode = true;
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('About');
    });

    it('shows the registered-only List button in the compact row', () => {
      setWidth(500);
      const store = setup3x3Board();
      store.playgroundMode = true;
      store.token = 'real-session-token';
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('List');
    });
  });

  describe('clicking mobile controls', () => {
    it('restarts from the compact top row in playground mode', async () => {
      setWidth(500);
      const store = setup3x3Board();
      store.playgroundMode = true;
      const resetSpy = vi.spyOn(store, 'reset');
      const wrapper = mountPanel();
      const restartButton = wrapper.findAll('button').find(b => b.text() === 'Restart')!;
      await restartButton.trigger('click');
      expect(resetSpy).toHaveBeenCalledWith(false);
    });

    it('restarts from the standalone mobile Restart button in plain mode', async () => {
      setWidth(500);
      const store = setup3x3Board();
      const resetSpy = vi.spyOn(store, 'reset');
      const wrapper = mountPanel();
      const restartButton = wrapper.find('.tool-button.mobile');
      await restartButton.trigger('click');
      expect(resetSpy).toHaveBeenCalledWith(false);
    });

    it('switches walk speed from the mobile speed buttons', async () => {
      setWidth(500);
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      const fastButton = wrapper.findAll('button').find(b => b.text() === 'f')!;
      await fastButton.trigger('click');
      expect(store.fastWalkMode).toBe(true);
      const slowButton = wrapper.findAll('button').find(b => b.text() === 's')!;
      await slowButton.trigger('click');
      expect(store.fastWalkMode).toBe(false);
    });

    it('runs a real replay from the mobile Replay button', async () => {
      setWidth(500);
      const store = setup3x3Board();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      const replayButton = wrapper.findAll('button').find(b => b.text() === 'Replay')!;
      await replayButton.trigger('click');
      await vi.waitFor(() => {
        expect(store.movesCount).toBe(2);
      });
    });
  });
});
