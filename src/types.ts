export type puzzleCores = 3 | 4 | 5;

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

export interface InvalidFields {
  name: boolean;
  email: boolean;
  password: boolean;
}

export interface GameData {
  time: number;
  moves: number;
  puzzle_size: number;
  puzzle_type: string;
  control_type: string;
  consecutive_solves: number;
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
  control_type?: string;
  avg_time?: string;
  avg_moves?: string;
  avg_tps?: string;
  pro_record?: boolean;
  pro_avg_time?: boolean;
  pro_avg_moves?: boolean;
  pro_avg_tps?: boolean;
  pro_time_value?: string;
  pro_moves_value?: string;
  pro_tps_value?: string;
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
  ao5t: string;
  ao5m: string;
  ao5tps: string;
  ao12t: string;
  ao12m: string;
  ao12tps: string;
  ao50t: string;
  ao50m: string;
  ao50tps: string;
  ao100t: string;
  ao100m: string;
  ao100tps: string;
}

export interface WasAvgRecord {
  type: string;
  record_time: boolean;
  record_moves: boolean;
  record_tps: boolean;
  pro_avg_time?: boolean;
  pro_avg_moves?: boolean;
  pro_avg_tps?: boolean;
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
  was_avg_records?: WasAvgRecord[];
}

export interface AverageData {
  code: number;
  puzzle_size: number;
  time?: string;
  moves?: string;
  tps?: string;
}
