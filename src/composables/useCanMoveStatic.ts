import { useBaseStore } from '../stores/base';
import { getElementCol, getElementRow } from '../utils';
import { Direction } from '@/const';

export const canMoveStatic = (sid: number, squareSize: number) => {
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

  const calculatedLeft =
    (elementCol - 1) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    squareSize * (elementCol - 1);

  const calculatedTop =
    (elementRow - 1) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    squareSize * (elementRow - 1);

  const canMove =
    canMoveRight || canMoveLeft || canMoveUp || canMoveDown;

  let moveDirection = Direction.None;
  if (canMoveRight) moveDirection = Direction.Right;
  else if (canMoveLeft) moveDirection = Direction.Left;
  else if (canMoveUp) moveDirection = Direction.Up;
  else if (canMoveDown) moveDirection = Direction.Down;

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
