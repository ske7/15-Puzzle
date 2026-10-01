import { expect, test, type Page } from '@playwright/test';
import {
  API_BASE, jsonRoute, marathonRepGameFixture, mockApi, repGameFixture, userScrambleFixture
} from './fixtures/api';

// Baseline for refactoring startup (usePrepare.ts, App.vue): every way the app can be opened,
// recorded as the state it ends up in. Re-record deliberately with
// `npx playwright test e2e/startup.spec.ts --project=chromium --update-snapshots`.

type Handlers = NonNullable<Parameters<typeof mockApi>[1]>;

interface StartCase {
  name: string;
  url: string;
  storage?: Record<string, string>;
  loggedIn?: boolean;
  api?: Handlers;
  redirects?: boolean;
  fixedScramble?: boolean;
}

// Answered after the other startup requests: any later success clears lastError, so the order
// the responses arrive in would otherwise decide whether the error is recorded.
const failure = (): Handlers[string] => async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  await route.fulfill({ status: 500, json: { error: 'boom' } });
};

const loggedInUser = jsonRoute({ status: 'ok', game_id: 0, token: 'fake-token', name: 'tester' });

const cases: StartCase[] = [
  { name: 'first-visit', url: '/' },
  { name: 'returning-classic-5x5', url: '/', storage: { proMode: 'false', hoverOnControl: 'false', numLines: '5' } },
  { name: 'invalid-stored-size', url: '/', storage: { proMode: 'true', numLines: '11' } },
  { name: 'marathon-stored', url: '/', storage: { proMode: 'true', marathonMode: 'true' } },
  { name: 'logged-in', url: '/', loggedIn: true },
  { name: 'fmc-blitz-logged-out', url: '/', storage: { proMode: 'true', fmcBlitz: 'true' } },
  { name: 'fmc-blitz-logged-in-size-6', url: '/', loggedIn: true, storage: { proMode: 'true', fmcBlitz: 'true', numLines: '6' } },
  { name: 'retired-pro-link-over-stored-cage', url: '/?pro', storage: { proMode: 'false', enableCageMode: 'true' } },
  { name: 'retired-dark-link', url: '/?dark' },
  { name: 'cage-link', url: '/?cage' },
  { name: 'cage-stored-size-6', url: '/', storage: { proMode: 'false', enableCageMode: 'true', numLines: '6' } },
  { name: 'playground-logged-out', url: '/?playground' },
  {
    name: 'playground-logged-in-with-pasted-scramble',
    url: '/?playground',
    loggedIn: true,
    fixedScramble: true,
    storage: { sharedPlaygroundScramble: '15,1,9,4,6,10,2,13,14,0,11,3,12,5,8,7' }
  },
  { name: 'shared-scramble-logged-out', url: '/?playground&public_id=shared-1' },
  {
    name: 'shared-scramble-logged-in-4x4',
    url: '/?playground&public_id=shared-1',
    loggedIn: true,
    fixedScramble: true,
    api: {
      user_scramble: jsonRoute({
        status: 'ok',
        game_id: 0,
        stats: userScrambleFixture({ puzzle_size: 4, scramble: '15,1,9,4,6,10,2,13,14,0,11,3,12,5,8,7', solve_path: 'RULD' })
      })
    }
  },
  {
    name: 'shared-scramble-not-found',
    url: '/?playground&public_id=k1bz8cogliwgy',
    loggedIn: true,
    api: {
      user_scramble: async (route) => {
        await route.fulfill({ status: 400, json: { status: 'error', error: 'Wrong public_id' } });
      },
      get_current_user: async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({ json: { status: 'ok', game_id: 0, token: 'fake-token', name: 'tester' } });
      }
    }
  },
  { name: 'shared-scramble-lookup-fails', url: '/?playground&public_id=shared-1', loggedIn: true, api: { user_scramble: failure() } },
  { name: 'shared-scramble-misspelled-param', url: '/?playground&public_idx=shared-1', loggedIn: true },
  { name: 'replay-single', url: '/?game_id=42', fixedScramble: true, api: { game: jsonRoute({ status: 'ok', game_id: 0, stats: repGameFixture() }) } },
  {
    name: 'replay-marathon-over-stored-cage',
    url: '/?game_id=42',
    storage: { proMode: 'false', enableCageMode: 'true' },
    fixedScramble: true,
    api: { game: jsonRoute({ status: 'ok', game_id: 0, stats: marathonRepGameFixture() }) }
  },
  { name: 'replay-lookup-fails', url: '/?game_id=42', api: { game: failure() } },
  {
    name: 'replay-lookup-fails-saved-5x5',
    url: '/?game_id=42',
    storage: { proMode: 'true', numLines: '5' },
    api: { game: failure() }
  },
  { name: 'replay-misspelled-param', url: '/?game_idx=42' },
  {
    name: 'replay-not-found-redirects-home',
    url: '/?game_id=999',
    api: { game: jsonRoute({ status: 'ok', game_id: 0 }) },
    redirects: true
  },
  {
    name: 'g1000-logged-in',
    url: '/?g1000',
    loggedIn: true,
    fixedScramble: true,
    api: { next_gt: jsonRoute({ status: 'ok', game_id: 0, scramble: '4,1,3,2,0,6,7,5,8', id: 5 }) }
  },
  {
    name: 'g1000-over-stored-cage',
    url: '/?g1000',
    loggedIn: true,
    storage: { proMode: 'false', enableCageMode: 'true' },
    fixedScramble: true,
    api: { next_gt: jsonRoute({ status: 'ok', game_id: 0, scramble: '4,1,3,2,0,6,7,5,8', id: 5 }) }
  },
  { name: 'g1000-logged-out', url: '/?g1000' },
  { name: 'password-reset-link', url: '/?reset_password&token=abc123&email=john@proton.me', storage: { proMode: 'false' } }
];

