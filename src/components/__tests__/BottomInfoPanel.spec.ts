import { mount, type VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventBus } from '@vueuse/core';
import BottomInfoPanel from '../BottomInfoPanel.vue';
import { useBaseStore } from '../../stores/base';
import { baseUrl, ControlType, CORE_NUM } from '@/const';
import type { RepGame, Response } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn(), usePostFetchAPI: vi.fn() };
});

import { useGetFetchAPI, usePostFetchAPI } from '../../composables/useFetchAPI';

// jsdom has no working clipboard/execCommand copy path, so useClipboard is the
// one real @vueuse/core export worth mocking - everything else (useEventBus,
// onClickOutside, useWindowSize, ...) stays real.
const copyMock = vi.fn();
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>();
  return { ...actual, useClipboard: () => ({ copy: copyMock, copied: ref(false) }) };
});

interface BottomInfoPanelInternals {
  disableSave: boolean;
  getMinHeight: string;
  doSave: () => Promise<void>;
  doSaveOriginal: () => Promise<void>;
  doShare: () => void;
  doWalk: () => void;
  closeRegModal: () => void;
  closeUserAccount: () => void;
  closeLeaderBoard: () => void;
  closeLiveRecords: () => void;
}

function internals(wrapper: VueWrapper): BottomInfoPanelInternals {
  return wrapper.vm as unknown as BottomInfoPanelInternals;
}

let currentWrapper: VueWrapper | undefined;
function mountPanel() {
  currentWrapper = mount(BottomInfoPanel, { attachTo: document.body });
  return currentWrapper;
}

function setup3x3() {
  const store = useBaseStore();
  store.numLines = 3;
  store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  return store;
}

function realRepGame(overrides: Partial<RepGame> = {}): RepGame {
  return {
    time: 15000,
    moves: 45,
    puzzle_size: 3,
    puzzle_type: 'standard',
    control_type: 'm',
    consecutive_solves: 0,
    scramble: '4,1,3,2,0,6,7,5,8',
    solve_path: 'RRRUULDD',
    name: 'other_gamer',
    tps: '3.0',
    created_at: '2024-06-01T12:00:00Z',
    opt_moves: 12,
    ...overrides
  };
}

// Resolving the lazily-imported children up front: defineAsyncComponent loads them on
// first render, so a vi.waitFor for one is really timing module resolution (~350ms cold,
// against waitFor's 1000ms default). See ActionPanel.spec.ts for the full note.
beforeAll(async () => {
  await Promise.all([
    import('../LeaderBoard.vue'),
    import('../LiveRecords.vue'),
    import('../RegModal.vue')
  ]);
});

