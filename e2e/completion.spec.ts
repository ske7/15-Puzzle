import { expect, test, type Page, type Route } from '@playwright/test';
import { API_BASE, jsonRoute, marathonRepGameFixture, mockApi, repGameFixture } from './fixtures/api';
import { MOVE_LETTER, solve3x3 } from './helpers/solver';

// Baseline for refactoring useWatchGameState: each way a game can finish, recorded as what is
// sent to the server and what the app ends up showing and storing. Scrambles are random, so
// values that follow from the solve are recorded as which solve they match, and anything that
// matches none shows up as WRONG. Cage mode is not covered: it only runs 4x4, which a test
// cannot brute-force. Re-record deliberately with
// `npx playwright test e2e/completion.spec.ts --project=chromium --update-snapshots`.

type Handlers = NonNullable<Parameters<typeof mockApi>[1]>;

interface Solve {
  scramble: string;
  path: string;
  moves: number;
}

interface Recorder {
  requests: { method: string; path: string; body: unknown }[];
  solves: Solve[];
}

const loggedInUser = jsonRoute({ status: 'ok', game_id: 0, token: 'fake-token', name: 'tester' });
const OPT_M = 17;

function savedGame(): Handlers[string] {
  let id = 0;
  return async (route: Route) => {
    id += 1;
    await route.fulfill({ json: { status: 'ok', game_id: id, public_id: `pub-${id}`, opt_m: OPT_M } });
  };
}

async function open(page: Page, url: string, storage: Record<string, string>, api: Handlers): Promise<Recorder> {
  const recorder: Recorder = { requests: [], solves: [] };
  page.on('request', (request) => {
    if (request.url().startsWith(API_BASE)) {
      const parsed = new URL(request.url());
      recorder.requests.push({
        method: request.method(),
        path: parsed.pathname + (parsed.search === '' ? '' : '?…'),
        body: request.postData() === null ? null : request.postDataJSON() as unknown
      });
    }
  });
  await mockApi(page, api);
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded') === null) {
      sessionStorage.setItem('seeded', 'yes');
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
    }
  }, { numLines: '3', proMode: 'true', hoverOnControl: 'true', ...storage });
  await page.goto(url);
  await expect(page.locator('.board')).toBeVisible();
  return recorder;
}

// Real key presses, dispatched inside the page so a 50-scramble blitz fits its 180s clock.
async function solveCurrent(page: Page, recorder: Recorder): Promise<void> {
  const board = await page.evaluate(() => window.__cage15Test__!.getCurrentOrders());
  const keys = solve3x3(board);
  recorder.solves.push({ scramble: board.join(','), path: keys.map((key) => MOVE_LETTER[key]).join(''), moves: keys.length });
  await page.evaluate((codes) => {
    for (const code of codes) {
      dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
    }
  }, keys);
}

async function waitForNextScramble(page: Page, previous: string): Promise<void> {
  await page.waitForFunction((last) => window.__cage15Test__!.getMixedOrders().join(',') !== last, previous);
}

// Quiet once no new API request has started for a whole poll interval.
async function settle(requestCount: () => number): Promise<void> {
  let seen = -1;
  await expect.poll(() => {
    const now = requestCount();
    const stable = now === seen;
    seen = now;
    return stable;
  }, { intervals: [300] }).toBe(true);
}

const BODY_MOVE_KEYS = ['moves', 'best_moves', 'best_time_moves'];
const TOTAL_MOVE_KEYS = ['blitzMovesCount', 'fmcBlitzMovesRecord'];
const ANY_MOVE_KEYS = ['movesRecord', 'playgroundBestMoves', 'playgroundBestTimeMoves'];
const TIME_KEYS = ['time', 'best_time', 'playgroundBestTime', 'timeRecord'];

