import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { withSetup } from '../../../tests/withSetup';
import { CAGES_PATH_ARR } from '@/const';
import type { Response } from '@/types';

// useKeyDown is a whole separate composable with its own global keydown listener and its
// own dedicated, thorough test suite (useKeyDown.spec.ts) - mock it here so usePrepare()
// tests are isolated from it and just assert it gets wired up once.
vi.mock('../useKeyDown', () => ({
  useKeyDown: vi.fn()
}));

// The real network layer - mocked so every test controls exactly what each endpoint
// resolves/rejects with, without going through fetch.
vi.mock('../useFetchAPI', () => ({
  useGetFetchAPI: vi.fn()
}));

// Only redirectTo is replaced; every other util keeps its real implementation.
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>();
  return { ...actual, redirectTo: vi.fn() };
});

import { redirectTo } from '@/utils';
import { baseUrl } from '@/const';
import { getSquareSize, usePrepare } from '../usePrepare';
import { useKeyDown } from '../useKeyDown';
import { useGetFetchAPI } from '../useFetchAPI';

// Real navigation via jsdom's History API rather than swapping window.location for a
// URL stand-in: the production code reads the genuine Location object, and nothing has
// to be redefined. Paths are origin-relative so they stay same-origin.
function setLocation(href: string): void {
  window.history.replaceState({}, '', href.replace('http://localhost:3000', ''));
}

function mount() {
  const [, unmount] = withSetup(() => usePrepare());
  return unmount;
}

function response(overrides: Partial<Response> = {}): Response {
  return { status: 'ok', game_id: 0, ...overrides };
}

