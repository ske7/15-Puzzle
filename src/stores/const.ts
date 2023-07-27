type puzzleCores = 3 | 4 | 5;

export const CORE_NUM: puzzleCores = 4;

export const SPACE_BETWEEN_SQUARES = 8;

export const enum Direction {
  None = 0,
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4
}

export interface PreloadedImage {
  url?: string,
  item: string,
  done: boolean;
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
  '21-face'
];