// A request body names its scramble, so its moves and path are checked against that solve;
// a body without one (a PATCH, the blitz result) is checked against every solve together.
function describeBody(body: unknown, solves: Solve[]): unknown {
  if (body === null || typeof body !== 'object') {
    return body;
  }
  const entries = Object.entries(body as Record<string, unknown>);
  const scramble = entries.find(([key]) => key === 'scramble')?.[1];
  const index = solves.findIndex((solve) => solve.scramble === scramble);
  const context: BodyContext = index >= 0
    ? { label: `<solve ${index + 1}>`, moves: solves[index].moves, path: solves[index].path, knownScramble: true }
    : {
        label: '<all solves>',
        moves: solves.reduce((sum, solve) => sum + solve.moves, 0),
        path: solves.map((solve) => solve.path).join(';'),
        knownScramble: typeof scramble !== 'string' || scramble === solves.map((solve) => solve.scramble).join(';')
      };
  return Object.fromEntries(entries.map(([key, value]) => [key, describeField(key, value, context, solves)]));
}

interface BodyContext {
  label: string;
  moves: number;
  path: string;
  knownScramble: boolean;
}

function describeField(key: string, value: unknown, context: BodyContext, solves: Solve[]): unknown {
  if (typeof value === 'object' && value !== null) {
    return describeBody(value, solves);
  }
  const matches = (ok: boolean, what: string): string => (ok ? `${context.label} ${what}` : `WRONG:${String(value)}`);
  const describers: Record<string, () => unknown> = {
    scramble: () => matches(context.knownScramble, 'scramble'),
    solve_path: () => matches(value === context.path, 'path'),
    session_id: () => (typeof value === 'string' ? '<session>' : value)
  };
  for (const moveKey of BODY_MOVE_KEYS) {
    describers[moveKey] = () => matches(value === context.moves, 'moves');
  }
  for (const timeKey of TIME_KEYS) {
    describers[timeKey] = () => (typeof value === 'number' && value > 0 ? '<time>' : value);
  }
  return (describers[key] ?? (() => value))();
}

function describeStore(store: Record<string, unknown>, solves: Solve[]): Record<string, unknown> {
  const total = solves.reduce((sum, solve) => sum + solve.moves, 0);
  const last = solves.at(-1)?.moves;
  return Object.fromEntries(Object.entries(store).map(([key, value]) => {
    if (typeof value !== 'number' || value === 0) return [key, value];
    if (key === 'movesCount') {
      if (value === total) return [key, '<all solves moves>'];
      return [key, value === last ? '<last solve moves>' : `WRONG:${value}`];
    }
    if (TOTAL_MOVE_KEYS.includes(key)) return [key, value === total ? '<all solves moves>' : `WRONG:${value}`];
    if (ANY_MOVE_KEYS.includes(key)) return [key, solves.some((solve) => solve.moves === value) || value === total ? '<a solve moves>' : `WRONG:${value}`];
    if (TIME_KEYS.includes(key)) return [key, '<time>'];
    return [key, value];
  }));
}

async function record(page: Page, recorder: Recorder): Promise<string> {
  const state = await page.evaluate(() => ({
    winModal: document.querySelector('.win-modal') !== null,
    errorLine: document.querySelector('.last-error')?.textContent.trim() ?? null,
    store: window.__cage15Test__!.readStore([
      'isDone', 'isTimeFailed', 'showWinModal', 'consecutiveSolves', 'solvedPuzzlesInMarathon', 'blitzScrambleCount',
      'movesCount', 'blitzMovesCount', 'newTimeRecord', 'newMovesRecord', 'newFMCBlitzMovesRecord', 'movesRecord',
      'fmcBlitzMovesRecord', 'timeRecord', 'lastGameID', 'opt_m', 'userScrambleId', 'publicId',
      'playgroundBestTime', 'playgroundBestMoves', 'playgroundBestTimeMoves', 'newPlaygroundTimeRecord',
      'newPlaygroundMovesRecord', 'lastError'
    ]),
    storageKeys: Object.keys(localStorage).sort((a, b) => a.localeCompare(b))
  }));
  const counted = new Map<string, number>();
  for (const { method, path } of recorder.requests) {
    counted.set(`${method} ${path}`, (counted.get(`${method} ${path}`) ?? 0) + 1);
  }
  const lastOfEach = [...new Map(recorder.requests.filter((r) => r.body !== null)
    .map((r) => [`${r.method} ${r.path}`, r])).values()];
  const summary = {
    ...state,
    store: describeStore(state.store, recorder.solves),
    requestCounts: Object.fromEntries(counted),
    lastBodyOfEach: lastOfEach.map((r) => ({ [`${r.method} ${r.path}`]: describeBody(r.body, recorder.solves) }))
  };
  return `${JSON.stringify(summary, null, 2)}\n`;
}

