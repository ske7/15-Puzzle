// g1000 is not a puzzle_type: those games are stored as 'standard' and identified by gt_id.
export type PuzzleType = 'standard' | 'marathon' | 'cage_standard';

export interface PersonalBest {
  record: number;
  adding: number;
}

export interface UserData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ScrambleData {
  scramble: string;
}
export interface UserScrambleData {
  user_name?: string;
  id?: number;
  puzzle_size?: number;
  best_time?: number;
  best_moves?: number;
  best_time_moves?: number;
  best_tps?: number;
  scramble?: string;
  solve_path?: string;
  name?: string;
  public_id?: string;
  created_at?: string;
  updated_at?: string;
  optimal_moves?: number;
  opt_diff?: number;
}

export interface FMCBlitzData {
  moves: number;
  time: number;
  session_id: string;
}

export interface GameData {
  user_name?: string;
  time: number;
  moves: number;
  puzzle_size?: number;
  puzzle_type?: PuzzleType;
  control_type: string;
  consecutive_solves: number;
  scramble?: string;
  solve_path?: string;
  id?: number;
  tps?: string;
  created_at?: string;
  public_id?: string;
  opt_diff?: number;
  gt_id?: number | null;
  session_id?: string | null;
  opt_moves?: number;
  md?: number;
  excluded_from_avg?: string | null;
}

export interface RepGame {
  time: number;
  moves: number;
  puzzle_size: number;
  puzzle_type: PuzzleType;
  control_type: string;
  consecutive_solves: number;
  scramble: string;
  solve_path: string;
  name: string;
  tps: string;
  created_at: string;
  opt_moves: number;
}
interface UserRecordBase {
  id: number;
  name?: string;
  puzzle_type: PuzzleType;
  puzzle_size: number;
  created_at?: string;
  updated_at?: string | number | Date;
  control_type?: string;
  public_id?: string;
  scramble?: string;
  record_id: number;
}

export interface SingleUserRecord extends UserRecordBase {
  record_type: 'time' | 'moves' | 'fmc_blitz_moves';
  time: number;
  moves: number;
  tps: string;
}

export interface AverageUserRecord extends UserRecordBase {
  record_type: 'ao5' | 'ao12' | 'ao50' | 'ao100';
  avg_time?: string;
  avg_moves?: string;
  avg_tps?: string;
}

export type UserRecord = SingleUserRecord | AverageUserRecord;

export function isSingleUserRecord(record: UserRecord): record is SingleUserRecord {
  return record.record_type === 'time' || record.record_type === 'moves' || record.record_type === 'fmc_blitz_moves';
}

export function isAverageUserRecord(record: UserRecord): record is AverageUserRecord {
  return !isSingleUserRecord(record);
}

export interface LiveRecord {
  record_id: number;
  name: string;
  record_type: UserRecord['record_type'] | 'ao1000';
  puzzle_type: PuzzleType;
  puzzle_size: number;
  time: number | null;
  moves: number | null;
  avg_time: string | null;
  avg_moves: string | null;
  avg_tps: string | null;
  effective_updated_at: string;
  update_info: string;
}

export interface UserStats {
  user_data: {
    created_at: string;
    last_game_at: string;
    num_finished_games: number;
    play_time: number;
    id: number;
  };
  user_records: UserRecord[];
}

export type AveragePrefix = 'aoS' | 'ao5' | 'ao12' | 'ao50' | 'ao100' | 'ao1000';
type AverageMetric = 't' | 'm' | 'tps';
export type AverageStats = Partial<Record<`${AveragePrefix}${AverageMetric}`, string>>;

export interface WasAvgRecord {
  type: string;
  record_time: boolean;
  record_moves: boolean;
  record_tps: boolean;
}

export interface ErrResponse {
  status: string;
  error?: string;
}

export interface Response<TStats = UserStats, TRecord = UserRecord> {
  status: string;
  name?: string;
  token?: string;
  stats?: TStats;
  records?: TRecord[];
  game_records?: GameData[];
  scramble_records?: UserScrambleData[];
  was_avg_records?: WasAvgRecord[];
  game_id: number;
  public_id?: string;
  opt_m?: number;
  scramble?: string;
  id?: number;
  user_scramble_id?: number;
}

export interface AverageData {
  code: number;
  puzzle_size: number;
  time?: string;
  moves?: string;
  tps?: string;
}

export interface TableColumn {
  label: string;
  sortField?: string;
  widthClass?: string;
  invert?: boolean;
}