describe('BottomInfoPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    copyMock.mockClear();
    vi.mocked(useGetFetchAPI).mockReturnValue(new Promise(() => undefined));
    vi.mocked(usePostFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0, user_scramble_id: 1 } satisfies Response);
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  describe('personal-best records row', () => {
    it('shows the real time/moves PB outside fmc blitz', () => {
      const store = setup3x3();
      store.timeRecord = 12340;
      store.movesRecord = 42;
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('12.34');
      expect(wrapper.text()).toContain('42');
    });

    it('shows a "?" placeholder before any record exists', () => {
      const wrapper = mountPanel();
      expect(wrapper.find('.records-row').text()).toContain('?');
    });

    it('shows the real fmc blitz PB in fmc blitz mode', () => {
      const store = setup3x3();
      store.fmcBlitz = true;
      store.fmcBlitzMovesRecord = 22;
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('PB FMC blitz moves');
      expect(wrapper.text()).toContain('22');
    });

    it('hides the records row in replay or playground mode', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      const wrapper = mountPanel();
      expect(wrapper.find('.records-row').exists()).toBe(false);
    });
  });

  describe('cannotClick / runInProgress', () => {
    it('blocks clicks while any modal is open', () => {
      const store = setup3x3();
      store.showInfo = true;
      mountPanel();
      expect(store.cannotClick).toBe(true);
    });

    it('blocks clicks during an active marathon run', () => {
      const store = setup3x3();
      store.marathonMode = true;
      store.time = 5000;
      mountPanel();
      expect(store.cannotClick).toBe(true);
    });

    it('keeps the Leaderboard closed while the FMC Blitz clock runs', async () => {
      const store = setup3x3();
      store.token = 'real-session-token';
      store.fmcBlitz = true;
      store.moveRight(ControlType.Keyboard);
      const wrapper = mountPanel();
      await wrapper.findAll('.link-item').find(el => el.text() === 'Leaderboard')!.trigger('click');
      expect(store.showLeaderBoard).toBe(false);
      expect(store.paused).toBe(false);
      store.stopInterval();
      store.stopBlitzInterval();
    });

    it('blocks clicks during a replay', () => {
      const store = setup3x3();
      store.inReplay = true;
      mountPanel();
      expect(store.cannotClick).toBe(true);
    });

    it('allows clicks for a plain, active game', () => {
      const store = setup3x3();
      mountPanel();
      expect(store.cannotClick).toBe(false);
    });
  });

  describe('modal open/close pairs', () => {
    it('pauses on opening Register, then unpauses on close', async () => {
      const store = setup3x3();
      store.paused = false;
      const wrapper = mountPanel();
      const register = wrapper.findAll('.link-item').find(el => el.text() === 'Register')!;
      await register.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showRegModal).toBe(true);
      internals(wrapper).closeRegModal();
      expect(store.showRegModal).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does nothing when Register is clicked while blocked', async () => {
      const store = setup3x3();
      store.showInfo = true;
      const wrapper = mountPanel();
      const register = wrapper.findAll('.link-item').find(el => el.text() === 'Register')!;
      await register.trigger('click');
      expect(store.showRegModal).toBe(false);
    });

    it('does nothing when Profile is clicked while blocked', async () => {
      const store = setup3x3();
      store.token = 'real-session-token';
      store.showInfo = true;
      const wrapper = mountPanel();
      const profile = wrapper.findAll('.link-item').find(el => el.text() === 'Profile')!;
      await profile.trigger('click');
      expect(store.showUserAccount).toBe(false);
    });

    it('does nothing when Leaderboard is clicked while blocked', async () => {
      const store = setup3x3();
      store.showInfo = true;
      const wrapper = mountPanel();
      const leaderboard = wrapper.findAll('.link-item').find(el => el.text() === 'Leaderboard')!;
      await leaderboard.trigger('click');
      expect(store.showLeaderBoard).toBe(false);
    });

    it('logs in from the login link too', async () => {
      const store = setup3x3();
      store.paused = false;
      const wrapper = mountPanel();
      const login = wrapper.findAll('.link-item').find(el => el.text() === 'login')!;
      await login.trigger('click');
      expect(store.showRegModal).toBe(true);
    });

    it('does not unpause Register when it was already paused before opening', async () => {
      const store = setup3x3();
      store.paused = true;
      const wrapper = mountPanel();
      const register = wrapper.findAll('.link-item').find(el => el.text() === 'Register')!;
      await register.trigger('click');
      internals(wrapper).closeRegModal();
      expect(store.paused).toBe(true);
    });

    it('pauses on opening the user Profile, then unpauses on close', async () => {
      const store = setup3x3();
      store.token = 'real-session-token';
      store.paused = false;
      const wrapper = mountPanel();
      const profile = wrapper.findAll('.link-item').find(el => el.text() === 'Profile')!;
      await profile.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showUserAccount).toBe(true);
      internals(wrapper).closeUserAccount();
      expect(store.showUserAccount).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does not unpause Profile when it was already paused before opening, and stays paused on close', async () => {
      const store = setup3x3();
      store.token = 'real-session-token';
      store.paused = true;
      const wrapper = mountPanel();
      const profile = wrapper.findAll('.link-item').find(el => el.text() === 'Profile')!;
      await profile.trigger('click');
      expect(store.paused).toBe(true);
      internals(wrapper).closeUserAccount();
      expect(store.paused).toBe(true);
    });

    it('pauses on opening the default Leaderboard, then unpauses on close', async () => {
      const store = setup3x3();
      store.paused = false;
      const wrapper = mountPanel();
      const leaderboard = wrapper.findAll('.link-item').find(el => el.text() === 'Leaderboard')!;
      await leaderboard.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showLeaderBoard).toBe(true);
      internals(wrapper).closeLeaderBoard();
      expect(store.showLeaderBoard).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does not unpause Leaderboard when it was already paused before opening, and stays paused on close', async () => {
      const store = setup3x3();
      store.paused = true;
      const wrapper = mountPanel();
      const leaderboard = wrapper.findAll('.link-item').find(el => el.text() === 'Leaderboard')!;
      await leaderboard.trigger('click');
      expect(store.paused).toBe(true);
      internals(wrapper).closeLeaderBoard();
      expect(store.paused).toBe(true);
    });

    it('shows the Live link right after Leaderboard', () => {
      setup3x3();
      const wrapper = mountPanel();
      const links = wrapper.findAll('.registered-block .link-item').map(el => el.text());
      expect(links.slice(links.indexOf('Leaderboard'), links.indexOf('Leaderboard') + 2)).toEqual(['Leaderboard', 'Live']);
    });

    it('pauses on opening Live records, shows the list, then unpauses on close', async () => {
      const store = setup3x3();
      store.paused = false;
      const wrapper = mountPanel();
      const live = wrapper.findAll('.link-item').find(el => el.text() === 'Live')!;
      await live.trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showLiveRecords).toBe(true);
      await vi.waitFor(() => {
        expect(document.querySelector('.live-records')).not.toBeNull();
      });
      internals(wrapper).closeLiveRecords();
      expect(store.showLiveRecords).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does not unpause Live records when it was already paused before opening', async () => {
      const store = setup3x3();
      store.paused = true;
      const wrapper = mountPanel();
      const live = wrapper.findAll('.link-item').find(el => el.text() === 'Live')!;
      await live.trigger('click');
      internals(wrapper).closeLiveRecords();
      expect(store.paused).toBe(true);
    });

    it('does nothing when Live is clicked while blocked', async () => {
      const store = setup3x3();
      store.showInfo = true;
      const wrapper = mountPanel();
      const live = wrapper.findAll('.link-item').find(el => el.text() === 'Live')!;
      await live.trigger('click');
      expect(store.showLiveRecords).toBe(false);
    });
  });

  describe('doShowImageGallery', () => {
    it('emits the real show-image-gallery event when the cage completion count is clicked', async () => {
      const store = setup3x3();
      store.enableCageMode = true;
      store.numLines = CORE_NUM;
      store.unlockedCages = new Set([0, 1]);
      const wrapper = mountPanel();
      const events: unknown[] = [];
      useEventBus<string>('event-bus').on((event) => {
        if (event === 'show-image-gallery') events.push(event);
      });
      await wrapper.find('.link-item').trigger('click');
      expect(events).toHaveLength(1);
    });

    it('does nothing while blocked', async () => {
      const store = setup3x3();
      store.enableCageMode = true;
      store.numLines = CORE_NUM;
      store.showInfo = true;
      const wrapper = mountPanel();
      const events: unknown[] = [];
      useEventBus<string>('event-bus').on((event) => {
        if (event === 'show-image-gallery') events.push(event);
      });
      await wrapper.find('.link-item').trigger('click');
      expect(events).toHaveLength(0);
    });
  });

  describe('goMain / goPlayground', () => {
    function captureCreatedAnchor(): () => HTMLAnchorElement | undefined {
      const originalCreateElement = document.createElement.bind(document);
      let anchor: HTMLAnchorElement | undefined;
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') anchor = el as HTMLAnchorElement;
        return el;
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      return () => anchor;
    }

    it('opens the main page from a registered-block link', async () => {
      const getAnchor = captureCreatedAnchor();
      const store = setup3x3();
      store.playgroundMode = true;
      const wrapper = mountPanel();
      const main = wrapper.findAll('.link-item').find(el => el.text() === 'Main')!;
      await main.trigger('click');
      expect(getAnchor()?.getAttribute('href')).toBe(baseUrl);
      expect(getAnchor()?.getAttribute('target')).toBeNull();
    });

    it('does not open the main page while cannotClick is true', async () => {
      const getAnchor = captureCreatedAnchor();
      const store = setup3x3();
      store.playgroundMode = true;
      store.inReplay = true;
      const wrapper = mountPanel();
      const main = wrapper.findAll('.link-item').find(el => el.text() === 'Main')!;
      await main.trigger('click');
      expect(getAnchor()).toBeUndefined();
    });

    it('opens the playground from a registered-block link outside playground mode', async () => {
      const getAnchor = captureCreatedAnchor();
      const wrapper = mountPanel();
      const playground = wrapper.findAll('.link-item').find(el => el.text() === 'Playground')!;
      await playground.trigger('click');
      expect(getAnchor()?.getAttribute('href')).toBe(`${baseUrl}?playground`);
    });
  });

  describe('reset-password auto-open on load', () => {
    it('opens the set-password form with the real token/email from the URL', async () => {
      // Real navigation via the History API - the panel reads the genuine Location.
      window.history.replaceState({}, '', '/?reset_password&token=abc123&email=gamer%40example.com');
      try {
        const store = useBaseStore();
        mountPanel();
        expect(store.showRegModal).toBe(true);
        await vi.waitFor(() => {
          expect(document.querySelector('.header span')?.textContent.trim()).toBe('Set new password');
          expect(document.querySelector<HTMLInputElement>('#email')?.value).toBe('gamer@example.com');
        });
      } finally {
        window.history.replaceState({}, '', '/');
      }
    });

    it('does not auto-open for an already-registered user', () => {
      window.history.replaceState({}, '', '/?reset_password&token=abc123');
      try {
        const store = useBaseStore();
        store.token = 'real-session-token';
        mountPanel();
        expect(store.showRegModal).toBe(false);
      } finally {
        window.history.replaceState({}, '', '/');
      }
    });

    it('does not auto-open for a plain URL', () => {
      const store = useBaseStore();
      mountPanel();
      expect(store.showRegModal).toBe(false);
    });
  });

  describe('doWalk', () => {
    it('builds a real replay game from the real playground record and emits walk', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R', 'R', 'U'];
      store.playgroundBestMoves = 3;
      store.playgroundBestTime = 5000;
      const wrapper = mountPanel();
      const walkButton = wrapper.findAll('button').find(b => b.text() === 'Walk')!;
      const events: unknown[] = [];
      useEventBus<string>('event-bus').on((event) => {
        if (event === 'walk') events.push(event);
      });
      return walkButton.trigger('click').then(() => {
        expect(store.repGame.solve_path).toBe('RRU');
        expect(store.repGame.moves).toBe(3);
        expect(store.repGame.time).toBe(5000);
        expect(store.repGame.control_type).toBe('mouse');
        expect(events).toHaveLength(1);
      });
    });
  });

  describe('doShare', () => {
    it('sets the real public id and copies the real playground link', async () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      store.token = 'real-session-token';
      store.userName = 'me';
      store.userScrambleId = 42;
      vi.mocked(useGetFetchAPI).mockResolvedValue(
        { status: 'ok', game_id: 0, public_id: 'shared123' } satisfies Response
      );
      const wrapper = mountPanel();
      const shareButton = wrapper.findAll('button').find(b => b.text() === 'Share')!;
      await shareButton.trigger('click');
      await vi.waitFor(() => {
        expect(store.publicId).toBe('shared123');
      });
      expect(useGetFetchAPI).toHaveBeenCalledWith('public_id?user_scramble_id=42', 'real-session-token');
      await vi.waitFor(() => {
        expect(copyMock).toHaveBeenCalledWith(`${baseUrl}?playground&public_id=shared123`);
      });
    });

    it('logs a real error instead of throwing when the request fails', async () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      store.token = 'real-session-token';
      store.userName = 'me';
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('boom'));
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const wrapper = mountPanel();
      const shareButton = wrapper.findAll('button').find(b => b.text() === 'Share')!;
      await shareButton.trigger('click');
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
    });

    it('does not set a public id when the server returns none', async () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      store.token = 'real-session-token';
      store.userName = 'me';
      vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0 } satisfies Response);
      const wrapper = mountPanel();
      const shareButton = wrapper.findAll('button').find(b => b.text() === 'Share')!;
      await shareButton.trigger('click');
      await vi.waitFor(() => {
        expect(useGetFetchAPI).toHaveBeenCalled();
      });
      expect(store.publicId).toBe('');
      expect(copyMock).not.toHaveBeenCalled();
    });
  });

  describe('setWalkMode', () => {
    it('switches the real walk speed from the playground speed buttons', async () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      store.fastWalkMode = true;
      const wrapper = mountPanel();
      const slowButton = wrapper.findAll('button').find(b => b.text() === 's')!;
      await slowButton.trigger('click');
      expect(store.fastWalkMode).toBe(false);
      expect(localStorage.getItem('fastWalkMode')).toBe('false');
      const fastButton = wrapper.findAll('button').find(b => b.text() === 'f')!;
      await fastButton.trigger('click');
      expect(store.fastWalkMode).toBe(true);
      expect(localStorage.getItem('fastWalkMode')).toBe('true');
    });
  });

  describe('disableSave', () => {
    it('is disabled before the puzzle is done', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      expect(internals(wrapper).disableSave).toBe(true);
    });

    it('is enabled once done when replaying your own original game', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.repGame = realRepGame({ name: 'me' });
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountPanel();
      expect(internals(wrapper).disableSave).toBe(false);
    });

    it('is disabled after a pure replay of someone else\'s game with no real moves of your own', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.repGame = realRepGame({ name: 'other_gamer' });
      store.inPlaceCount = store.arrayLength - 1;
      store.wasReplay = true;
      const wrapper = mountPanel();
      expect(internals(wrapper).disableSave).toBe(true);
    });

    it('is disabled when your own solve matches theirs but is no faster', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.repGame = realRepGame({ name: 'other_gamer', solve_path: 'RD', time: 100 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D']; // same solve path as the recorded game
      store.time = 200; // and no faster than its recorded 100ms
      const wrapper = mountPanel();
      expect(internals(wrapper).disableSave).toBe(true);
    });

    it('is enabled once your own solve is faster or different from theirs', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.repGame = realRepGame({ name: 'other_gamer', solve_path: 'RD', time: 500 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D'];
      store.time = 100; // faster than the recorded 500ms
      const wrapper = mountPanel();
      expect(internals(wrapper).disableSave).toBe(false);
    });
  });

  describe('doSaveOriginal', () => {
    it('saves the real replayed game and opens the playground', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'me' });
      store.inPlaceCount = store.arrayLength - 1;
      const getAnchor = (() => {
        const originalCreateElement = document.createElement.bind(document);
        let anchor: HTMLAnchorElement | undefined;
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
          const el = originalCreateElement(tag);
          if (tag === 'a') anchor = el as HTMLAnchorElement;
          return el;
        });
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        return () => anchor;
      })();
      const wrapper = mountPanel();
      const saveButtons = wrapper.findAll('.save-button');
      await saveButtons[0].trigger('click'); // the original-solution save button
      // Waits on the real final side effect (set only after doSaveOriginal's full await
      // chain resolves), not just on the fetch having been called - postUserScramble's
      // own promise chain has more than one hop, so "was called" alone settles too early.
      await vi.waitFor(() => {
        expect(localStorage.getItem('sharedPlaygroundScramble')).not.toBeNull();
      });
      const body = vi.mocked(usePostFetchAPI).mock.calls[0][1] as string;
      const parsed = JSON.parse(body) as { user_scramble: { solve_path: string } };
      expect(parsed.user_scramble.solve_path).toBe(realRepGame().solve_path);
      expect(localStorage.getItem('sharedPlaygroundScramble')).toBe('1,2,3,4,5,6,7,8,0');
      expect(getAnchor()?.getAttribute('href')).toBe(`${baseUrl}?playground`);
    });
  });

  describe('doSave', () => {
    it('records a real new best time and moves, then saves and opens the playground', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'other_gamer', solve_path: 'RD', time: 500, moves: 2 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D'];
      store.time = 100;
      store.movesCount = 2;
      const wrapper = mountPanel();
      const saveButtons = wrapper.findAll('.save-button');
      const newSolutionSave = saveButtons[saveButtons.length - 1];
      await newSolutionSave.trigger('click');
      expect(store.playgroundBestTime).toBe(100);
      expect(store.newPlaygroundTimeRecord).toBe(true);
      expect(store.playgroundBestMoves).toBe(2);
      expect(store.newPlaygroundMovesRecord).toBe(true);
      await vi.waitFor(() => {
        expect(usePostFetchAPI).toHaveBeenCalled();
      });
    });

    it('does not save when nothing was actually improved', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      // A different (longer) recorded solve path keeps disableSave false (the
      // button stays clickable) despite this attempt beating none of the real
      // playground records below.
      store.repGame = realRepGame({ name: 'other_gamer', solve_path: 'RDLU', time: 100, moves: 4 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D'];
      store.time = 100;
      store.movesCount = 2;
      store.playgroundBestTime = 50;
      store.playgroundBestMoves = 1;
      const wrapper = mountPanel();
      const saveButtons = wrapper.findAll('.save-button');
      const newSolutionSave = saveButtons[saveButtons.length - 1];
      expect(newSolutionSave.attributes('disabled')).toBeUndefined();
      await newSolutionSave.trigger('click');
      expect(usePostFetchAPI).not.toHaveBeenCalled();
    });

    it('caps the reported time/moves at the original when replaying your own slower attempt', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'me', solve_path: 'RD', time: 100, moves: 2 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D'];
      store.time = 300; // slower than your own original
      store.movesCount = 5; // more moves than your own original
      const wrapper = mountPanel();
      const saveButtons = wrapper.findAll('.save-button');
      const newSolutionSave = saveButtons[saveButtons.length - 1];
      await newSolutionSave.trigger('click');
      expect(store.playgroundBestTime).toBe(100); // capped at the original, not 300
      expect(store.playgroundBestMoves).toBe(2); // capped at the original, not 5
      expect(store.playgroundSolvePath).toEqual(['R', 'D']);
    });

    it('saves a real improvement in time alone, leaving the existing moves record untouched', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'other_gamer', solve_path: 'RD', time: 500, moves: 10 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D'];
      store.time = 100; // beats the existing playground time record below
      store.movesCount = 5; // does not beat the existing playground moves record below
      store.playgroundBestTime = 200;
      store.playgroundBestMoves = 2;
      const wrapper = mountPanel();
      const saveButtons = wrapper.findAll('.save-button');
      await saveButtons[saveButtons.length - 1].trigger('click');
      expect(store.playgroundBestTime).toBe(100);
      expect(store.newPlaygroundTimeRecord).toBe(true);
      expect(store.playgroundBestMoves).toBe(2);
      expect(store.newPlaygroundMovesRecord).toBe(false);
      await vi.waitFor(() => {
        expect(usePostFetchAPI).toHaveBeenCalled();
      });
    });

    it('saves a real improvement in moves alone, leaving the existing time record untouched', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'other_gamer', solve_path: 'RD', time: 500, moves: 10 });
      store.inPlaceCount = store.arrayLength - 1;
      store.solvePath = ['R', 'D'];
      store.time = 300; // does not beat the existing playground time record below
      store.movesCount = 1; // beats the existing playground moves record below
      store.playgroundBestTime = 200;
      store.playgroundBestMoves = 2;
      const wrapper = mountPanel();
      const saveButtons = wrapper.findAll('.save-button');
      await saveButtons[saveButtons.length - 1].trigger('click');
      expect(store.playgroundBestTime).toBe(200);
      expect(store.newPlaygroundTimeRecord).toBe(false);
      expect(store.playgroundBestMoves).toBe(1);
      expect(store.newPlaygroundMovesRecord).toBe(true);
      await vi.waitFor(() => {
        expect(usePostFetchAPI).toHaveBeenCalled();
      });
    });
  });

  describe('replay-mode template', () => {
    it('shows the real scramble, its manhattan distance, and the original solution', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('md:');
      expect(wrapper.text()).toContain(`om:${realRepGame().opt_moves}`);
      expect(wrapper.text()).toContain('Original solution');
      expect(wrapper.text()).toContain(realRepGame().solve_path);
    });

    it('omits the optimal-moves label when the server sent none', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.repGame = realRepGame({ opt_moves: null as unknown as number });
      const wrapper = mountPanel();
      expect(wrapper.text()).not.toContain('om:');
    });

    it('omits the manhattan distance during a marathon replay', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.marathonReplay = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      expect(wrapper.text()).not.toContain('md:');
    });

    it('shows a new-solution block only once real moves have been made', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      expect(wrapper.text()).not.toContain('New solution');
      store.solvePath = ['R'];
      return wrapper.vm.$nextTick().then(() => {
        expect(wrapper.text()).toContain('New solution');
      });
    });

    it('shows a marathon replay\'s new solution without any save button', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.marathonReplay = true;
      store.token = 'tok';
      store.userName = 'gamer_01';
      store.repGame = realRepGame({ name: 'gamer_01' });
      const wrapper = mountPanel();
      store.solvePath = ['R', 'U', ';', 'L'];
      await wrapper.vm.$nextTick();
      expect(store.registered).toBe(true);
      expect(wrapper.text()).toContain('New solution');
      expect(wrapper.text()).toContain('RU;L');
      expect(wrapper.findAll('.save-button')).toHaveLength(0);
    });

    it('credits the real viewer when improving on someone else\'s original', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.repGame = realRepGame({ name: 'other_gamer' });
      store.solvePath = ['R'];
      const wrapper = mountPanel();
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('(by me)');
    });

    it('does not credit anyone by name when improving on your own original', async () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.repGame = realRepGame({ name: 'me' });
      store.solvePath = ['R'];
      const wrapper = mountPanel();
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).not.toContain('(by');
    });

    it('shows the save-original button only for your own registered replay', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'me' });
      const wrapper = mountPanel();
      expect(wrapper.findAll('.save-button').length).toBeGreaterThanOrEqual(1);
    });

    it('hides the save-original button for someone else\'s replay', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.userName = 'me';
      store.token = 'real-session-token';
      store.repGame = realRepGame({ name: 'other_gamer' });
      const wrapper = mountPanel();
      expect(wrapper.findAll('.save-button')).toHaveLength(0);
    });
  });

  describe('playground-mode template', () => {
    it('shows the real best speed and a public link once shared', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundBestTime = 15000;
      store.playgroundBestTimeMoves = 40;
      store.playgroundBestMoves = 40;
      store.playgroundSolvePath = ['R', 'D'];
      store.userScrambleId = 7;
      store.publicId = 'abc123';
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('Best speed');
      const link = wrapper.find<HTMLAnchorElement>('.best-solution a');
      expect(link.attributes('href')).toBe(`${baseUrl}?playground&public_id=abc123`);
    });

    it('shows plain text for the best moves before anything has been shared', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.userScrambleId = 0;
      const wrapper = mountPanel();
      expect(wrapper.find('.best-solution a').exists()).toBe(false);
    });

    it('hides walk/share controls once no solution has been recorded yet', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = [];
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Walk');
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Share');
    });

    it('shows Stop instead of Walk while a playground replay is in progress', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      store.inReplay = true;
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).toContain('Stop');
    });

    it('hides Share until a real token and username are present', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      const wrapper = mountPanel();
      expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Share');
    });

    it('disables Share once already shared', () => {
      const store = setup3x3();
      store.playgroundMode = true;
      store.playgroundSolvePath = ['R'];
      store.token = 'real-session-token';
      store.userName = 'me';
      store.publicId = 'abc123';
      const wrapper = mountPanel();
      const shareButton = wrapper.findAll('button').find(b => b.text() === 'Share')!;
      expect(shareButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('marathon / fmc blitz / network error rows', () => {
    it('shows the real marathon solved count', () => {
      const store = setup3x3();
      store.marathonMode = true;
      store.solvedPuzzlesInMarathon = 2;
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('Solved');
      expect(wrapper.text()).toContain('2');
      expect(wrapper.text()).toContain('out of 5 puzzles');
    });

    it('shows the real fmc blitz solved count and blitz scramble count', () => {
      const store = setup3x3();
      store.fmcBlitz = true;
      store.solvedPuzzlesInMarathon = 3;
      store.blitzScrambleCount = 10;
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('out of 10 puzzles');
    });

    it('shows the live combined move count while the blitz run is still going', () => {
      const store = setup3x3();
      store.fmcBlitz = true;
      store.solvedPuzzlesInMarathon = 3;
      store.blitzScrambleCount = 10; // still short of the full run
      store.blitzMovesCount = 5;
      store.movesCount = 3;
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('M: 8');
    });

    it('freezes the final move count once the blitz run has fully finished', () => {
      const store = setup3x3();
      store.fmcBlitz = true;
      store.solvedPuzzlesInMarathon = 10;
      store.blitzScrambleCount = 10;
      store.blitzMovesCount = 5;
      store.movesCount = 3;
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('M: 5');
    });

    it('shows the local-mode notice on a network error', () => {
      const store = setup3x3();
      store.isNetworkError = true;
      const wrapper = mountPanel();
      expect(wrapper.find('.no-connect').exists()).toBe(true);
      expect(wrapper.find('.registered-block').exists()).toBe(false);
    });

    it('shows the last failed request in the players own words', () => {
      const store = setup3x3();
      store.lastError = 'Could not save your last solve';
      const wrapper = mountPanel();
      expect(wrapper.find('.last-error').text()).toBe('Could not save your last solve');
    });

    // .reg-wrapper is a flex row shared with the nav links, so an error placed inside it
    // rendered alongside them. It belongs on its own line in the column below.
    it('renders the error on its own line, not inside the links row', () => {
      const store = setup3x3();
      store.lastError = 'Could not save your last solve';
      const wrapper = mountPanel();
      expect(wrapper.find('.last-error').exists()).toBe(true);
      expect(wrapper.find('.reg-wrapper .last-error').exists()).toBe(false);
    });

    it('stays out of the way in clear-display mode, like the rest of the panel', () => {
      const store = setup3x3();
      store.lastError = 'Could not save your last solve';
      store.clearDisplay = true;
      const wrapper = mountPanel();
      expect(wrapper.find('.last-error').exists()).toBe(false);
    });

    it('shows why the opened link could not load, which later requests never clear', () => {
      const store = setup3x3();
      store.linkError = 'Wrong public_id';
      const wrapper = mountPanel();
      expect(wrapper.find('.last-error').text()).toBe('Wrong public_id');
    });

    it('shows a newer failed request ahead of the link error', () => {
      const store = setup3x3();
      store.linkError = 'Wrong public_id';
      store.lastError = 'Could not save your last solve';
      const wrapper = mountPanel();
      expect(wrapper.findAll('.last-error')).toHaveLength(1);
      expect(wrapper.find('.last-error').text()).toBe('Could not save your last solve');
    });

    it('shows nothing when the last request succeeded', () => {
      setup3x3();
      const wrapper = mountPanel();
      expect(wrapper.find('.last-error').exists()).toBe(false);
    });

    it('yields to the local-mode notice, which already explains the failure', () => {
      const store = setup3x3();
      store.isNetworkError = true;
      store.lastError = 'Could not save your last solve';
      const wrapper = mountPanel();
      expect(wrapper.find('.last-error').exists()).toBe(false);
      expect(wrapper.find('.no-connect').exists()).toBe(true);
    });
  });

  describe('registered-block navigation links', () => {
    it('shows Main instead of Playground in g1000 mode', () => {
      const store = setup3x3();
      store.g1000Mode = true;
      const wrapper = mountPanel();
      const labels = wrapper.findAll('.link-item').map(l => l.text());
      expect(labels).toContain('Main');
      expect(labels).not.toContain('Playground');
    });

    it('shows login as well as Register for an unregistered user', () => {
      const wrapper = mountPanel();
      const labels = wrapper.findAll('.link-item').map(l => l.text());
      expect(labels).toContain('Register');
      expect(labels).toContain('login');
      expect(labels).not.toContain('Profile');
    });
  });

  describe('getMinHeight', () => {
    it('reserves real space for the replay row only in replay mode', () => {
      const wrapper = mountPanel();
      expect(internals(wrapper).getMinHeight).toBe('0px');
    });

    it('reserves the real fixed height in replay mode', () => {
      const store = setup3x3();
      store.replayMode = true;
      store.repGame = realRepGame();
      const wrapper = mountPanel();
      expect(internals(wrapper).getMinHeight).toBe('83px');
    });
  });
});
