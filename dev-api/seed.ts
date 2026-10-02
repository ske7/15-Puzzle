import type { DatabaseSync } from 'node:sqlite';
import { randomScramble } from './puzzle.ts';
import * as store from './store.ts';

export const DEV_ACCOUNT = { name: 'dev', email: 'dev@example.com', password: 'devdev' };
export const SHARED_SCRAMBLE_ID = 'shared-demo';

const PLAYERS = ['ada_slider', 'bruno', 'cleo', 'dmitri', 'elena', 'farid', 'greta', 'hiro', 'ines', 'jonas', 'kaya', 'lukas'];
const CONTROLS = ['mouse', 'touch', 'keyboard'];
const WALK: Record<number, [number, number]> = { 3: [22, 40], 4: [50, 95], 5: [110, 190], 6: [190, 300], 7: [290, 430], 8: [420, 620] };
const BLITZ_SCRAMBLES: Record<number, number> = { 3: 50, 4: 12, 5: 5 };
const DAY = 24 * 60 * 60 * 1000;

function mulberry32(seedValue: number): () => number {
  let state = seedValue;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Player {
  user: store.User;
  tps: number;
  control: string;
}

export function seed(db: DatabaseSync): void {
  const random = mulberry32(15);
  const between = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
  let clock = Date.now() - 60 * DAY;
  const tick = (ms: number): string => {
    clock += ms;
    return new Date(clock).toISOString();
  };

  const puzzle = (size: number) => randomScramble(size, between(...WALK[size]), random);

  const play = (player: Player, size: number, puzzleType: string, count: number, gtFrom?: number): void => {
    const sessionId = store.newId();
    tick(between(1, 3) * DAY);
    for (let solve = 1; solve <= count; solve += 1) {
      const parts = Array.from({ length: puzzleType === 'marathon' ? 5 : 1 }, () => puzzle(size));
      const moves = parts.reduce((sum, part) => sum + part.solvePath.length, 0);
      const time = Math.round(moves / (player.tps * (0.75 + random() * 0.5)) * 1000);
      const game = store.insertGame(db, player.user, {
        time,
        moves,
        puzzle_size: size,
        puzzle_type: puzzleType,
        control_type: player.control,
        consecutive_solves: solve,
        scramble: parts.map((part) => part.scramble.join(',')).join(';'),
        solve_path: parts.map((part) => part.solvePath).join(';'),
        gt_id: gtFrom === undefined ? null : gtFrom + solve - 1,
        session_id: sessionId
      }, tick(time + between(3000, 9000)));
      store.updateAverages(db, game);
    }
  };

  const blitz = (player: Player, size: number): void => {
    const sessionId = store.newId();
    tick(between(1, 3) * DAY);
    let moves = 0;
    let time = 0;
    for (let solve = 1; solve <= BLITZ_SCRAMBLES[size]; solve += 1) {
      const part = puzzle(size);
      const solveTime = Math.round(part.solvePath.length / player.tps * 1000);
      moves += part.solvePath.length;
      time += solveTime;
      store.insertGame(db, player.user, {
        time: solveTime,
        moves: part.solvePath.length,
        puzzle_size: size,
        puzzle_type: 'standard',
        control_type: player.control,
        consecutive_solves: solve,
        scramble: part.scramble.join(','),
        solve_path: part.solvePath,
        session_id: sessionId
      }, tick(solveTime + 1000));
    }
    store.saveFmcBlitz(db, player.user, moves, time, sessionId, tick(1000));
  };

  db.exec('BEGIN');
  const dev: Player = {
    user: store.createUser(db, DEV_ACCOUNT.name, DEV_ACCOUNT.email, DEV_ACCOUNT.password, tick(0)),
    tps: 4.5,
    control: 'mouse'
  };
  const players = PLAYERS.map((name, index): Player => ({
    user: store.createUser(db, name, `${name}@example.com`, 'password', tick(DAY)),
    tps: 2.5 + index * 0.8 + random(),
    control: CONTROLS[index % CONTROLS.length]
  }));

  for (const [index, player] of players.entries()) {
    play(player, 3, 'standard', index === 0 ? 105 : between(15, 55));
    play(player, 4, 'standard', index === 1 ? 105 : between(15, 55));
    for (const size of [5, 6, 7, 8]) {
      play(player, size, 'standard', between(5, 14));
    }
    if (index % 2 === 0) {
      play(player, 3, 'marathon', between(5, 8));
      play(player, 4, 'marathon', between(5, 8));
    }
    if (index % 4 === 1) {
      blitz(player, [3, 4, 5][index % 3]);
    }
  }

  play(dev, 4, 'standard', 25);
  play(dev, 3, 'standard', 12);
  play(dev, 4, 'marathon', 6);
  play(dev, 5, 'standard', 6);
  blitz(dev, 4);
  play(dev, 3, 'standard', 3, 1);
  for (let index = 0; index < 3; index += 1) {
    const part = puzzle(4);
    store.insertGame(db, dev.user, {
      time: Math.round(part.solvePath.length / 2 * 1000),
      moves: part.solvePath.length,
      puzzle_size: 4,
      puzzle_type: 'cage_standard',
      control_type: dev.control,
      consecutive_solves: index + 1,
      scramble: part.scramble.join(','),
      solve_path: part.solvePath
    }, tick(DAY));
  }

  const saveScramble = (player: Player, size: number): number => {
    const part = puzzle(size);
    const time = Math.round(part.solvePath.length / player.tps * 1000);
    return store.saveScramble(db, player.user, {
      puzzle_size: size,
      scramble: part.scramble.join(','),
      best_time: time,
      best_moves: part.solvePath.length,
      best_time_moves: part.solvePath.length,
      solve_path: part.solvePath
    }, tick(DAY));
  };
  for (const size of [3, 3, 3, 4, 4, 5]) {
    saveScramble(dev, size);
  }
  const shared = saveScramble(players[4], 3);
  db.prepare('UPDATE user_scrambles SET public_id = ? WHERE id = ?').run(SHARED_SCRAMBLE_ID, shared);
  db.exec('COMMIT');
}
