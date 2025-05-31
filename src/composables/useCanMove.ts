import { computed, type ComputedRef } from 'vue';
import { useBaseStore } from '../stores/base';
import { getElementCol, getElementRow } from '../utils';
import { Direction } from '@/const';

export const useCanMove = (refValue: ComputedRef<number>,
  squareSize: number): Record<string, ComputedRef<boolean | number | Direction>> => {
  const baseStore = useBaseStore();

  const elementCol = computed(() => {
    return getElementCol(refValue.value, baseStore.numLines);
  });
  const elementRow = computed(() => {
    return getElementRow(refValue.value, baseStore.numLines);
  });
  const isFreeElement = computed(() => {
    return elementCol.value === baseStore.freeElementCol && elementRow.value === baseStore.freeElementRow;
  });
  const canMoveLeft = computed(() => {
    return baseStore.freeElementRow === elementRow.value &&
      (baseStore.freeElementIndex + 1) < refValue.value;
  });
  const canMoveRight = computed(() => {
    return baseStore.freeElementRow === elementRow.value &&
      (baseStore.freeElementIndex + 1) > refValue.value;
  });
  const canMoveUp = computed(() => {
    return baseStore.freeElementCol === elementCol.value &&
      (baseStore.freeElementIndex + 1) < refValue.value;
  });
  const canMoveDown = computed(() => {
    return baseStore.freeElementCol === elementCol.value &&
      (baseStore.freeElementIndex + 1) > refValue.value;
  });
  const calculatedLeft = computed(() => {
    return (Number(elementCol.value) - 1) * baseStore.spaceBetween +
      baseStore.spaceBetween + squareSize * (Number(elementCol.value) - 1);
  });
  const calculatedTop = computed(() => {
    return (Number(elementRow.value) - 1) * baseStore.spaceBetween +
      baseStore.spaceBetween + squareSize * (Number(elementRow.value) - 1);
  });
  const canMove = computed(() => {
    return [canMoveRight.value, canMoveLeft.value, canMoveUp.value, canMoveDown.value].some(Boolean);
  });

  const moveDirection = computed(() => {
    if (canMoveRight.value) {
      return Direction.Right;
    } else if (canMoveLeft.value) {
      return Direction.Left;
    } else if (canMoveUp.value) {
      return Direction.Up;
    } else if (canMoveDown.value) {
      return Direction.Down;
    }
    return Direction.None;
  });

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
