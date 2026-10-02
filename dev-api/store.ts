import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { manhattan, optimalMoves3x3 } from './puzzle.ts';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  token: string | null;
  created_at: string;
}

export interface Game {
  id: number;
  user_id: number;
  public_id: string;
  time: number;
  moves: number;
  puzzle_size: number;
  puzzle_type: string;
  control_type: string;
  consecutive_solves: number;
  scramble: string;
  solve_path: string;
  gt_id: number | null;
  session_id: string | null;
  opt_moves: number | null;
  md: number;
  created_at: string;
}

interface RecordRow {
  id: number;
  user_id: number;
  name: string;
  record_type: string;
  puzzle_type: string;
  puzzle_size: number;
  time: number | null;
  moves: number | null;
  game_id: number | null;
  avg_time: number | null;
  avg_moves: number | null;
  avg_tps: number | null;
  time_games: string | null;
  moves_games: string | null;
  tps_games: string | null;
  update_info: string;
  created_at: string;
  updated_at: string;
}

export interface UserScramble {
  id: number;
  user_id: number;
  puzzle_size: number;
  scramble: string;
  best_time: number;
  best_moves: number;
  best_time_moves: number;
  solve_path: string;
  public_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewGame {
  time: number;
  moves: number;
  puzzle_size: number;
  puzzle_type: string;
  control_type: string;
  consecutive_solves: number;
  scramble: string;
  solve_path: string;
  gt_id?: number | null;
  session_id?: string | null;
}

type Metric = 'time' | 'moves' | 'tps';
const METRICS: Metric[] = ['time', 'moves', 'tps'];
const AVERAGE_SIZES = [5, 12, 50, 100];
const LEADERBOARD_TYPES = ['standard', 'marathon'];

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, token TEXT UNIQUE, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, public_id TEXT NOT NULL UNIQUE,
    time INTEGER NOT NULL, moves INTEGER NOT NULL, puzzle_size INTEGER NOT NULL, puzzle_type TEXT NOT NULL,
    control_type TEXT NOT NULL, consecutive_solves INTEGER NOT NULL, scramble TEXT NOT NULL,
    solve_path TEXT NOT NULL, gt_id INTEGER, session_id TEXT, opt_moves INTEGER, md INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, record_type TEXT NOT NULL, puzzle_type TEXT NOT NULL,
    puzzle_size INTEGER NOT NULL, time INTEGER, moves INTEGER, game_id INTEGER,
    avg_time REAL, avg_moves REAL, avg_tps REAL, time_games TEXT, moves_games TEXT, tps_games TEXT,
    update_info TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE (user_id, record_type, puzzle_type, puzzle_size)
  );
  CREATE TABLE IF NOT EXISTS user_scrambles (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, puzzle_size INTEGER NOT NULL, scramble TEXT NOT NULL,
    best_time INTEGER NOT NULL, best_moves INTEGER NOT NULL, best_time_moves INTEGER NOT NULL,
    solve_path TEXT NOT NULL, public_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
`;

export function newId(): string {
  return randomBytes(6).toString('hex');
}

// Ruby-style float text, as the real server sends it: 221.0, 221.705.
export function decimal(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded);
}

function tpsOf(game: Pick<Game, 'time' | 'moves'>): number {
  return game.time === 0 ? 0 : game.moves / (game.time / 1000);
}

export function createUser(db: DatabaseSync, name: string, email: string, password: string, at: string): User {
  const token = newId() + newId();
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO users (name, email, password, token, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, password, token, at);
  return getUser(db, Number(lastInsertRowid))!;
}

export function getUser(db: DatabaseSync, id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function userByToken(db: DatabaseSync, token: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE token = ?').get(token) as User | undefined;
}

export function userByEmail(db: DatabaseSync, email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as User | undefined;
}

export function userByName(db: DatabaseSync, name: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE lower(name) = lower(?)').get(name) as User | undefined;
}

export function newToken(db: DatabaseSync, user: User): string {
  const token = newId() + newId();
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);
  return token;
}

export function optimalOf(scramble: string): number {
  return optimalMoves3x3(scramble.split(',').map(Number));
}

function optimalFor(game: NewGame): number | null {
  if (game.puzzle_size !== 3) return null;
  return game.scramble.split(';')
    .reduce((sum, part) => sum + optimalMoves3x3(part.split(',').map(Number)), 0);
}

export function insertGame(db: DatabaseSync, user: User, game: NewGame, at: string): Game {
  const md = game.scramble.split(';')
    .reduce((sum, part) => sum + manhattan(part.split(',').map(Number), game.puzzle_size), 0);
  const { lastInsertRowid } = db.prepare(`INSERT INTO games (user_id, public_id, time, moves, puzzle_size,
    puzzle_type, control_type, consecutive_solves, scramble, solve_path, gt_id, session_id, opt_moves, md, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    user.id, newId(), game.time, game.moves, game.puzzle_size, game.puzzle_type, game.control_type,
    game.consecutive_solves, game.scramble, game.solve_path, game.gt_id ?? null, game.session_id ?? null,
    optimalFor(game), md, at
  );
  const saved = db.prepare('SELECT * FROM games WHERE id = ?').get(Number(lastInsertRowid)) as unknown as Game;
  if (LEADERBOARD_TYPES.includes(saved.puzzle_type)) {
    updateSingleRecords(db, saved);
  }
  return saved;
}