test.describe('game completion', () => {
  test.describe.configure({ timeout: 240000 });

  test('standard-logged-out', async ({ page }) => {
    const recorder = await open(page, '/', {}, {});
    await solveCurrent(page, recorder);
    await expect(page.locator('.win-modal')).toBeVisible();
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('standard-logged-out.json');
  });

  test('standard-logged-in', async ({ page }) => {
    const recorder = await open(page, '/', { token: 'fake-token' }, {
      get_current_user: loggedInUser,
      game: savedGame(),
      update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
    });
    await solveCurrent(page, recorder);
    await expect(page.locator('.win-modal')).toBeVisible();
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('standard-logged-in.json');
  });

  test('classic-logged-in', async ({ page }) => {
    const recorder = await open(page, '/', { token: 'fake-token', proMode: 'false', hoverOnControl: 'false' }, {
      get_current_user: loggedInUser,
      game: savedGame()
    });
    await solveCurrent(page, recorder);
    await expect(page.locator('.win-modal')).toBeVisible({ timeout: 10000 });
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('classic-logged-in.json');
  });

  test('marathon-logged-in', async ({ page }) => {
    const recorder = await open(page, '/', { token: 'fake-token', marathonMode: 'true' }, {
      get_current_user: loggedInUser,
      game: savedGame(),
      update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
    });
    for (let puzzle = 1; puzzle <= 5; puzzle += 1) {
      const previous = (await page.evaluate(() => window.__cage15Test__!.getMixedOrders())).join(',');
      await solveCurrent(page, recorder);
      if (puzzle < 5) {
        await waitForNextScramble(page, previous);
      }
    }
    await expect(page.locator('.win-modal')).toBeVisible();
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('marathon-logged-in.json');
  });

  test('fmc-blitz-full-run', async ({ page }) => {
    const recorder = await open(page, '/', { token: 'fake-token', fmcBlitz: 'true' }, {
      get_current_user: loggedInUser,
      game: savedGame(),
      update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
    });
    const scrambles = await page.evaluate(() => window.__cage15Test__!.readStore(['blitzScrambleCount'])['blitzScrambleCount'] as number);
    for (let scramble = 1; scramble <= scrambles; scramble += 1) {
      const previous = (await page.evaluate(() => window.__cage15Test__!.getMixedOrders())).join(',');
      const saved = page.waitForResponse((response) => response.url() === `${API_BASE}/game`);
      await solveCurrent(page, recorder);
      await saved;
      if (scramble < scrambles) {
        await waitForNextScramble(page, previous);
      }
    }
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('fmc-blitz-full-run.json');
  });

  // The blitz result is sent once the server has saved the last scramble's game. A slow
  // answer must neither lose it when the player restarts first, nor send it more than once
  // when earlier answers also arrive after the run has ended.
  for (const { name, holdFrom, restartFirst } of [
    { name: 'fmc-blitz-restart-before-last-save', holdFrom: 50, restartFirst: true },
    { name: 'fmc-blitz-slow-server', holdFrom: 49, restartFirst: false }
  ]) {
    test(name, async ({ page }) => {
      let release: () => void = () => undefined;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let id = 0;
      const recorder = await open(page, '/', { token: 'fake-token', fmcBlitz: 'true' }, {
        get_current_user: loggedInUser,
        game: async (route) => {
          id += 1;
          const gameId = id;
          if (gameId >= holdFrom) {
            await released;
          }
          await route.fulfill({ json: { status: 'ok', game_id: gameId, public_id: `pub-${gameId}`, opt_m: OPT_M } });
        },
        update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
      });
      const scrambles = await page.evaluate(() => window.__cage15Test__!.readStore(['blitzScrambleCount'])['blitzScrambleCount'] as number);
      for (let scramble = 1; scramble <= scrambles; scramble += 1) {
        const previous = (await page.evaluate(() => window.__cage15Test__!.getMixedOrders())).join(',');
        const saved = scramble < holdFrom ? page.waitForResponse((response) => response.url() === `${API_BASE}/game`) : null;
        await solveCurrent(page, recorder);
        await saved;
        if (scramble < scrambles) {
          await waitForNextScramble(page, previous);
        }
      }
      await page.waitForFunction(() => window.__cage15Test__!.readStore(['isDone'])['isDone'] === true);
      await expect.poll(() => id).toBe(scrambles);
      if (restartFirst) {
        await page.keyboard.press('Space');
        await page.waitForFunction(() => window.__cage15Test__!.readStore(['solvedPuzzlesInMarathon'])['solvedPuzzlesInMarathon'] === 0);
      }
      release();
      await settle(() => recorder.requests.length);
      const posts = recorder.requests.filter((request) => request.path === '/fmc_blitz');
      expect({
        blitzResultPosts: posts.length,
        body: posts.map((post) => describeBody(post.body, recorder.solves))
      }).toEqual({
        blitzResultPosts: 1,
        body: [{ data: { moves: '<all solves> moves', time: '<time>', session_id: '<session>' } }]
      });
    });
  }

  test('playground-new-scramble', async ({ page }) => {
    const recorder = await open(page, '/?playground', { token: 'fake-token' }, {
      get_current_user: loggedInUser,
      user_scramble: async (route) => {
        const json = route.request().method() === 'POST'
          ? { status: 'ok', game_id: 0, user_scramble_id: 77 }
          : { status: 'ok', game_id: 0 };
        await route.fulfill({ json });
      }
    });
    await settle(() => recorder.requests.length);
    await solveCurrent(page, recorder);
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('playground-new-scramble.json');
  });

  test('playground-improved-scramble', async ({ page }) => {
    const recorder = await open(page, '/?playground', { token: 'fake-token', sharedPlaygroundScramble: '2,0,3,1,6,7,4,5,8' }, {
      get_current_user: loggedInUser,
      user_scramble: jsonRoute({
        status: 'ok',
        game_id: 0,
        stats: { id: 7, best_time: 999999, best_moves: 999, best_time_moves: 999, solve_path: 'R', public_id: 'pub-7' }
      })
    });
    await settle(() => recorder.requests.length);
    await solveCurrent(page, recorder);
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('playground-improved-scramble.json');
  });

  test('replay-walk', async ({ page }) => {
    const first = marathonRepGameFixture();
    const repGame = repGameFixture({
      scramble: first.scramble.split(';')[0],
      solve_path: first.solve_path.split(';')[0],
      moves: first.solve_path.split(';')[0].length,
      time: 2500
    });
    const recorder = await open(page, '/?game_id=42', {}, { game: jsonRoute({ status: 'ok', game_id: 0, stats: repGame }) });
    recorder.solves.push({ scramble: repGame.scramble, path: repGame.solve_path, moves: repGame.moves });
    await page.locator('.action-panel').getByRole('button', { name: 'f', exact: true }).click();
    await page.locator('.action-panel').getByRole('button', { name: 'Walk', exact: true }).click();
    await page.waitForFunction(() => window.__cage15Test__!.readStore(['isDone'])['isDone'] === true);
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('replay-walk.json');
  });

  test('g1000-logged-in', async ({ page }) => {
    const recorder = await open(page, '/?g1000', { token: 'fake-token' }, {
      get_current_user: loggedInUser,
      next_gt: jsonRoute({ status: 'ok', game_id: 0, scramble: '2,0,3,1,6,7,4,5,8', id: 5 }),
      game: savedGame(),
      update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
    });
    await page.waitForFunction(() => window.__cage15Test__!.getMixedOrders().join(',') === '2,0,3,1,6,7,4,5,8');
    await solveCurrent(page, recorder);
    await expect(page.locator('.win-modal')).toBeVisible();
    await settle(() => recorder.requests.length);
    expect(await record(page, recorder)).toMatchSnapshot('g1000-logged-in.json');
  });
});
