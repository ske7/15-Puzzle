import { randomInt } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as store from './store.ts';
import { randomScramble } from './puzzle.ts';
import { seed } from './seed.ts';

type Query = URLSearchParams;
type Body = Record<string, unknown>;

interface Request {
  method: string;
  endpoint: string;
  query: Query;
  body: Body;
  user: store.User | undefined;
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OK = { status: 'ok', game_id: 0 };

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec(store.SCHEMA);
  const { users } = db.prepare('SELECT count(*) AS users FROM users').get() as { users: number };
  if (users === 0) {
    seed(db);
  }
  return db;
}

export function createFakeApi(db: DatabaseSync) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'https://fake-api');
    const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
    try {
      const body = await readBody(req);
      const request: Request = {
        method: req.method ?? 'GET',
        endpoint: url.pathname.replace(/^\/+/, ''),
        query: url.searchParams,
        body,
        user: token === undefined ? undefined : store.userByToken(db, token)
      };
      send(res, 200, { ...OK, ...route(db, request) });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      send(res, status, { status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function route(db: DatabaseSync, req: Request): Record<string, unknown> {
  const handler = HANDLERS[`${req.method} ${req.endpoint}`];
  if (handler === undefined) {
    throw new HttpError(400, `The fake API has no ${req.method} ${req.endpoint}`);
  }
  return handler(db, req);
}

const now = (): string => new Date().toISOString();

function signedIn(req: Request): store.User {
  if (req.user === undefined) {
    throw new HttpError(401, 'Please log in');
  }
  return req.user;
}

function field<T>(body: Body, key: string): T {
  return (body[key] ?? {}) as T;
}

function num(query: Query, key: string, fallback = 0): number {
  const value = Number(query.get(key));
  return Number.isFinite(value) && query.has(key) ? value : fallback;
}

function session(db: DatabaseSync, user: store.User) {
  return { token: store.newToken(db, user), name: user.name, stats: store.userStats(db, user) };
}

type Handler = (db: DatabaseSync, req: Request) => Record<string, unknown>;

const HANDLERS: Partial<Record<string, Handler>> = {
  'GET version': () => ({}),

  'GET get_current_user': (_db, req) => {
    const user = signedIn(req);
    return { token: user.token, name: user.name };
  },

  'POST register': (db, req) => {
    const user = field<{ name?: string; email?: string; password?: string }>(req.body, 'user');
    if (!user.name || !user.email || !user.password) {
      throw new HttpError(422, 'All fields are required');
    }
    if (store.userByName(db, user.name) !== undefined) {
      throw new HttpError(422, 'Name has already been taken');
    }
    if (store.userByEmail(db, user.email) !== undefined) {
      throw new HttpError(422, 'Email has already been taken');
    }
    return session(db, store.createUser(db, user.name, user.email, user.password, now()));
  },

  'POST login': (db, req) => {
    const user = field<{ email?: string; password?: string }>(req.body, 'user');
    const found = store.userByEmail(db, user.email ?? '');
    if (found === undefined || found.password !== user.password) {
      throw new HttpError(401, 'Invalid email or password');
    }
    return session(db, found);
  },

  'POST reset_password': () => ({}),

  'POST set_password': (db, req) => {
    const user = field<{ email?: string; password?: string }>(req.body, 'user');
    const found = store.userByEmail(db, user.email ?? '');
    if (found === undefined || !user.password) {
      throw new HttpError(422, 'Invalid reset link');
    }
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(user.password, found.id);
    return session(db, found);
  },

  'GET current_user_stats': (db, req) => ({ stats: store.userStats(db, signedIn(req)) }),

  'GET stats': (db, req) => ({ records: store.leaderboard(db, req.query.has('avg')) }),

  'GET sorted_records': (db, req) => ({
    records: store.liveRecords(db, num(req.query, 'offset'), num(req.query, 'limit', 100))
  }),

  'GET record_public_id': (db, req) => ({ public_id: store.recordPublicId(db, num(req.query, 'record_id')) }),

  'POST game': (db, req) => {
    const user = signedIn(req);
    const game = store.insertGame(db, user, field<store.NewGame>(req.body, 'game'), now());
    return { game_id: game.id, public_id: game.public_id, opt_m: game.opt_moves ?? undefined };
  },

  'POST update_stats': (db, req) => {
    const user = signedIn(req);
    const game = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?')
      .get(Number(req.body['game_id']), user.id) as store.Game | undefined;
    if (game === undefined) {
      throw new HttpError(422, 'Unknown game');
    }
    const { stats, wasAvgRecords } = store.updateAverages(db, game);
    return { stats, was_avg_records: wasAvgRecords };
  },

  'POST fmc_blitz': (db, req) => {
    const data = field<{ moves: number; time: number; session_id: string }>(req.body, 'data');
    store.saveFmcBlitz(db, signedIn(req), data.moves, data.time, data.session_id, now());
    return {};
  },

  'GET user_averages': (db, req) => {
    const user = signedIn(req);
    const games = store.latestRunGames(db, user.id, num(req.query, 'puzzle_size', 4),
      req.query.get('puzzle_type') ?? 'standard', req.query.get('session_id') ?? undefined);
    return { stats: store.averageStats(games) };
  },

  'GET user_games': (db, req) => ({
    game_records: store.userGames(db, signedIn(req), num(req.query, 'puzzle_size', 4), req.query.get('puzzle_type') ?? 'standard', {
      field: req.query.get('order_field') ?? 'id',
      direction: req.query.get('order_direction') ?? 'desc',
      offset: num(req.query, 'offset'),
      limit: num(req.query, 'limit', 50)
    })
  }),

  'GET session_games': (db, req) => ({
    game_records: store.userGames(db, signedIn(req), num(req.query, 'puzzle_size', 4), req.query.get('puzzle_type') ?? 'standard')
  }),

  'GET avg_record_games': (db, req) => ({
    game_records: store.recordGames(db, num(req.query, 'avg_record_id'), (req.query.get('avg_type') ?? 'time') as 'time' | 'moves' | 'tps')
  }),

  'GET fmc_blitz_record_games': (db, req) => ({
    game_records: store.recordGames(db, num(req.query, 'fmc_blitz_record_id'), 'time')
  }),

  'GET game': (db, req) => {
    const game = store.gameByPublicId(db, req.query.get('game_id') ?? '');
    return game === undefined ? {} : { stats: game };
  },

  'GET next_gt': (db, req) => {
    const user = signedIn(req);
    const random = (): number => randomInt(1_000_000) / 1_000_000;
    const { scramble } = randomScramble(3, randomInt(30, 50), random);
    return { id: store.nextG1000Id(db, user), scramble: scramble.join(',') };
  },

  'GET user_scramble': (db, req) => {
    const publicId = req.query.get('public_id');
    if (publicId !== null) {
      const stats = store.scrambleByPublicId(db, publicId);
      if (stats === undefined) {
        throw new HttpError(400, 'Wrong public_id');
      }
      return { stats };
    }
    const scramble = req.query.get('scramble') ?? '';
    const stats = store.ownScramble(db, signedIn(req), scramble);
    const optimal = scramble.split(',').length === 9 ? store.optimalOf(scramble) : undefined;
    return { stats, opt_m: optimal };
  },

  'POST user_scramble': (db, req) => {
    const data = field<Parameters<typeof store.saveScramble>[2]>(req.body, 'user_scramble');
    return { user_scramble_id: store.saveScramble(db, signedIn(req), data, now()) };
  },

  'PATCH user_scramble': (db, req) => {
    const data = field<Parameters<typeof store.updateScramble>[2]>(req.body, 'user_scramble');
    if (!store.updateScramble(db, signedIn(req), data, now())) {
      throw new HttpError(422, 'Unknown scramble');
    }
    return {};
  },

  'GET list_user_scrambles': (db, req) => ({
    scramble_records: store.listScrambles(db, signedIn(req), num(req.query, 'puzzle_size', 4),
      req.query.get('order_field') ?? 'id', req.query.get('order_direction') ?? 'desc',
      num(req.query, 'offset'), num(req.query, 'limit', 50))
  }),

  'GET public_id': (db, req) => {
    const publicId = store.sharePublicId(db, signedIn(req), num(req.query, 'user_scramble_id'));
    if (publicId === undefined) {
      throw new HttpError(422, 'Unknown scramble');
    }
    return { public_id: publicId };
  }
};

async function readBody(req: IncomingMessage): Promise<Body> {
  if (req.method === 'GET') return {};
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text === '' ? {} : JSON.parse(text) as Body;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
