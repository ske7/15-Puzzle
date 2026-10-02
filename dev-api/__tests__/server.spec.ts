import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeApi, openDatabase } from '../server.ts';
import { DEV_ACCOUNT, SHARED_SCRAMBLE_ID } from '../seed.ts';
import { applyMove, randomScramble, solvedOrders } from '../puzzle.ts';

let server: Server;
let base: string;

interface Answer {
  status: number;
  body: Record<string, unknown>;
}

async function call(method: string, endpoint: string, token?: string, body?: unknown): Promise<Answer> {
  const response = await fetch(`${base}/${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function login(): Promise<string> {
  const { body } = await call('POST', 'login', undefined, { user: { email: DEV_ACCOUNT.email, password: DEV_ACCOUNT.password } });
  return body['token'] as string;
}

function solve3x3(steps: number) {
  const { scramble, solvePath } = randomScramble(3, steps, Math.random);
  return {
    time: solvePath.length * 300,
    moves: solvePath.length,
    puzzle_size: 3,
    puzzle_type: 'standard',
    control_type: 'keyboard',
    consecutive_solves: 1,
    scramble: scramble.join(','),
    solve_path: solvePath,
    session_id: 'spec-session'
  };
}

beforeAll(async () => {
  const handle = createFakeApi(openDatabase(':memory:'));
  server = createServer((req, res) => { void handle(req, res) });
  await new Promise<void>((resolve) => { server.listen(0, resolve) });
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
}, 30000);

afterAll(() => {
  server.close();
});

describe('fake API', () => {
  it('seeds games whose solve paths really solve their scrambles, so replays play through', async () => {
    const { body } = await call('GET', 'stats');
    const records = body['records'] as { public_id?: string }[];
    expect(records.length).toBeGreaterThan(50);
    const { body: replay } = await call('GET', `game?game_id=${records[0].public_id}`);
    const game = replay['stats'] as { scramble: string; solve_path: string; puzzle_size: number };
    game.scramble.split(';').forEach((scramble, index) => {
      const orders = scramble.split(',').map(Number);
      for (const letter of game.solve_path.split(';')[index]) applyMove(orders, letter, game.puzzle_size);
      expect(orders).toEqual(solvedOrders(game.puzzle_size));
    });
  });

  it('logs the dev account in, and refuses a wrong password with 401', async () => {
    const ok = await call('POST', 'login', undefined, { user: { email: DEV_ACCOUNT.email, password: DEV_ACCOUNT.password } });
    expect(ok.body).toMatchObject({ status: 'ok', name: 'dev' });
    expect(ok.body['stats']).toHaveProperty('user_records');
    const wrong = await call('POST', 'login', undefined, { user: { email: DEV_ACCOUNT.email, password: 'nope' } });
    expect(wrong).toEqual({ status: 401, body: { status: 'error', error: 'Invalid email or password' } });
  });

  it('registers a new player once, and rejects the same name again', async () => {
    const user = { name: 'newbie', email: 'newbie@example.com', password: 'secret1' };
    expect((await call('POST', 'register', undefined, { user })).body).toMatchObject({ name: 'newbie' });
    expect((await call('POST', 'register', undefined, { user })).status).toBe(422);
  });

  it('answers 401 without a login, and 400 for an endpoint it does not have', async () => {
    expect((await call('GET', 'current_user_stats')).status).toBe(401);
    expect((await call('GET', 'no_such_thing')).status).toBe(400);
  });

  it('saves solves, keeps averages over a run, and marks a new ao5 record', async () => {
    const token = await login();
    const saved = await call('POST', 'game', token, { game: solve3x3(30) });
    expect(typeof saved.body['public_id']).toBe('string');
    expect(typeof saved.body['opt_m']).toBe('number');
    let stats: Answer = saved;
    for (let solve = 0; solve < 4; solve += 1) {
      const { body } = await call('POST', 'game', token, { game: solve3x3(30) });
      stats = await call('POST', 'update_stats', token, { game_id: body['game_id'] });
    }
    expect(stats.body['stats']).toHaveProperty('ao5t');
    expect(stats.body['was_avg_records']).toEqual([expect.objectContaining({ type: 'ao5' })]);
    const games = await call('GET', 'user_games?puzzle_size=3&puzzle_type=standard&offset=0&limit=50&order_field=id&order_direction=desc', token);
    expect((games.body['game_records'] as unknown[]).length).toBeGreaterThanOrEqual(5);
  });

  it('lists live records newest first, and opens the game behind a single record', async () => {
    const { body } = await call('GET', 'sorted_records?offset=0&limit=100');
    const records = body['records'] as { record_id: number; record_type: string; effective_updated_at: string }[];
    const dates = records.map((record) => record.effective_updated_at);
    expect(dates).toEqual(dates.toSorted((a, b) => b.localeCompare(a)));
    const single = records.find((record) => record.record_type === 'time')!;
    expect(typeof (await call('GET', `record_public_id?record_id=${single.record_id}`)).body['public_id']).toBe('string');
  });

  it('shows the games behind an average, its best and worst marked', async () => {
    const { body } = await call('GET', 'stats?avg=1');
    const record = (body['records'] as { record_id: number; record_type: string }[]).find((item) => item.record_type === 'ao12')!;
    const games = (await call('GET', `avg_record_games?avg_record_id=${record.record_id}&avg_type=time`)).body['game_records'] as { excluded_from_avg: string | null }[];
    expect(games).toHaveLength(12);
    expect(games.filter((game) => game.excluded_from_avg === 'best')).toHaveLength(1);
    expect(games.filter((game) => game.excluded_from_avg === 'worst')).toHaveLength(1);
  });

  it('saves, finds, lists and shares a playground scramble, and opens a shared one', async () => {
    const token = await login();
    const { scramble, solvePath } = randomScramble(3, 25, Math.random);
    const created = await call('POST', 'user_scramble', token, { user_scramble: {
      puzzle_size: 3, scramble: scramble.join(','), best_time: 9000, best_moves: solvePath.length, best_time_moves: solvePath.length, solve_path: solvePath
    } });
    const id = created.body['user_scramble_id'] as number;
    const found = await call('GET', `user_scramble?scramble=${scramble.join(',')}`, token);
    expect(found.body).toMatchObject({ stats: { id } });
    expect(typeof found.body['opt_m']).toBe('number');
    const list = await call('GET', 'list_user_scrambles?puzzle_size=3&offset=0&limit=50&order_field=id&order_direction=desc', token);
    expect((list.body['scramble_records'] as { id: number }[])[0].id).toBe(id);
    expect(typeof (await call('GET', `public_id?user_scramble_id=${id}`, token)).body['public_id']).toBe('string');
    expect((await call('GET', `user_scramble?public_id=${SHARED_SCRAMBLE_ID}`)).body['stats']).toMatchObject({ public_id: SHARED_SCRAMBLE_ID });
    expect((await call('GET', 'user_scramble?public_id=missing')).body).toEqual({ status: 'error', error: 'Wrong public_id' });
  });

  it('hands out g1000 puzzles numbered from the next unplayed one', async () => {
    const { body } = await call('GET', 'next_gt', await login());
    expect(body['id']).toBe(4);
    expect(body['scramble']).toMatch(/^(\d,){8}\d$/);
  });
});