const storeKeys = [
  'puzzleLoaded', 'numLines', 'proMode', 'hoverOnControl', 'darkMode', 'spaceBetween',
  'enableCageMode', 'cageMode', 'unlockedCages', 'marathonMode', 'fmcBlitz', 'blitzScrambleCount',
  'g1000Mode', 'noPlayMode', 'consecutiveSolves', 'opt_m',
  'playgroundMode', 'sharedPlaygroundMode', 'savedOrders', 'checkUserScrambleInDB', 'publicId',
  'userScrambleId', 'otherUserName', 'playgroundBestTime', 'playgroundBestMoves', 'playgroundSolvePath',
  'replayMode', 'marathonReplay', 'token', 'userName', 'lastError', 'linkError', 'isNetworkError'
];

async function open(page: Page, startCase: StartCase): Promise<string[]> {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(API_BASE)) {
      const url = new URL(request.url());
      const query = [...url.searchParams.entries()]
        .map(([key, value]) => {
          const shown = key === 'scramble' && startCase.fixedScramble !== true
            ? `${value.split(',').length} random`
            : value;
          return `${key}=${shown}`;
        })
        .sort((a, b) => a.localeCompare(b))
        .join('&');
      const search = query === '' ? '' : `?${query}`;
      requests.push(`${request.method()} ${url.pathname}${search}`);
    }
  });
  await mockApi(page, { ...(startCase.loggedIn === true ? { get_current_user: loggedInUser } : {}), ...startCase.api });
  const storage = { ...startCase.storage, ...(startCase.loggedIn === true ? { token: 'fake-token' } : {}) };
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded') === null) {
      sessionStorage.setItem('seeded', 'yes');
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
    }
  }, storage);
  await page.addInitScript(() => {
    const activity = { pending: 0, last: performance.now() };
    (window as unknown as { fetchActivity: typeof activity }).fetchActivity = activity;
    const realFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      activity.pending += 1;
      activity.last = performance.now();
      try {
        return await realFetch(...args);
      } finally {
        activity.pending -= 1;
        activity.last = performance.now();
      }
    };
  });

  await page.goto(startCase.url);
  if (startCase.redirects === true) {
    await page.waitForURL((url) => url.search === '');
  }
  await page.waitForFunction(() => {
    const { pending, last } = (window as unknown as { fetchActivity: { pending: number; last: number } }).fetchActivity;
    return document.readyState === 'complete' && pending === 0 && performance.now() - last > 500;
  }, undefined, { polling: 100 });
  return requests;
}

async function recordState(page: Page, requests: string[], fixedScramble: boolean): Promise<string> {
  const state = await page.evaluate(({ keys, fixed }) => {
    const { mixedOrders, savedOrders, ...flags } = window.__cage15Test__!.readStore([...keys, 'mixedOrders']);
    const scramble = (orders: unknown): string => {
      const values = orders as number[];
      return fixed || values.length === 0 ? values.join(',') : `${values.length} random`;
    };
    return {
      url: location.pathname + location.search,
      theme: document.documentElement.dataset['theme'],
      errorLine: document.querySelector('.last-error')?.textContent.trim() ?? null,
      board: document.querySelector('.board canvas') !== null
        ? 'canvas'
        : `${document.querySelectorAll('.board .square').length} squares`,
      store: { ...flags, savedOrders: scramble(savedOrders), mixedOrders: scramble(mixedOrders) },
      localStorage: Object.fromEntries(Object.keys(localStorage).sort((a, b) => a.localeCompare(b)).map((key) => [key, localStorage.getItem(key)]))
    };
  }, { keys: storeKeys, fixed: fixedScramble });
  return `${JSON.stringify({ ...state, requests }, null, 2)}\n`;
}

test.describe('startup', () => {
  for (const startCase of cases) {
    test(startCase.name, async ({ page }) => {
      const requests = await open(page, startCase);

      expect(await recordState(page, requests, startCase.fixedScramble === true)).toMatchSnapshot(`${startCase.name}.json`);
    });
  }
});
