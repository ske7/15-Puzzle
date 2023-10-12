export const baseUrl: string = import.meta.env.VITE_BASE_URL;

export const CORE_NUM = 4;

export const cores = [3, 4, 5] as number[];

export const SPACE_BETWEEN_SQUARES = 8;

export const enum Direction {
  None = 0,
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4
}

export const DirectionMap = new Map<Direction, string>([
  [Direction.Up, 'U'],
  [Direction.Right, 'R'],
  [Direction.Down, 'D'],
  [Direction.Left, 'L']
]);

export const enum ControlType {
  Mouse = 0,
  Touch = 1,
  Keyboard = 2
}

export const ControlTypeReverseMap = new Map<string, ControlType>([
  ['m', ControlType.Mouse],
  ['t', ControlType.Touch],
  ['k', ControlType.Keyboard]
]);

export const enum LoadImageMode {
  next = 1,
  prev = -1
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
