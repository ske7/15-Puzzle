import type { Page, Route } from '@playwright/test';
import type { RepGame, Response as ApiResponse, UserScrambleData } from '../../src/types';

export const API_BASE = 'http://localhost:3000';

type RouteHandler = (route: Route) => Promise<void> | void;

// Intercepts every real API call this app makes (VITE_BASE_API_URL) and dispatches by path.
// Anything not explicitly handled gets a harmless generic OK - e.g. the fire-and-forget
// `version` ping in usePrepare.ts's checkCurrentUser(), which the app never awaits.
export async function mockApi(page: Page, handlers: Record<string, RouteHandler> = {}): Promise<void> {
  await page.route(`${API_BASE}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    const handler = handlers[path];
    if (handler) {
      await handler(route);
      return;
    }
    await route.fulfill({ json: { status: 'ok', game_id: 0 } satisfies ApiResponse });
  });
}

export function jsonRoute(body: unknown): RouteHandler {
  return async (route) => {
    await route.fulfill({ json: body });
  };
}

// A real, solvable 3x3 replay game record for the `game?game_id=X` endpoint.
export function repGameFixture(overrides: Partial<RepGame> = {}): RepGame {
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

// A real 3x3 marathon record: five scrambles and five solve paths, each separated by ';'.
export function marathonRepGameFixture(overrides: Partial<RepGame> = {}): RepGame {
  return repGameFixture({
    time: 19275,
    moves: 188,
    puzzle_type: 'marathon',
    control_type: 'touch',
    consecutive_solves: 1,
    scramble: '2,0,3,1,6,7,4,5,8;0,1,4,6,5,3,8,2,7;7,0,2,8,3,4,5,6,1;0,7,1,8,4,2,3,6,5;8,7,6,2,3,4,0,5,1',
    solve_path: 'RUULLDRURDLULDRRULLDURDLU;LUULDDRURDLLUURDLDRULDRRULLURRDLLURDRULL;' +
      'UULDRULDDRURDLLURDLURRDLLURDRULURDLURDLLURDRULL;LLURRDLLURRULDRDLULDRRULLURRDLLURRDLLURDRULL;' +
      'LLDDRUULDDRURDLUURDLURDLLURDRULL',
    tps: '9.754',
    opt_moves: 112,
    ...overrides
  });
}

// A real shared-scramble record for the `user_scramble?public_id=X` endpoint.
export function userScrambleFixture(overrides: Partial<UserScrambleData> = {}): UserScrambleData {
  return {
    id: 1,
    puzzle_size: 3,
    best_time: 0,
    best_moves: 0,
    best_time_moves: 0,
    scramble: '4,1,3,2,0,6,7,5,8',
    name: 'other_gamer',
    public_id: 'shared-1',
    created_at: '2024-06-01T12:00:00Z',
    ...overrides
  };
}
