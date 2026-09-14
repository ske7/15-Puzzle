import { useBaseStore } from '../stores/base';
import { getElementCol, getElementRow, calcPosition } from '../utils';
import { Direction } from '@/const';

export interface MoveData {
  elementCol: number;
  elementRow: number;
  isFreeElement: boolean;
  canMoveRight: boolean;
  canMoveLeft: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMove: boolean;
  calculatedLeft: number;
  calculatedTop: number;
  moveDirection: Direction;
}

export function getMoveDirection(
  canMoveRight: boolean, canMoveLeft: boolean, canMoveUp: boolean, canMoveDown: boolean
): Direction {
  if (canMoveRight) return Direction.Right;
  if (canMoveLeft) return Direction.Left;
  if (canMoveUp) return Direction.Up;
  if (canMoveDown) return Direction.Down;
  return Direction.None;
}

export const canMoveStatic = (sid: number, squareSize: number): MoveData => {
  const baseStore = useBaseStore();

  const elementCol = getElementCol(sid, baseStore.numLines);
  const elementRow = getElementRow(sid, baseStore.numLines);

  const isFreeElement =
    elementCol === baseStore.freeElementCol &&
    elementRow === baseStore.freeElementRow;

  const canMoveLeft =
    baseStore.freeElementRow === elementRow &&
    baseStore.freeElementIndex + 1 < sid;

  const canMoveRight =
    baseStore.freeElementRow === elementRow &&
    baseStore.freeElementIndex + 1 > sid;

  const canMoveUp =
    baseStore.freeElementCol === elementCol &&
    baseStore.freeElementIndex + 1 < sid;

  const canMoveDown =
    baseStore.freeElementCol === elementCol &&
    baseStore.freeElementIndex + 1 > sid;

  const calculatedLeft = calcPosition(elementCol, baseStore.spaceBetween, squareSize);
  const calculatedTop = calcPosition(elementRow, baseStore.spaceBetween, squareSize);

  const canMove =
    canMoveRight || canMoveLeft || canMoveUp || canMoveDown;

  const moveDirection = getMoveDirection(canMoveRight, canMoveLeft, canMoveUp, canMoveDown);

  return {
    elementCol,
    elementRow,
    isFreeElement,
    canMoveRight,
    canMoveLeft,
    canMoveUp,
    canMoveDown,
    canMove,
    calculatedLeft,
    calculatedTop,
    moveDirection
  };
};
