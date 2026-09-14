import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useBaseStore } from '../stores/base';
import { getElementCol, getElementRow, calcPosition } from '../utils';
import { Direction } from '@/const';
import { getMoveDirection } from './useCanMoveStatic';

export interface UseCanMoveResult {
  elementCol: ComputedRef<number>;
  elementRow: ComputedRef<number>;
  isFreeElement: ComputedRef<boolean>;
  canMoveRight: ComputedRef<boolean>;
  canMoveLeft: ComputedRef<boolean>;
  canMoveUp: ComputedRef<boolean>;
  canMoveDown: ComputedRef<boolean>;
  canMove: ComputedRef<boolean>;
  calculatedLeft: ComputedRef<number>;
  calculatedTop: ComputedRef<number>;
  moveDirection: ComputedRef<Direction>;
}

export const useCanMove = (
  refValue: ComputedRef<number>, squareSize: MaybeRefOrGetter<number>
): UseCanMoveResult => {
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
    return calcPosition(elementCol.value, baseStore.spaceBetween, toValue(squareSize));
  });
  const calculatedTop = computed(() => {
    return calcPosition(elementRow.value, baseStore.spaceBetween, toValue(squareSize));
  });
  const canMove = computed(() => {
    return [canMoveRight.value, canMoveLeft.value, canMoveUp.value, canMoveDown.value].some(Boolean);
  });

  const moveDirection = computed(() => {
    return getMoveDirection(canMoveRight.value, canMoveLeft.value, canMoveUp.value, canMoveDown.value);
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
