import { createPinia, setActivePinia } from 'pinia';
import { useEventBus } from '@vueuse/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../base';
import * as utils from '../../utils';
import type { AverageStats, Response, WasAvgRecord } from '@/types';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('useBaseStore - averages, session, network-backed actions', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('averages', () => {
    it('setCurrentAverages returns early without a token, still rotating prevAverages', () => {
      const store = useBaseStore();
      store.currentAverages = [{ code: -1, puzzle_size: 4 }];
      store.setCurrentAverages({} satisfies AverageStats);
      expect(store.prevAverages).toEqual([{ code: -1, puzzle_size: 4 }]);
      expect(store.currentAverages).toEqual([]);
    });

    it('setCurrentAverages clears prevAverages when clearPrev is true', () => {
      const store = useBaseStore();
      store.prevAverages = [{ code: -1, puzzle_size: 4 }];
      store.setCurrentAverages({} satisfies AverageStats, true);
      expect(store.prevAverages).toEqual([]);
    });

    it('setCurrentAverages populates entries with a token', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.setCurrentAverages({ aoSt: '1', ao5t: '2' } satisfies AverageStats);
      expect(store.currentAverages).toHaveLength(5);
      expect(store.currentAverages[0].time).toBe('1');
    });

    it('setCurrentAverages adds a 1000 entry in g1000Mode', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.g1000Mode = true;
      store.setCurrentAverages({} satisfies AverageStats);
      expect(store.currentAverages).toHaveLength(6);
      expect(store.currentAverages[5].code).toBe(1000);
    });

    it('setWasAvgRecords defaults to an empty array', () => {
      const store = useBaseStore();
      store.setWasAvgRecords();
      expect(store.wasAvgRecords).toEqual([]);
    });

    it('setWasAvgRecords stores the given records', () => {
      const store = useBaseStore();
      const records: WasAvgRecord[] = [{ type: 'time', record_time: true, record_moves: false, record_tps: false }];
      store.setWasAvgRecords(records);
      expect(store.wasAvgRecords).toEqual(records);
    });

    it('incConsecutiveSolves increments the counter', () => {
      const store = useBaseStore();
      store.incConsecutiveSolves();
      expect(store.consecutiveSolves).toBe(1);
    });

    it('resetConsecutiveSolves zeroes the counter and clears averages', () => {
      const store = useBaseStore();
      store.consecutiveSolves = 3;
      store.wasAvgRecords = [{ type: 'time', record_time: true, record_moves: false, record_tps: false }];
      store.resetConsecutiveSolves();
      expect(store.consecutiveSolves).toBe(0);
      expect(store.wasAvgRecords).toEqual([]);
    });
  });

  describe('setSessionId', () => {
    it('does nothing without a token', () => {
      const store = useBaseStore();
      store.userName = 'demo';
      store.setSessionId();
      expect(store.sessionId).toBeUndefined();
    });

    it('does nothing without a userName', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.setSessionId();
      expect(store.sessionId).toBeUndefined();
    });

    it('generates a sessionId on the first consecutive solve', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.userName = 'demo';
      store.consecutiveSolves = 1;
      store.setSessionId();
      expect(store.sessionId).toBeDefined();
      expect(store.sessionId).not.toContain('=');
    });

    it('persists session data to localStorage when keepSession is enabled', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.userName = 'demo';
      store.keepSession = true;
      store.consecutiveSolves = 2;
      store.sessionId = 'abc123';
      store.setSessionId();
      expect(localStorage.getItem('_xss')).toBe(btoa('abc123'));
      expect(localStorage.getItem('_xcs')).toBe(btoa('2'));
    });

    it('skips persisting the session id when it is still undefined', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.userName = 'demo';
      store.keepSession = true;
      store.consecutiveSolves = 5;
      store.setSessionId();
      expect(localStorage.getItem('_xss')).toBeNull();
      expect(localStorage.getItem('_xcs')).toBe(btoa('5'));
    });

    it('skips persisting entirely in g1000Mode', () => {
      const store = useBaseStore();
      store.token = 'tok';
      store.userName = 'demo';
      store.keepSession = true;
      store.g1000Mode = true;
      store.consecutiveSolves = 2;
      store.setSessionId();
      expect(localStorage.getItem('_xcs')).toBeNull();
    });
  });

  describe('loadAverages', () => {
    it('does nothing outside pro mode', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.loadAverages();
      await Promise.resolve();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('restores session and fetches averages in pro mode', async () => {
      localStorage.setItem('_xcs', btoa('7'));
      localStorage.setItem('_xss', btoa('sess'));
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: {} }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = true;
      store.keepSession = true;
      store.loadAverages();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      expect(store.consecutiveSolves).toBe(7);
      expect(store.sessionId).toBe('sess');
    });

    it('fetches averages in pro mode without restoring session when keepSession is off', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: {} }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = true;
      store.marathonMode = true;
      store.loadAverages();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it('fetches averages without restoring session when the handoff keys are absent', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: {} }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = true;
      store.keepSession = true;
      store.loadAverages();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      expect(store.consecutiveSolves).toBe(0);
      expect(store.sessionId).toBeUndefined();
    });
  });

  describe('updateCurrentAverages', () => {
    it('does nothing without a token', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = true;
      store.updateCurrentAverages();
      await Promise.resolve();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does nothing outside pro mode even with a token', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = false;
      store.token = 'tok';
      store.updateCurrentAverages();
      await Promise.resolve();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches and replaces averages when in pro mode with a token', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: {} }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = true;
      store.token = 'tok';
      store.wasAvgRecords = [{ type: 'time', record_time: true, record_moves: false, record_tps: false }];
      store.updateCurrentAverages();
      await vi.waitFor(() => {
        expect(store.wasAvgRecords).toEqual([]);
      });
      expect(fetchMock).toHaveBeenCalled();
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('puzzle_type=standard');
    });

    it('requests marathon-type averages in marathon mode', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: {} }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.proMode = true;
      store.token = 'tok';
      store.marathonMode = true;
      store.updateCurrentAverages();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('puzzle_type=marathon');
    });
  });

  describe('initAfterNewPuzzleSize', () => {
    it('updates averages, resets session state, and emits a restart event', () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: {} }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.numLines = 6;
      store.proMode = true;
      store.token = 'tok';
      localStorage.setItem('_xss', 'x');
      localStorage.setItem('_xcs', 'y');

      const bus = useEventBus<string>('event-bus');
      const events: string[] = [];
      const stop = bus.on((event) => events.push(event));

      store.initAfterNewPuzzleSize();

      expect(localStorage.getItem('numLines')).toBe('6');
      expect(localStorage.getItem('_xss')).toBeNull();
      expect(localStorage.getItem('_xcs')).toBeNull();
      expect(events).toEqual(['restart']);
      stop();
    });

    it('skips updateCurrentAverages in playground mode', () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.playgroundMode = true;
      store.initAfterNewPuzzleSize();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('getNextG1000', () => {
    // The catch used to swallow the failure, so the promise still resolved and renewPuzzle
    // laid out a board from the *previous* scramble - handing the player the same puzzle
    // again at the wrong streak position, with nothing said.
    it('does not lay out a board when the next scramble fails to load', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        jsonResponse({ status: 'error', error: 'boom' }, false, 500)));
      const store = useBaseStore();
      store.token = 'tok';
      store.g1000Mode = true;
      store.numLines = 3;
      store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      store.currentOrders = [8, 7, 6, 5, 4, 3, 2, 1, 0];

      store.renewPuzzle();

      await vi.waitFor(() => {
        expect(store.lastError).toBe('Could not load the next puzzle');
      });
      // untouched: setPuzzleData would have copied mixedOrders over it
      expect(store.currentOrders).toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0]);
    });

    it('lays out the new scramble when it loads', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        jsonResponse({ status: 'ok', game_id: 0, scramble: '2,1,3,4,5,6,7,8,0', id: 7 })));
      const store = useBaseStore();
      store.token = 'tok';
      store.g1000Mode = true;
      store.numLines = 3;
      store.currentOrders = [8, 7, 6, 5, 4, 3, 2, 1, 0];

      store.renewPuzzle();

      await vi.waitFor(() => {
        expect(store.currentOrders).toEqual([2, 1, 3, 4, 5, 6, 7, 8, 0]);
      });
      expect(store.consecutiveSolves).toBe(7);
      expect(store.lastError).toBe('');
    });
  });

  describe('renewPuzzle / mixAndCheckSolvable', () => {
    it('generates a solvable, non-trivial standard puzzle', () => {
      const store = useBaseStore();
      store.numLines = 4;
      store.renewPuzzle();
      expect(store.mixedOrders).toHaveLength(16);
      expect(store.currentOrders).toEqual(store.mixedOrders);
      expect(store.opt_m).toBe(0);
    });

    it('reshuffles when the first attempt is too trivial (low Manhattan distance)', () => {
      const store = useBaseStore();
      store.numLines = 4;
      // A solved board has Manhattan distance 0, forcing exactly one reshuffle
      // before falling through to the real (solvable) shuffle.
      vi.spyOn(utils, 'generateAndShuffle').mockReturnValueOnce(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
      );
      store.renewPuzzle();
      expect(store.mixedOrders).toHaveLength(16);
    });

    it('reshuffles when the first attempt is already sorted (ignoring the blank)', () => {
      const store = useBaseStore();
      store.numLines = 4;
      // Every tile is off by exactly one slot here, so slice(0, -1) is sorted
      // but the Manhattan distance is well above the trivial threshold.
      vi.spyOn(utils, 'generateAndShuffle').mockReturnValueOnce(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      );
      store.renewPuzzle();
      expect(store.mixedOrders).toHaveLength(16);
    });

    it('resets doneFirstMove for fmcBlitz mode', () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.doneFirstMove = true;
      store.renewPuzzle();
      expect(store.doneFirstMove).toBe(false);
    });

    it('replays a scramble from a saved replay game', () => {
      const store = useBaseStore();
      store.replayMode = true;
      store.numLines = 3;
      store.repGame = {
        time: 0,
        moves: 0,
        puzzle_size: 3,
        puzzle_type: 'standard',
        control_type: 'mouse',
        consecutive_solves: 0,
        // Must be a solvable permutation: renewPuzzle() loops on mixAndCheckSolvable()
        // until it succeeds, and replay mode always regenerates the same fixed
        // scramble, so an unsolvable one here would spin forever.
        scramble: '2,1,4,3,5,6,7,8,0',
        solve_path: '',
        name: '',
        tps: '0',
        created_at: '',
        opt_moves: 0,
      };
      store.renewPuzzle();
      expect(store.mixedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
    });

    it('replays the first leg of a marathon replay scramble', () => {
      const store = useBaseStore();
      store.replayMode = true;
      store.marathonReplay = true;
      store.numLines = 3;
      store.repGame = {
        time: 0,
        moves: 0,
        puzzle_size: 3,
        puzzle_type: 'marathon',
        control_type: 'mouse',
        consecutive_solves: 0,
        scramble: '2,1,4,3,5,6,7,8,0;1,2,3,4,5,6,7,8,0',
        solve_path: '',
        name: '',
        tps: '0',
        created_at: '',
        opt_moves: 0,
      };
      store.renewPuzzle();
      expect(store.mixedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
    });

    it('replays the marathon leg after the ones already solved', () => {
      const store = useBaseStore();
      store.replayMode = true;
      store.marathonReplay = true;
      store.numLines = 3;
      store.repGame = {
        time: 19275,
        moves: 188,
        puzzle_size: 3,
        puzzle_type: 'marathon',
        control_type: 'touch',
        consecutive_solves: 1,
        scramble: '2,0,3,1,6,7,4,5,8;0,1,4,6,5,3,8,2,7;7,0,2,8,3,4,5,6,1',
        solve_path: '',
        name: '',
        tps: '9.754',
        created_at: '',
        opt_moves: 0,
      };
      store.solvedPuzzlesInMarathon = 2;
      store.renewPuzzle();
      expect(store.mixedOrders).toEqual([7, 0, 2, 8, 3, 4, 5, 6, 1]);
      expect(store.currentOrders).toEqual([7, 0, 2, 8, 3, 4, 5, 6, 1]);
    });

    it('reuses savedOrders in playground mode when present', () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      store.numLines = 3;
      // Must be solvable - see the comment on the replay scramble test above.
      store.savedOrders = [2, 1, 4, 3, 5, 6, 7, 8, 0];
      store.renewPuzzle();
      expect(store.mixedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
      expect(store.savedOrders).toEqual(store.mixedOrders);
    });

    it('generates and flags DB-check when playground mode has no savedOrders', () => {
      const store = useBaseStore();
      store.playgroundMode = true;
      store.numLines = 3;
      store.savedOrders = [];
      store.renewPuzzle();
      expect(store.checkUserScrambleInDB).toBe(false);
      expect(store.mixedOrders).toHaveLength(9);
    });

    it('fetches the next g1000 puzzle', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
        status: 'ok', game_id: 0, scramble: '2,1,3,4,5,6,7,8,0', id: 5,
      }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.g1000Mode = true;
      store.numLines = 3;
      store.renewPuzzle();
      await vi.waitFor(() => {
        expect(store.mixedOrders).toEqual([2, 1, 3, 4, 5, 6, 7, 8, 0]);
      });
      expect(store.consecutiveSolves).toBe(5);
    });

    it('enables noPlayMode once g1000 reaches game 1000', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
        status: 'ok', game_id: 0, scramble: '2,1,3,4,5,6,7,8,0', id: 1000,
      }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.g1000Mode = true;
      store.numLines = 3;
      store.renewPuzzle();
      await vi.waitFor(() => {
        expect(store.noPlayMode).toBe(true);
      });
    });

    it('logs and swallows a g1000 fetch failure', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const store = useBaseStore();
      store.g1000Mode = true;
      store.renewPuzzle();
      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalled();
      });
    });
  });

  describe('playgroundModeRenew', () => {
    it('does nothing when checkUserScrambleInDB is false', () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.checkUserScrambleInDB = false;
      store.playgroundModeRenew();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does nothing without a token even when a DB check is requested', () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.checkUserScrambleInDB = true;
      store.mixedOrders = [1, 2, 0];
      store.playgroundModeRenew();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(store.checkUserScrambleInDB).toBe(false);
    });

    it('fetches scramble stats and applies opt_m when a token is present', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
        status: 'ok',
        game_id: 0,
        opt_m: 7,
        stats: {
          id: 3, best_time: 100, best_time_moves: 10, best_moves: 8, solve_path: 'UDLR', public_id: 'pub',
        },
      }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.checkUserScrambleInDB = true;
      store.mixedOrders = [1, 2, 0];
      store.playgroundModeRenew();
      await vi.waitFor(() => {
        expect(store.opt_m).toBe(7);
      });
      expect(store.userScrambleId).toBe(3);
      expect(store.playgroundSolvePath).toEqual(['U', 'D', 'L', 'R']);
      expect(store.publicId).toBe('pub');
    });

    it('resets playground stats when the server has none for this scramble', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, stats: undefined }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.checkUserScrambleInDB = true;
      store.mixedOrders = [1, 2, 0];
      store.playgroundBestTime = 999;
      store.playgroundModeRenew();
      await vi.waitFor(() => {
        expect(store.playgroundBestTime).toBe(0);
      });
      expect(store.userScrambleId).toBe(0);
      expect(store.publicId).toBe('');
    });

    it('logs and swallows a scramble-stats fetch failure', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
      const store = useBaseStore();
      store.token = 'tok';
      store.checkUserScrambleInDB = true;
      store.mixedOrders = [1, 2, 0];
      store.playgroundModeRenew();
      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalled();
      });
    });
  });

  describe('updatePlaygroundStats', () => {
    it('resets fields when stats is null', () => {
      const store = useBaseStore();
      store.playgroundBestTime = 5;
      store.publicId = 'x';
      store.updatePlaygroundStats({ status: 'ok', game_id: 0, stats: undefined });
      expect(store.playgroundBestTime).toBe(0);
      expect(store.publicId).toBe('');
    });

    it('applies stats fields, skipping id and solve_path when absent', () => {
      const store = useBaseStore();
      store.updatePlaygroundStats({
        status: 'ok',
        game_id: 0,
        stats: { best_time: 10, best_time_moves: 5, best_moves: 3 },
      });
      expect(store.playgroundBestTime).toBe(10);
      expect(store.playgroundSolvePath).toEqual([]);
      expect(store.userScrambleId).toBe(0);
    });

    it('zeroes the best time/moves when the stats object omits them', () => {
      const store = useBaseStore();
      store.playgroundBestTime = 5;
      store.playgroundBestTimeMoves = 5;
      store.playgroundBestMoves = 5;
      // A scramble that exists in the DB but has no recorded solve yet.
      store.updatePlaygroundStats({
        status: 'ok',
        game_id: 0,
        stats: { public_id: 'abc' },
      });
      expect(store.playgroundBestTime).toBe(0);
      expect(store.playgroundBestTimeMoves).toBe(0);
      expect(store.playgroundBestMoves).toBe(0);
      expect(store.publicId).toBe('abc');
    });
  });

  describe('initStore', () => {
    it('resets core game fields and reloads records/puzzle', () => {
      const store = useBaseStore();
      store.time = 100;
      store.movesCount = 5;
      store.newTimeRecord = true;
      store.numLines = 3;
      store.initStore();
      expect(store.time).toBe(0);
      expect(store.movesCount).toBe(0);
      expect(store.newTimeRecord).toBe(false);
      expect(store.mixedOrders.length).toBeGreaterThan(0);
    });

    it('primes FMC blitz scramble count when fmcBlitz mode is on', () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      store.numLines = 3;
      store.initStore();
      expect(store.blitzScrambleCount).toBe(50);
      expect(store.blitzTime).toBe(0);
    });
  });

  describe('setPuzzleData', () => {
    it('restores session data from the short-lived localStorage handoff keys', () => {
      const store = useBaseStore();
      store.keepSession = true;
      store.mixedOrders = [1, 2, 0];
      localStorage.setItem('_xcs', btoa('4'));
      localStorage.setItem('_xss', btoa('sess-id'));
      store.setPuzzleData();
      expect(store.consecutiveSolves).toBe(4);
      expect(store.sessionId).toBe('sess-id');
      expect(localStorage.getItem('_xcs')).toBeNull();
      expect(localStorage.getItem('_xss')).toBeNull();
    });

    it('skips restoring session data in g1000Mode', () => {
      const store = useBaseStore();
      store.g1000Mode = true;
      store.keepSession = true;
      store.mixedOrders = [1, 2, 0];
      localStorage.setItem('_xcs', btoa('4'));
      store.setPuzzleData();
      expect(store.consecutiveSolves).toBe(0);
    });

    it('leaves consecutiveSolves untouched when handoff keys are absent', () => {
      const store = useBaseStore();
      store.keepSession = true;
      store.mixedOrders = [1, 2, 0];
      store.setPuzzleData();
      expect(store.consecutiveSolves).toBe(0);
    });
  });
});
