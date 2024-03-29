export interface PreloadedImage {
  url?: string;
  item: string;
}

export interface Record {
  record: number;
  adding: number;
}

export interface Position {
  left: number;
  top: number;
  right: number;
  bottom: number;
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

export interface InvalidFields {
  name: boolean;
  email: boolean;
  password: boolean;
}

export interface GameData {
  user_name?: string;
  time: number;
  moves: number;
  puzzle_size?: number;
  puzzle_type?: string;
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
}

export interface RepGame {
  time: number;
  moves: number;
  puzzle_size: number;
  puzzle_type: string;
  control_type: string;
  consecutive_solves: number;
  scramble: string;
  solve_path: string;
  user_id: number;
  name: string;
  tps: string;
  created_at: string;
  opt_moves: number;
}
export interface UserRecord {
  id: number;
  name?: string;
  record_type: string;
  puzzle_type: string;
  puzzle_size: number;
  time: number;
  moves: number;
  tps: string;
  created_at?: string;
  updated_at?: string | number | Date;
  control_type?: string;
  avg_time?: string;
  avg_moves?: string;
  avg_tps?: string;
  public_id?: string;
  scramble?: string;
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

export interface AverageStats {
  aoSt?: string;
  aoSm?: string;
  aoStps?: string;
  ao5t?: string;
  ao5m?: string;
  ao5tps?: string;
  ao12t?: string;
  ao12m?: string;
  ao12tps?: string;
  ao50t?: string;
  ao50m?: string;
  ao50tps?: string;
  ao100t?: string;
  ao100m?: string;
  ao100tps?: string;
  ao1000t?: string;
  ao1000m?: string;
  ao1000tps?: string;
}

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

export interface Response {
  status: string;
  name?: string;
  token?: string;
  stats?: UserStats;
  records?: UserRecord[];
  game_records?: GameData[];
  scramble_records?: UserScrambleData[];
  was_avg_records?: WasAvgRecord[];
  game_id?: number;
  user_scramble_id?: number;
  public_id?: string;
  opt_m?: number;
  scramble?: string;
  id?: number;
}

export interface AverageData {
  code: number;
  puzzle_size: number;
  time?: string;
  moves?: string;
  tps?: string;
}
