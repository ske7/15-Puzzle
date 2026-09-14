import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { patchUserScramble, postFMCBlitz, postGame, postUserScramble } from '../useFetching';

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function errResponse(error = 'boom') {
  return { ok: false, status: 500, statusText: 'Server Error', json: () => Promise.resolve({ status: 'error', error }) };
}

describe('useFetching', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // These all post in the background after a solve, so the store's lastError is the only
  // route a failure has to the player - it used to be written to a ref nothing read.
  describe('reporting a failed background post', () => {
    it.each([
      { name: 'postGame', message: 'Could not save your last solve',
        run: () => { postGame({ time: 1, moves: 1, control_type: 'mouse', consecutive_solves: 1 }, 'k') } },
      { name: 'postFMCBlitz', message: 'Could not save your blitz result',
        run: () => { postFMCBlitz({ moves: 10, time: 5000, session_id: 'sess' }) } },
      { name: 'patchUserScramble', message: 'Could not update the scramble',
        run: () => { patchUserScramble({ id: 1 }) } }
    ])('$name tells the player when the post fails', async ({ message, run }) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse()));
      const store = useBaseStore();
      run();
      await vi.waitFor(() => {
        expect(store.lastError).toBe(message);
      });
    });

    it('says nothing when the post succeeds', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      postFMCBlitz({ moves: 10, time: 5000, session_id: 'sess' });
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      expect(store.lastError).toBe('');
    });

    it('clears a previous failure once a request succeeds again', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse()));
      const store = useBaseStore();
      postFMCBlitz({ moves: 1, time: 1, session_id: 's' });
      await vi.waitFor(() => {
        expect(store.lastError).not.toBe('');
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 })));
      patchUserScramble({ id: 1 });
      await vi.waitFor(() => {
        expect(store.lastError).toBe('');
      });
    });
  });

  describe('postFMCBlitz', () => {
    it('posts the blitz payload with the current token', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      postFMCBlitz({ moves: 10, time: 5000, session_id: 'sess' });
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('/fmc_blitz');
    });

    it('swallows a failed blitz post without throwing', async () => {
      const fetchMock = vi.fn().mockResolvedValue(errResponse());
      vi.stubGlobal('fetch', fetchMock);
      expect(() => {
        postFMCBlitz({ moves: 10, time: 5000, session_id: 'sess' });
      }).not.toThrow();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it('sends a second call while the first is still in flight', () => {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined));
      vi.stubGlobal('fetch', fetchMock);
      postFMCBlitz({ moves: 10, time: 5000, session_id: 'sess' });
      postFMCBlitz({ moves: 12, time: 6000, session_id: 'sess' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('postGame', () => {
    it('records the public game id from the response outside pro mode', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 1, public_id: 'pub-1' }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      postGame({
        time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 0,
      }, 'key');
      await vi.waitFor(() => {
        expect(store.lastGameID).toBe('pub-1');
      });
    });

    it('updates opt_m and averages in pro mode on a 3x3 board', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1, public_id: 'pub-1', opt_m: 12 }))
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1, stats: {}, was_avg_records: [] }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.proMode = true;
      store.numLines = 3;
      postGame({
        time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 0,
      }, 'key');
      await vi.waitFor(() => {
        expect(store.opt_m).toBe(12);
      });
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
      const [updateStatsUrl] = fetchMock.mock.calls[1] as [string];
      expect(updateStatsUrl).toContain('/update_stats');
    });

    it('ignores opt_m updates in pro mode on boards other than 3x3', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1, opt_m: 12 }))
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1, stats: {}, was_avg_records: [] }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.proMode = true;
      store.numLines = 4;
      postGame({
        time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 0,
      }, 'key');
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
      expect(store.opt_m).toBe(0);
    });

    it('also posts an FMC blitz record when the blitz scramble set just completed', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1, opt_m: 1 }))
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1, stats: {}, was_avg_records: [] }))
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 2 }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.proMode = true;
      store.numLines = 3;
      store.fmcBlitz = true;
      store.solvedPuzzlesInMarathon = 50;
      store.blitzScrambleCount = 50;
      postGame({
        time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 0, session_id: 'sess',
      }, 'key');
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });
      const [blitzUrl] = fetchMock.mock.calls[2] as [string];
      expect(blitzUrl).toContain('/fmc_blitz');
    });

    it('swallows a failed game post without throwing', async () => {
      const fetchMock = vi.fn().mockResolvedValue(errResponse());
      vi.stubGlobal('fetch', fetchMock);
      expect(() => {
        postGame({
          time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 0,
        }, 'key');
      }).not.toThrow();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it('swallows a failed update_stats post without throwing', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(okResponse({ status: 'ok', game_id: 1 }))
        .mockResolvedValueOnce(errResponse());
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.proMode = true;
      store.numLines = 4;
      postGame({
        time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 0,
      }, 'key');
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });

    // Two solves finishing within one round trip of each other - common in a 3x3 blitz, or
    // on a slow connection - must both reach the server.
    it('sends the next solve while the previous one is still being saved', async () => {
      const responses: ((value: unknown) => void)[] = [];
      const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { responses.push(resolve) }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.proMode = true;
      store.numLines = 3;

      postGame({ time: 1000, moves: 10, control_type: 'mouse', consecutive_solves: 1 }, 'key');
      postGame({ time: 1100, moves: 11, control_type: 'mouse', consecutive_solves: 2 }, 'key');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const sentGames = fetchMock.mock.calls.map(([, init]) =>
        (JSON.parse((init as RequestInit).body as string) as { game: { moves: number } }).game.moves);
      expect(sentGames).toEqual([10, 11]);

      // Each save still follows through to its own averages update.
      responses[0](okResponse({ status: 'ok', game_id: 1, opt_m: 8 }));
      responses[1](okResponse({ status: 'ok', game_id: 2, opt_m: 9 }));
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(4);
      });
      const urls = fetchMock.mock.calls.map(([url]) => url as string);
      expect(urls.filter((url) => url.endsWith('/update_stats'))).toHaveLength(2);
      responses[2](okResponse({ status: 'ok', game_id: 1, stats: {}, was_avg_records: [] }));
      responses[3](okResponse({ status: 'ok', game_id: 2, stats: {}, was_avg_records: [] }));
      await vi.waitFor(() => {
        expect(store.opt_m).toBe(9);
      });
    });
  });

  describe('postUserScramble', () => {
    it('stores the returned scramble id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0, user_scramble_id: 42 }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      await postUserScramble({ puzzle_size: 4 });
      expect(store.userScrambleId).toBe(42);
    });

    it('falls back to the "no saved scramble" sentinel when the response omits the id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 }));
      vi.stubGlobal('fetch', fetchMock);
      const store = useBaseStore();
      store.token = 'tok';
      store.userScrambleId = 42;
      await postUserScramble({ puzzle_size: 4 });
      expect(store.userScrambleId).toBe(0);
    });

    it('swallows a failed post without throwing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse()));
      await expect(postUserScramble({ puzzle_size: 4 })).resolves.toBeUndefined();
    });

    it('sends a second call while the first is still in flight, and settles both', async () => {
      const responses: ((value: unknown) => void)[] = [];
      const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { responses.push(resolve) }));
      vi.stubGlobal('fetch', fetchMock);
      const firstCall = postUserScramble({ puzzle_size: 4 });
      const secondCall = postUserScramble({ puzzle_size: 4 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      responses[0](okResponse({ status: 'ok', game_id: 0, user_scramble_id: 1 }));
      responses[1](okResponse({ status: 'ok', game_id: 0, user_scramble_id: 2 }));
      await Promise.all([firstCall, secondCall]);
      expect(useBaseStore().userScrambleId).toBe(2);
    });
  });

  describe('patchUserScramble', () => {
    it('sends a patch request for the scramble', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 }));
      vi.stubGlobal('fetch', fetchMock);
      patchUserScramble({ puzzle_size: 4, id: 7 });
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('PATCH');
    });

    it('swallows a failed patch without throwing', async () => {
      const fetchMock = vi.fn().mockResolvedValue(errResponse());
      vi.stubGlobal('fetch', fetchMock);
      expect(() => {
        patchUserScramble({ puzzle_size: 4, id: 7 });
      }).not.toThrow();
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it('sends a second call while the first is still in flight', () => {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined));
      vi.stubGlobal('fetch', fetchMock);
      patchUserScramble({ puzzle_size: 4, id: 7, best_moves: 20 });
      patchUserScramble({ puzzle_size: 4, id: 7, best_moves: 18 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