describe('usePrepare', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    setLocation('http://localhost:3000/');
    vi.mocked(useGetFetchAPI).mockResolvedValue(response());
  });

  it('wires up useKeyDown exactly once', () => {
    const unmount = mount();
    expect(useKeyDown).toHaveBeenCalledTimes(1);
    unmount();
  });

  describe('numLines from localStorage', () => {
    it('defaults to CORE_NUM and persists it when nothing valid is stored', () => {
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(4);
      expect(localStorage.getItem('numLines')).toBe('4');
      unmount();
    });

    it('defaults to CORE_NUM when the stored value is not a valid puzzle size', () => {
      localStorage.setItem('numLines', '99');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(4);
      unmount();
    });

    it('uses the stored value when it is a valid puzzle size', () => {
      localStorage.setItem('numLines', '6');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(6);
      unmount();
    });
  });

  describe('startup size guard', () => {
    // Cage mode is CORE_NUM-only, but checkCageMode set the store while the stored size
    // was read before it - so the stale value used to overwrite it right back, leaving a
    // 6x6 cage board with '4' in localStorage. Same user path as the blitz case below.
    it('forces CORE_NUM in cage mode when a larger size is stored', () => {
      localStorage.setItem('enableCageMode', 'true');
      localStorage.setItem('numLines', '6');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(4);
      expect(localStorage.getItem('numLines')).toBe('4');
      unmount();
    });

    // The reported path, end to end across three real page loads: cage mode on, take the
    // in-app ?playground link, pick a size only playground allows, come back to the main
    // board. Each load gets its own pinia, since a store is built fresh from localStorage.
    it('restores cage mode at CORE_NUM after a playground visit at size 6', () => {
      localStorage.setItem('enableCageMode', 'true');
      localStorage.setItem('numLines', '4');

      setLocation('http://localhost:3000/?playground');
      setActivePinia(createPinia());
      const playgroundStore = useBaseStore();
      const unmountPlayground = mount();
      // Board.vue's own size selector - it persists numLines and touches no mode flag.
      playgroundStore.numLines = 6;
      playgroundStore.initAfterNewPuzzleSize();
      expect(localStorage.getItem('numLines')).toBe('6');
      unmountPlayground();

      setLocation('http://localhost:3000/');
      setActivePinia(createPinia());
      const mainStore = useBaseStore();
      const unmountMain = mount();
      expect(mainStore.enableCageMode).toBe(true);
      expect(mainStore.numLines).toBe(4);
      unmountMain();
    });

    it('leaves cage mode at CORE_NUM when that is what is stored', () => {
      localStorage.setItem('enableCageMode', 'true');
      localStorage.setItem('numLines', '4');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(4);
      unmount();
    });

    // fmcBlitz and numLines persist to localStorage independently, and playground mode
    // turns fmcBlitz off in the store only. So the real path here is: enable FMC blitz,
    // go to ?playground, pick a size it allows but blitz does not (6-8), come back.
    it('falls back to CORE_NUM when a stored size outside fmcBlitzCores comes back with blitz on', () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('fmcBlitz', 'true');
      localStorage.setItem('numLines', '6');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(4);
      expect(localStorage.getItem('numLines')).toBe('4');
      // The mode itself survives - only the unsupported size is corrected.
      expect(store.fmcBlitz).toBe(true);
      unmount();
    });

    it.each([3, 4, 5])('keeps a stored size of %i, which blitz supports', (size) => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('fmcBlitz', 'true');
      localStorage.setItem('numLines', String(size));
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(size);
      unmount();
    });

    it('leaves a size outside fmcBlitzCores alone when blitz is off', () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('numLines', '7');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(7);
      unmount();
    });

    it('does not clamp playground mode, which supports every size', () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('fmcBlitz', 'true');
      localStorage.setItem('numLines', '6');
      setLocation('http://localhost:3000/?playground');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(6);
      unmount();
    });
  });

  describe('theme and pro-mode start params', () => {
    it('enables dark mode from the URL and persists it', () => {
      setLocation('http://localhost:3000/?dark');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.darkMode).toBe(true);
      expect(localStorage.getItem('darkMode')).toBe('true');
      expect(document.documentElement.dataset['theme']).toBe('dark');
      unmount();
    });

    it('defaults to the light theme without the dark flag', () => {
      const unmount = mount();
      expect(document.documentElement.dataset['theme']).toBe('light');
      unmount();
    });

    it('enables pro mode and forces hoverOnControl off cage mode on a first-visit ?pro link', () => {
      setLocation('http://localhost:3000/?pro');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.proMode).toBe(true);
      expect(store.hoverOnControl).toBe(true);
      expect(store.enableCageMode).toBe(false);
      expect(localStorage.getItem('proMode')).toBe('true');
      unmount();
    });

    it('turns cage mode off for the session without erasing the stored preference', () => {
      localStorage.setItem('enableCageMode', 'true');
      setLocation('http://localhost:3000/?playground');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.enableCageMode).toBe(false);
      // Persisting false here is what used to lose cage mode permanently after a
      // single playground visit.
      expect(localStorage.getItem('enableCageMode')).toBe('true');
      unmount();
    });

    it('enables pro mode via ?playground without re-forcing hoverOnControl when a preference already exists', () => {
      localStorage.setItem('proMode', 'false');
      setLocation('http://localhost:3000/?playground');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.proMode).toBe(true);
      expect(store.hoverOnControl).toBe(false);
      unmount();
    });

    it('defaults to pro mode as the first-visit default with no location flags or stored preference', () => {
      const store = useBaseStore();
      const unmount = mount();
      expect(store.proMode).toBe(true);
      expect(store.hoverOnControl).toBe(true);
      expect(localStorage.getItem('proMode')).toBe('true');
      unmount();
    });

    it('leaves an existing pro-mode preference untouched with no location flags', () => {
      localStorage.setItem('proMode', 'false');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.proMode).toBe(false);
      unmount();
    });
  });

  describe('g1000 mode', () => {
    it('activates g1000 mode and initializes a 3x3 puzzle when a token is present', () => {
      localStorage.setItem('token', 'tok');
      setLocation('http://localhost:3000/?g1000');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.g1000Mode).toBe(true);
      expect(store.proMode).toBe(true);
      expect(store.marathonMode).toBe(false);
      expect(store.fmcBlitz).toBe(false);
      expect(store.numLines).toBe(3);
      expect(store.puzzleLoaded).toBe(true);
      unmount();
    });

    it('does not activate g1000 mode without a token', () => {
      setLocation('http://localhost:3000/?g1000');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.g1000Mode).toBe(false);
      unmount();
    });

    it('does not activate g1000 mode without the URL flag', () => {
      localStorage.setItem('token', 'tok');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.g1000Mode).toBe(false);
      unmount();
    });
  });

  describe('playground mode', () => {
    it('activates playground mode, disables other modes, and initializes without a public_id', () => {
      setLocation('http://localhost:3000/?playground');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.playgroundMode).toBe(true);
      expect(store.marathonMode).toBe(false);
      expect(store.fmcBlitz).toBe(false);
      expect(store.puzzleLoaded).toBe(true);
      unmount();
    });

    it('consumes a shared playground scramble from localStorage and resizes to match it', () => {
      localStorage.setItem('sharedPlaygroundScramble', '2,1,4,3,5,6,7,8,0');
      setLocation('http://localhost:3000/?playground');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.savedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
      // checkPublicID's own initStore() call (no public_id, no token, in this URL) runs
      // synchronously right after, and renewPuzzle() -> playgroundModeRenew() consumes and
      // clears this flag once the scramble has been processed - see the equivalent comment
      // in useKeyDown.spec.ts's clipboard-paste test.
      expect(store.checkUserScrambleInDB).toBe(false);
      expect(store.numLines).toBe(3);
      expect(localStorage.getItem('sharedPlaygroundScramble')).toBeNull();
      unmount();
    });

    it('initializes directly without a token when the URL carries a public_id', () => {
      setLocation('http://localhost:3000/?playground&public_id=abc');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.puzzleLoaded).toBe(true);
      expect(useGetFetchAPI).not.toHaveBeenCalledWith(expect.stringContaining('user_scramble?public_id'), expect.anything());
      unmount();
    });

    it('loads the shared scramble stats and resizes to match them when a public_id and token are both present', async () => {
      localStorage.setItem('token', 'tok');
      setLocation('http://localhost:3000/?playground&public_id=abc');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('user_scramble?public_id')) {
          return Promise.resolve(response({
            stats: {
              scramble: '2,1,4,3,5,6,7,8,0',
              best_time: 1000,
              best_time_moves: 10,
              best_moves: 10,
              created_at: '2024-01-01',
              solve_path: 'RUD',
              id: 7,
              name: 'other'
            } as unknown as Response['stats']
          }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.puzzleLoaded).toBe(true);
      });
      expect(store.savedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
      expect(store.numLines).toBe(3);
      expect(store.userScrambleId).toBe(7);
      expect(store.otherUserName).toBe('other');
      expect(store.publicId).toBe('abc');
      unmount();
    });

    it('falls back to empty defaults for stats fields the response leaves out', async () => {
      localStorage.setItem('token', 'tok');
      setLocation('http://localhost:3000/?playground&public_id=abc');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('user_scramble?public_id')) {
          // A scramble nobody has solved yet: no best time/moves, no id, no owner name.
          return Promise.resolve(response({
            stats: { scramble: '2,1,4,3,5,6,7,8,0' } as unknown as Response['stats']
          }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.puzzleLoaded).toBe(true);
      });
      expect(store.savedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
      expect(store.playgroundBestTime).toBe(0);
      expect(store.playgroundBestTimeMoves).toBe(0);
      expect(store.playgroundBestMoves).toBe(0);
      expect(store.playgroundCreatedAt).toBeUndefined();
      expect(store.userScrambleId).toBe(0);
      expect(store.otherUserName).toBe('');
      unmount();
    });

    it('falls back to the original size when the public_id lookup returns no stats', async () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('numLines', '5');
      setLocation('http://localhost:3000/?playground&public_id=abc');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('user_scramble?public_id')) {
          return Promise.resolve(response());
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.puzzleLoaded).toBe(true);
      });
      expect(store.numLines).toBe(5);
      unmount();
    });

    it('leaves savedOrders and the solve path untouched when the response omits them', async () => {
      localStorage.setItem('token', 'tok');
      setLocation('http://localhost:3000/?playground&public_id=abc');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('user_scramble?public_id')) {
          return Promise.resolve(response({
            stats: {
              best_time: 1000,
              best_time_moves: 10,
              best_moves: 10,
              created_at: '2024-01-01',
              id: 7,
              name: 'other'
            } as unknown as Response['stats']
          }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      store.savedOrders = [2, 1, 4, 3, 5, 6, 7, 8, 0];
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.puzzleLoaded).toBe(true);
      });
      expect(store.savedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
      expect(store.playgroundSolvePath).toEqual([]);
      expect(store.userScrambleId).toBe(7);
      unmount();
    });

    it.each([
      ['jpj0synad5tn', 'user_scramble?public_id=jpj0synad5tn'],
      ['abc%26id%3D1%23x', 'user_scramble?public_id=abc%26id%3D1%23x']
    ])('sends public_id %s to the API as a single encoded value', (linkValue, endpoint) => {
      localStorage.setItem('token', 'tok');
      setLocation(`http://localhost:3000/?playground&public_id=${linkValue}`);
      const unmount = mount();
      expect(useGetFetchAPI).toHaveBeenCalledWith(endpoint, 'tok');
      unmount();
    });

    it('never initializes the puzzle when the URL only contains "public_id" as a substring', () => {
      setLocation('http://localhost:3000/?playground&public_idx=abc');
      const store = useBaseStore();
      const unmount = mount();
      // searchParams.get('public_id') resolves to null since the actual key is
      // 'public_idx', so neither branch inside checkPublicID's outer if ever runs.
      expect(store.puzzleLoaded).toBe(false);
      unmount();
    });

    // App.vue renders nothing until puzzleLoaded, so failing to load the shared scramble
    // used to leave a blank page - this test previously asserted that as correct.
    it('still lays out a board and says so when the public_id lookup fails', async () => {
      localStorage.setItem('token', 'tok');
      setLocation('http://localhost:3000/?playground&public_id=abc');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('user_scramble?public_id')) {
          return Promise.reject(new Error('boom'));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalled();
      });
      expect(store.puzzleLoaded).toBe(true);
      expect(store.lastError).toBe('Could not load the shared scramble');
      unmount();
    });
  });

  describe('cage mode', () => {
    it('activates cage mode from a ?cage URL', () => {
      setLocation('http://localhost:3000/?cage');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.enableCageMode).toBe(true);
      expect(store.proMode).toBe(false);
      expect(store.marathonMode).toBe(false);
      expect(store.g1000Mode).toBe(false);
      expect(store.numLines).toBe(4);
      expect(localStorage.getItem('enableCageMode')).toBe('true');
      unmount();
    });

    it('stays in cage mode when it was already enabled, without a ?cage URL', () => {
      localStorage.setItem('enableCageMode', 'true');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.enableCageMode).toBe(true);
      unmount();
    });

    it('does not activate cage mode with neither the URL flag nor a stored preference', () => {
      const store = useBaseStore();
      const unmount = mount();
      expect(store.enableCageMode).toBe(false);
      unmount();
    });
  });

  describe('game link (replay)', () => {
    it('does nothing when no game_id is present', () => {
      const unmount = mount();
      expect(useGetFetchAPI).not.toHaveBeenCalledWith(expect.stringContaining('game?game_id'), expect.anything());
      unmount();
    });

    it('falls back to the default gameId when the URL only contains "game_id" as a substring', () => {
      setLocation('http://localhost:3000/?game_idx=42');
      const store = useBaseStore();
      const unmount = mount();
      // searchParams.get('game_id') resolves to null since the actual key is
      // 'game_idx', so gameId stays '0' and the standard (non-replay) init path runs.
      expect(useGetFetchAPI).not.toHaveBeenCalledWith(expect.stringContaining('game?game_id'), expect.anything());
      expect(store.replayMode).toBe(false);
      expect(store.puzzleLoaded).toBe(true);
      unmount();
    });

    it.each([
      ['jpj0synad5tn', 'game?game_id=jpj0synad5tn'],
      ['42%26puzzle_type%3Dx%23y', 'game?game_id=42%26puzzle_type%3Dx%23y']
    ])('sends game_id %s to the API as a single encoded value', (linkValue, endpoint) => {
      setLocation(`http://localhost:3000/?game_id=${linkValue}`);
      const unmount = mount();
      expect(useGetFetchAPI).toHaveBeenCalledWith(endpoint, undefined);
      unmount();
    });

    it('redirects away when the requested game has no stats', async () => {
      setLocation('http://localhost:3000/?game_id=42');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('game?game_id')) {
          return Promise.resolve(response());
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(redirectTo).toHaveBeenCalledWith(baseUrl);
      });
      // The replay is abandoned rather than initialised.
      expect(store.replayMode).toBe(false);
      expect(store.puzzleLoaded).toBe(false);
      unmount();
    });

    it('loads a replay, switching into pro mode when not already in it', async () => {
      // enableCageMode forces checkCageMode to run first and set proMode=false
      // synchronously, before the replay fetch resolves - this is what actually
      // exercises checkGameLink's own "not already in pro mode" branch, rather than
      // relying on setStartParams' unrelated first-visit pro-mode default (which would
      // have already left proMode=true regardless of what checkGameLink does).
      localStorage.setItem('enableCageMode', 'true');
      setLocation('http://localhost:3000/?game_id=42');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('game?game_id')) {
          return Promise.resolve(response({
            stats: {
              time: 1000,
              moves: 10,
              puzzle_size: 3,
              puzzle_type: 'standard',
              control_type: 'mouse',
              consecutive_solves: 1,
              scramble: '2,1,4,3,5,6,7,8,0',
              solve_path: 'R',
              name: 'someone',
              tps: '1.0',
              created_at: '2024-01-01',
              opt_moves: 5
            } as unknown as Response['stats']
          }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      expect(store.proMode).toBe(false);
      expect(store.enableCageMode).toBe(true);

      await vi.waitFor(() => {
        expect(store.puzzleLoaded).toBe(true);
      });
      expect(store.replayMode).toBe(true);
      expect(store.proMode).toBe(true);
      expect(store.hoverOnControl).toBe(true);
      expect(store.enableCageMode).toBe(false);
      expect(store.marathonReplay).toBe(false);
      expect(store.numLines).toBe(3);
      unmount();
    });

    it('marks a marathon replay and does not re-force pro-mode fields when already in pro mode', async () => {
      localStorage.setItem('proMode', 'true');
      setLocation('http://localhost:3000/?game_id=42');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('game?game_id')) {
          return Promise.resolve(response({
            stats: {
              time: 1000,
              moves: 10,
              puzzle_size: 3,
              puzzle_type: 'marathon',
              control_type: 'mouse',
              consecutive_solves: 1,
              scramble: '2,1,4,3,5,6,7,8,0',
              solve_path: 'R',
              name: 'someone',
              tps: '1.0',
              created_at: '2024-01-01',
              opt_moves: 5
            } as unknown as Response['stats']
          }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      store.hoverOnControl = false;
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.puzzleLoaded).toBe(true);
      });
      expect(store.marathonReplay).toBe(true);
      // hoverOnControl untouched, since proMode was already true before the fetch resolved.
      expect(store.hoverOnControl).toBe(false);
      unmount();
    });

    // Same trap as the shared-scramble link: initStore only ran inside the .then, so a
    // failed replay lookup left App.vue with puzzleLoaded false and nothing on screen.
    it('still lays out a board and says so when the game lookup fails', async () => {
      setLocation('http://localhost:3000/?game_id=42');
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('game?game_id')) {
          return Promise.reject(new Error('boom'));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.lastError).toBe('Could not load the game replay');
      });
      expect(store.puzzleLoaded).toBe(true);
      expect(store.replayMode).toBe(false);
      unmount();
    });
  });

  describe('current-user check', () => {
    it('says so when the account lookup fails, rather than silently dropping blitz', async () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('fmcBlitz', 'true');
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('get_current_user')) {
          return Promise.reject(new Error('boom'));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.lastError).toBe('Could not load your account');
      });
      expect(store.fmcBlitz).toBe(false);
      unmount();
    });

    it('pings the version endpoint and disables fmcBlitz when no token is present', () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      const unmount = mount();
      expect(useGetFetchAPI).toHaveBeenCalledWith('version');
      expect(store.fmcBlitz).toBe(false);
      unmount();
    });

    it('refreshes the token and username when a token is present', async () => {
      localStorage.setItem('token', 'tok');
      vi.mocked(useGetFetchAPI).mockResolvedValue(response({ token: 'new-tok', name: 'demi' }));
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.userName).toBe('demi');
      });
      expect(store.token).toBe('new-tok');
      expect(localStorage.getItem('token')).toBe('new-tok');
      unmount();
    });

    it('loads averages for a fresh standard-mode visit', async () => {
      localStorage.setItem('token', 'tok');
      vi.mocked(useGetFetchAPI).mockResolvedValue(response({ token: 'tok', name: 'demi' }));
      const store = useBaseStore();
      const averagesSpy = vi.spyOn(store, 'loadAverages').mockImplementation(() => undefined);
      const unmount = mount();

      await vi.waitFor(() => {
        expect(averagesSpy).toHaveBeenCalledTimes(1);
      });
      unmount();
    });

    it('does not load averages when a game_id replay is being loaded', async () => {
      setLocation('http://localhost:3000/?game_id=42');
      localStorage.setItem('token', 'tok');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint === 'get_current_user') {
          return Promise.resolve(response({ token: 'tok', name: 'demi' }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const averagesSpy = vi.spyOn(store, 'loadAverages').mockImplementation(() => undefined);
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.userName).toBe('demi');
      });
      expect(averagesSpy).not.toHaveBeenCalled();
      unmount();
    });

    it('disables fmcBlitz and logs on a failed user refresh', async () => {
      localStorage.setItem('token', 'tok');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('boom'));
      const store = useBaseStore();
      store.fmcBlitz = true;
      const unmount = mount();

      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalled();
      });
      expect(store.fmcBlitz).toBe(false);
      unmount();
    });
  });

  describe('standard-mode onMounted initialization', () => {
    it('initializes the puzzle at the stored size', () => {
      localStorage.setItem('numLines', '5');
      const store = useBaseStore();
      const unmount = mount();
      expect(store.numLines).toBe(5);
      expect(store.puzzleLoaded).toBe(true);
      unmount();
    });

    it('does not run the default init a second time when g1000 mode already initialized the puzzle', () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('numLines', '5');
      setLocation('http://localhost:3000/?g1000');
      const store = useBaseStore();
      const unmount = mount();
      // g1000 mode forces a 3x3 board; the plain onMounted init would have used the
      // stored 5 instead, so numLines staying at 3 proves it did not run again.
      expect(store.numLines).toBe(3);
      unmount();
    });

    it('does not run the default init a second time when a game replay already initialized the puzzle', async () => {
      setLocation('http://localhost:3000/?game_id=42');
      localStorage.setItem('numLines', '5');
      vi.mocked(useGetFetchAPI).mockImplementation((endpoint: string) => {
        if (endpoint.includes('game?game_id')) {
          return Promise.resolve(response({
            stats: {
              time: 1000, moves: 10, puzzle_size: 3, puzzle_type: 'standard', control_type: 'mouse',
              consecutive_solves: 1, scramble: '2,1,4,3,5,6,7,8,0', solve_path: 'R', name: 'someone', tps: '1.0',
              created_at: '2024-01-01', opt_moves: 5
            } as unknown as Response['stats']
          }));
        }
        return Promise.resolve(response());
      });
      const store = useBaseStore();
      const unmount = mount();

      await vi.waitFor(() => {
        expect(store.replayMode).toBe(true);
      });
      // the replay's own puzzle_size (3), not the stored numLines (5).
      expect(store.numLines).toBe(3);
      unmount();
    });

    it('prepares cage mode and preloads the first unlocked cage image', async () => {
      localStorage.setItem('enableCageMode', 'true');
      localStorage.setItem('_xcu', btoa('0,1'));
      const store = useBaseStore();
      const loadUnlockedSpy = vi.spyOn(store, 'loadUnlockedCagesFromLocalStorage');
      const prepareSpy = vi.spyOn(store, 'doPrepareCageMode');
      const preloadSpy = vi.spyOn(store, 'preloadImage').mockImplementation(() => undefined);
      const unmount = mount();

      expect(loadUnlockedSpy).toHaveBeenCalledTimes(1);
      expect(prepareSpy).toHaveBeenCalledTimes(1);
      // The source waits a real 1000ms before preloading; vi.waitFor's own default
      // timeout is close enough to that to race it, so give it explicit headroom.
      await vi.waitFor(() => {
        expect(preloadSpy).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
      expect(preloadSpy).toHaveBeenCalledWith(CAGES_PATH_ARR[0]);
      unmount();
    });

    it('skips the preload timer when no cages have been unlocked yet', async () => {
      localStorage.setItem('enableCageMode', 'true');
      const store = useBaseStore();
      const preloadSpy = vi.spyOn(store, 'preloadImage').mockImplementation(() => undefined);
      const unmount = mount();

      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(preloadSpy).not.toHaveBeenCalled();
      unmount();
    });
  });
});

