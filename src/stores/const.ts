export type puzzleCores = 3 | 4 | 5;

export const CORE_NUM: puzzleCores = 4;

export const SPACE_BETWEEN_SQUARES = 8;

const cores = [3, 4, 5] as number[];
export const isPuzzleCore = (x: number): x is puzzleCores => cores.includes(x);

export const enum Direction {
  None = 0,
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4
}

export const enum ControlType {
  Mouse = 0,
  Touch = 1,
  Keyboard = 2
}

export const enum LoadImageMode {
  next = 1,
  prev = -1
}

export interface PreloadedImage {
  url?: string,
  item: string;
}

export interface Record {
  record: number;
  adding: number;
}

export interface Position {
  left: number,
  top: number,
  right: number,
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
  created_at: string;
  control_type: string;
}

export interface UserStats {
  user_data: {
    created_at: string;
    last_game_at: string;
    num_finished_games: number;
    play_time: number;
    id: number;
  },
  user_records: UserRecord[];
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
}

export const CAGES_PATH_ARR = [
  '01-joe',
  '02-primal',
  '03-willy',
  '04-renfield',
  '05-ghost',
  '06-ghost',
  '07-8mm',
  '08-boy',
  '09-pig',
  '10-talent',
  '11-talent',
  '12-mandolin',
  '13-mandolin',
  '14-mandolin',
  '15-army',
  '16-mom',
  '17-mom',
  '18-face',
  '19-face',
  '20-face',
  '21-face',
  '22-tess',
  '23-tess',
  '24-tess',
  '25-glass'
];