function recordOf(db: DatabaseSync, userId: number, type: string, puzzleType: string, size: number): RecordRow | undefined {
  return db.prepare(`SELECT records.*, users.name FROM records JOIN users ON users.id = records.user_id
    WHERE user_id = ? AND record_type = ? AND puzzle_type = ? AND puzzle_size = ?`)
    .get(userId, type, puzzleType, size) as RecordRow | undefined;
}

function updateSingleRecords(db: DatabaseSync, game: Game): void {
  const better: Record<string, (old: RecordRow) => boolean> = {
    time: (old) => game.time < old.time! || (game.time === old.time && game.moves < old.moves!),
    moves: (old) => game.moves < old.moves! || (game.moves === old.moves && game.time < old.time!)
  };
  for (const type of ['time', 'moves']) {
    const old = recordOf(db, game.user_id, type, game.puzzle_type, game.puzzle_size);
    if (old === undefined) {
      db.prepare(`INSERT INTO records (user_id, record_type, puzzle_type, puzzle_size, time, moves, game_id,
        update_info, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        game.user_id, type, game.puzzle_type, game.puzzle_size, game.time, game.moves, game.id,
        `single: ${type}`, game.created_at, game.created_at);
    } else if (better[type](old)) {
      db.prepare('UPDATE records SET time = ?, moves = ?, game_id = ?, update_info = ?, updated_at = ? WHERE id = ?')
        .run(game.time, game.moves, game.id, `single: ${type}`, game.created_at, old.id);
    }
  }
}

function runGames(db: DatabaseSync, game: Game): Game[] {
  if (game.session_id === null) return [game];
  return db.prepare(`SELECT * FROM games WHERE user_id = ? AND session_id = ? AND puzzle_size = ? AND puzzle_type = ?
    AND id <= ? ORDER BY id`).all(game.user_id, game.session_id, game.puzzle_size, game.puzzle_type, game.id) as unknown as Game[];
}

function metricOf(game: Game, metric: Metric): number {
  if (metric === 'time') return game.time / 1000;
  if (metric === 'moves') return game.moves;
  return tpsOf(game);
}

// The best and worst 5% of a window (at least one game each) are left out.
function trimmed(games: Game[], metric: Metric): { kept: Game[]; best: Game[]; worst: Game[] } {
  const cut = Math.max(1, Math.ceil(games.length * 0.05));
  const sorted = games.slice().sort((a, b) => metricOf(a, metric) - metricOf(b, metric));
  const [best, worst] = metric === 'tps'
    ? [sorted.slice(-cut), sorted.slice(0, cut)]
    : [sorted.slice(0, cut), sorted.slice(-cut)];
  return { kept: sorted.slice(cut, sorted.length - cut), best, worst };
}

function average(games: Game[], metric: Metric): number {
  const { kept } = trimmed(games, metric);
  return kept.reduce((sum, game) => sum + metricOf(game, metric), 0) / kept.length;
}

export function averageStats(games: Game[]): Record<string, string> {
  const stats: Record<string, string> = {};
  if (games.length === 0) return stats;
  const session = games.reduce((sum, game) => sum + game.time, 0) / games.length / 1000;
  stats['aoSt'] = decimal(session);
  stats['aoSm'] = decimal(games.reduce((sum, game) => sum + game.moves, 0) / games.length);
  stats['aoStps'] = decimal(games.reduce((sum, game) => sum + game.moves, 0) / (session * games.length));
  for (const size of AVERAGE_SIZES) {
    if (games.length < size) continue;
    const window = games.slice(-size);
    stats[`ao${size}t`] = decimal(average(window, 'time'));
    stats[`ao${size}m`] = decimal(average(window, 'moves'));
    stats[`ao${size}tps`] = decimal(average(window, 'tps'));
  }
  return stats;
}

export function updateAverages(db: DatabaseSync, game: Game):
{ stats: Record<string, string>; wasAvgRecords: { type: string; record_time: boolean; record_moves: boolean; record_tps: boolean }[] } {
  const games = runGames(db, game);
  const stats = averageStats(games);
  const wasAvgRecords = [];
  if (!LEADERBOARD_TYPES.includes(game.puzzle_type) || game.gt_id !== null) {
    return { stats, wasAvgRecords: [] };
  }
  for (const size of AVERAGE_SIZES) {
    if (games.length < size) continue;
    const window = games.slice(-size);
    const ids = JSON.stringify(window.map((item) => item.id));
    const values = { time: average(window, 'time'), moves: average(window, 'moves'), tps: average(window, 'tps') };
    const type = `ao${size}`;
    const old = recordOf(db, game.user_id, type, game.puzzle_type, game.puzzle_size);
    const improved = {
      time: old === undefined || values.time < old.avg_time!,
      moves: old === undefined || values.moves < old.avg_moves!,
      tps: old === undefined || values.tps > old.avg_tps!
    };
    const changed = METRICS.filter((metric) => improved[metric]);
    if (old === undefined) {
      db.prepare(`INSERT INTO records (user_id, record_type, puzzle_type, puzzle_size, avg_time, avg_moves, avg_tps,
        time_games, moves_games, tps_games, update_info, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(game.user_id, type, game.puzzle_type, game.puzzle_size, values.time, values.moves, values.tps,
          ids, ids, ids, `average: ${changed.join(', ')}`, game.created_at, game.created_at);
    } else if (changed.length > 0) {
      for (const metric of changed) {
        db.prepare(`UPDATE records SET avg_${metric} = ?, ${metric}_games = ? WHERE id = ?`).run(values[metric], ids, old.id);
      }
      db.prepare('UPDATE records SET update_info = ?, updated_at = ? WHERE id = ?')
        .run(`average: ${changed.join(', ')}`, game.created_at, old.id);
    }
    wasAvgRecords.push({ type, record_time: improved.time, record_moves: improved.moves, record_tps: improved.tps });
  }
  return { stats, wasAvgRecords };
}

export function latestRunGames(db: DatabaseSync, userId: number, size: number, puzzleType: string, sessionId?: string): Game[] {
  const session = sessionId !== undefined && sessionId !== '' && sessionId !== 'undefined'
    ? sessionId
    : (db.prepare(`SELECT session_id FROM games WHERE user_id = ? AND puzzle_size = ? AND puzzle_type = ?
        AND session_id IS NOT NULL ORDER BY id DESC LIMIT 1`).get(userId, size, puzzleType) as { session_id: string } | undefined)?.session_id;
  if (session === undefined) return [];
  return db.prepare(`SELECT * FROM games WHERE user_id = ? AND puzzle_size = ? AND puzzle_type = ? AND session_id = ?
    ORDER BY id`).all(userId, size, puzzleType, session) as unknown as Game[];
}

export function saveFmcBlitz(db: DatabaseSync, user: User, moves: number, time: number, sessionId: string, at: string): void {
  const games = db.prepare('SELECT * FROM games WHERE user_id = ? AND session_id = ? ORDER BY id')
    .all(user.id, sessionId) as unknown as Game[];
  if (games.length === 0) return;
  const size = games[0].puzzle_size;
  const ids = JSON.stringify(games.map((game) => game.id));
  const old = recordOf(db, user.id, 'fmc_blitz_moves', 'standard', size);
  if (old === undefined) {
    db.prepare(`INSERT INTO records (user_id, record_type, puzzle_type, puzzle_size, time, moves, time_games,
      update_info, created_at, updated_at) VALUES (?, 'fmc_blitz_moves', 'standard', ?, ?, ?, ?, ?, ?, ?)`)
      .run(user.id, size, time, moves, ids, 'fmc_blitz_moves: moves', at, at);
  } else if (moves < old.moves! || (moves === old.moves && time < old.time!)) {
    db.prepare('UPDATE records SET time = ?, moves = ?, time_games = ?, update_info = ?, updated_at = ? WHERE id = ?')
      .run(time, moves, ids, 'fmc_blitz_moves: moves', at, old.id);
  }
}

function singleRecord(db: DatabaseSync, row: RecordRow) {
  const game = row.game_id === null
    ? undefined
    : db.prepare('SELECT public_id, scramble, control_type FROM games WHERE id = ?').get(row.game_id) as
      Pick<Game, 'public_id' | 'scramble' | 'control_type'> | undefined;
  return {
    id: row.id,
    record_id: row.id,
    name: row.name,
    record_type: row.record_type,
    puzzle_type: row.puzzle_type,
    puzzle_size: row.puzzle_size,
    time: row.time,
    moves: row.moves,
    tps: decimal(tpsOf({ time: row.time!, moves: row.moves! })),
    control_type: game?.control_type,
    public_id: game?.public_id,
    scramble: game?.scramble,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function averageRecord(row: RecordRow) {
  return {
    id: row.id,
    record_id: row.id,
    name: row.name,
    record_type: row.record_type,
    puzzle_type: row.puzzle_type,
    puzzle_size: row.puzzle_size,
    avg_time: decimal(row.avg_time!),
    avg_moves: decimal(row.avg_moves!),
    avg_tps: decimal(row.avg_tps!),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

const SELECT_RECORDS = 'SELECT records.*, users.name FROM records JOIN users ON users.id = records.user_id';

export function leaderboard(db: DatabaseSync, averages: boolean) {
  const rows = db.prepare(`${SELECT_RECORDS} WHERE record_type ${averages ? 'LIKE' : 'NOT LIKE'} 'ao%'`).all() as unknown as RecordRow[];
  return rows.map((row) => (averages ? averageRecord(row) : singleRecord(db, row)));
}

export function userStats(db: DatabaseSync, user: User) {
  const totals = db.prepare('SELECT count(*) AS games, coalesce(sum(time), 0) AS play, max(created_at) AS last FROM games WHERE user_id = ?')
    .get(user.id) as { games: number; play: number; last: string | null };
  const rows = db.prepare(`${SELECT_RECORDS} WHERE user_id = ?`).all(user.id) as unknown as RecordRow[];
  return {
    user_data: {
      id: user.id,
      created_at: user.created_at,
      last_game_at: totals.last ?? user.created_at,
      num_finished_games: totals.games,
      play_time: totals.play
    },
    user_records: rows.map((row) => (row.record_type.startsWith('ao') ? averageRecord(row) : singleRecord(db, row)))
  };
}

export function liveRecords(db: DatabaseSync, offset: number, limit: number) {
  const rows = db.prepare(`${SELECT_RECORDS} ORDER BY updated_at DESC, records.id DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as unknown as RecordRow[];
  return rows.map((row) => {
    const average = row.record_type.startsWith('ao');
    return {
      record_id: row.id,
      name: row.name,
      record_type: row.record_type,
      puzzle_type: row.puzzle_type,
      puzzle_size: row.puzzle_size,
      time: average ? null : row.time,
      moves: average ? null : row.moves,
      avg_time: average ? decimal(row.avg_time!) : null,
      avg_moves: average ? decimal(row.avg_moves!) : null,
      avg_tps: average ? decimal(row.avg_tps!) : null,
      effective_updated_at: row.updated_at,
      update_info: row.update_info
    };
  });
}

export function recordPublicId(db: DatabaseSync, recordId: number): string | undefined {
  const row = db.prepare('SELECT games.public_id FROM records JOIN games ON games.id = records.game_id WHERE records.id = ?')
    .get(recordId) as { public_id: string } | undefined;
  return row?.public_id;
}

export function gameRecord(game: Game, excluded?: 'best' | 'worst') {
  return {
    ...game,
    tps: decimal(tpsOf(game)),
    opt_diff: game.opt_moves === null ? undefined : game.moves - game.opt_moves,
    excluded_from_avg: excluded ?? null
  };
}

export function recordGames(db: DatabaseSync, recordId: number, metric: Metric) {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as RecordRow | undefined;
  const list = row?.[`${metric}_games`] ?? row?.time_games;
  if (row === undefined || list == null) return [];
  const ids = JSON.parse(list) as number[];
  const games = ids.map((id) => db.prepare('SELECT * FROM games WHERE id = ?').get(id) as unknown as Game);
  if (!row.record_type.startsWith('ao')) return games.map((game) => gameRecord(game));
  const { best, worst } = trimmed(games, metric);
  return games.map((game) => {
    if (best.includes(game)) return gameRecord(game, 'best');
    if (worst.includes(game)) return gameRecord(game, 'worst');
    return gameRecord(game);
  });
}

const GAME_ORDER: Record<string, string> = {
  id: 'id', time: 'time', moves: 'moves', opt_diff: 'moves - coalesce(opt_moves, 0)', tps: 'CAST(moves AS REAL) / time'
};

export function userGames(db: DatabaseSync, user: User, size: number, puzzleType: string,
  order?: { field: string; direction: string; offset: number; limit: number }) {
  const g1000 = puzzleType === 'g1000';
  let sql = `SELECT * FROM games WHERE user_id = ? AND puzzle_size = ? AND puzzle_type = ?
    AND gt_id IS ${g1000 ? 'NOT NULL' : 'NULL'}`;
  if (order !== undefined) {
    sql += ` ORDER BY ${GAME_ORDER[order.field] ?? 'id'} ${order.direction === 'asc' ? 'ASC' : 'DESC'}, id DESC
      LIMIT ${order.limit} OFFSET ${order.offset}`;
  }
  const games = db.prepare(sql).all(user.id, size, g1000 ? 'standard' : puzzleType) as unknown as Game[];
  return games.map((game) => gameRecord(game));
}

export function gameByPublicId(db: DatabaseSync, publicId: string) {
  const game = db.prepare('SELECT games.*, users.name FROM games JOIN users ON users.id = games.user_id WHERE public_id = ?')
    .get(publicId) as (Game & { name: string }) | undefined;
  if (game === undefined) return undefined;
  return { ...game, tps: decimal(tpsOf(game)) };
}

export function nextG1000Id(db: DatabaseSync, user: User): number {
  const row = db.prepare('SELECT count(*) AS done FROM games WHERE user_id = ? AND gt_id IS NOT NULL').get(user.id) as { done: number };
  return Math.min(row.done + 1, 1000);
}

function scrambleRecord(db: DatabaseSync, row: UserScramble) {
  const owner = getUser(db, row.user_id);
  const optimal = row.puzzle_size === 3 ? optimalMoves3x3(row.scramble.split(',').map(Number)) : undefined;
  return {
    ...row,
    name: owner?.name,
    best_tps: Number(decimal(tpsOf({ time: row.best_time, moves: row.best_time_moves }))),
    optimal_moves: optimal,
    opt_diff: optimal === undefined ? undefined : row.best_moves - optimal
  };
}

export function scrambleByPublicId(db: DatabaseSync, publicId: string) {
  const row = db.prepare('SELECT * FROM user_scrambles WHERE public_id = ?').get(publicId) as UserScramble | undefined;
  return row === undefined ? undefined : scrambleRecord(db, row);
}

export function ownScramble(db: DatabaseSync, user: User, scramble: string) {
  const row = db.prepare('SELECT * FROM user_scrambles WHERE user_id = ? AND scramble = ?').get(user.id, scramble) as UserScramble | undefined;
  return row === undefined ? undefined : scrambleRecord(db, row);
}

export function saveScramble(db: DatabaseSync, user: User, data: Omit<UserScramble, 'id' | 'user_id' | 'public_id' | 'created_at' | 'updated_at'>, at: string): number {
  const { lastInsertRowid } = db.prepare(`INSERT INTO user_scrambles (user_id, puzzle_size, scramble, best_time, best_moves,
    best_time_moves, solve_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    user.id, data.puzzle_size, data.scramble, data.best_time, data.best_moves, data.best_time_moves, data.solve_path, at, at);
  return Number(lastInsertRowid);
}

export function updateScramble(db: DatabaseSync, user: User, data: Pick<UserScramble, 'id' | 'best_time' | 'best_moves' | 'best_time_moves' | 'solve_path'>, at: string): boolean {
  const { changes } = db.prepare(`UPDATE user_scrambles SET best_time = ?, best_moves = ?, best_time_moves = ?, solve_path = ?,
    updated_at = ? WHERE id = ? AND user_id = ?`).run(data.best_time, data.best_moves, data.best_time_moves, data.solve_path, at, data.id, user.id);
  return Number(changes) > 0;
}

const SCRAMBLE_ORDER: Record<string, string> = {
  id: 'id', best_time: 'best_time', best_moves: 'best_moves', optimal_moves: 'id', opt_diff: 'id'
};

export function listScrambles(db: DatabaseSync, user: User, size: number, field: string, direction: string, offset: number, limit: number) {
  const rows = db.prepare(`SELECT * FROM user_scrambles WHERE user_id = ? AND puzzle_size = ?
    ORDER BY ${SCRAMBLE_ORDER[field] ?? 'id'} ${direction === 'asc' ? 'ASC' : 'DESC'}, id DESC LIMIT ? OFFSET ?`)
    .all(user.id, size, limit, offset) as unknown as UserScramble[];
  const records = rows.map((row) => scrambleRecord(db, row));
  if (field === 'optimal_moves' || field === 'opt_diff') {
    const sign = direction === 'asc' ? 1 : -1;
    records.sort((a, b) => sign * ((a[field] ?? 0) - (b[field] ?? 0)));
  }
  return records;
}

export function sharePublicId(db: DatabaseSync, user: User, scrambleId: number): string | undefined {
  const row = db.prepare('SELECT * FROM user_scrambles WHERE id = ? AND user_id = ?').get(scrambleId, user.id) as UserScramble | undefined;
  if (row === undefined) return undefined;
  if (row.public_id !== null) return row.public_id;
  const publicId = newId();
  db.prepare('UPDATE user_scrambles SET public_id = ? WHERE id = ?').run(publicId, row.id);
  return publicId;
}