describe('getSquareSize', () => {
  function setWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it.each([
    { proMode: true, numLines: 3, cageAdd: 56 },
    { proMode: true, numLines: 4, cageAdd: 22 },
    { proMode: true, numLines: 5, cageAdd: 1 },
    { proMode: true, numLines: 6, cageAdd: -12 },
    { proMode: true, numLines: 7, cageAdd: -20 },
    { proMode: true, numLines: 8, cageAdd: -28 },
    { proMode: false, numLines: 3, cageAdd: 45 },
    { proMode: false, numLines: 4, cageAdd: 12 },
    { proMode: false, numLines: 5, cageAdd: -8 },
    { proMode: false, numLines: 6, cageAdd: -21 },
    { proMode: false, numLines: 7, cageAdd: -31 },
    { proMode: false, numLines: 8, cageAdd: -38 }
  ])('computes the fixed board size for proMode=$proMode, numLines=$numLines', ({ proMode, numLines, cageAdd }) => {
    // Width outside [370, 820] window and >820 uses "80 + cageAdd" directly, making
    // cageAdd (and therefore which switch case fired) directly observable in the result.
    setWidth(900);
    const store = useBaseStore();
    store.proMode = proMode;
    store.numLines = numLines;
    const [{ squareSize }, unmount] = withSetup(() => getSquareSize());
    expect(squareSize.value).toBe(80 + cageAdd);
    unmount();
  });

  it('shrinks to fit a pro-mode board below 370px wide', () => {
    setWidth(300);
    const store = useBaseStore();
    store.proMode = true;
    store.numLines = 4;
    store.spaceBetween = 8;
    const [{ squareSize }, unmount] = withSetup(() => getSquareSize());
    expect(squareSize.value).toBe(Math.floor((300 - (40 + 40)) / 4));
    unmount();
  });

  it('shrinks to fit a non-pro-mode board below 370px wide, with extra margin', () => {
    setWidth(300);
    const store = useBaseStore();
    store.proMode = false;
    store.numLines = 4;
    store.spaceBetween = 8;
    const [{ squareSize }, unmount] = withSetup(() => getSquareSize());
    expect(squareSize.value).toBe(Math.floor((300 - (40 + 70)) / 4));
    unmount();
  });

  it('computes the mid-small-screen size between 371px and 480px wide', () => {
    setWidth(450);
    const store = useBaseStore();
    store.numLines = 4;
    store.spaceBetween = 8;
    const [{ squareSize }, unmount] = withSetup(() => getSquareSize());
    expect(squareSize.value).toBe(Math.floor((450 - (40 + 50)) / 4));
    unmount();
  });

  it('uses the fixed tablet-range size between 600px and 820px wide', () => {
    setWidth(700);
    const store = useBaseStore();
    store.proMode = false;
    store.numLines = 4;
    const [{ squareSize }, unmount] = withSetup(() => getSquareSize());
    expect(squareSize.value).toBe(100 + 12);
    unmount();
  });

  it('reacts to the puzzle size changing after the composable is created', () => {
    setWidth(900);
    const store = useBaseStore();
    store.proMode = false;
    store.numLines = 4;
    const [{ squareSize }, unmount] = withSetup(() => getSquareSize());
    expect(squareSize.value).toBe(80 + 12);

    store.numLines = 3;
    expect(squareSize.value).toBe(80 + 45);
    unmount();
  });
});
