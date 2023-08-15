import { computed, type ComputedRef } from 'vue';
import { useBaseStore } from '../stores/base';
import { getElementCol, getElementRow } from '../utils';

export const useCanMove = (refValue: ComputedRef<number>) => {
  const baseStore = useBaseStore();

  const elementCol = computed(() => {
    return getElementCol(refValue.value, baseStore.numLines);
  });
  const elementRow = computed(() => {
    return getElementRow(refValue.value, baseStore.numLines);
  });

  const canMoveRight = computed(() => {
    return baseStore.freeElementRow === elementRow.value && baseStore.freeElement > refValue.value;
  });
  const canMoveLeft = computed(() => {
    return baseStore.freeElementRow === elementRow.value && baseStore.freeElement < refValue.value;
  });
  const canMoveUp = computed(() => {
    return baseStore.freeElementCol === elementCol.value && baseStore.freeElement < refValue.value;
  });
  const canMoveDown = computed(() => {
    return baseStore.freeElementCol === elementCol.value && baseStore.freeElement > refValue.value;
  });

  const canMove = computed(() => {
    return canMoveRight.value || canMoveLeft.value || canMoveUp.value || canMoveDown.value;
  });

  return { elementCol, elementRow, canMoveRight, canMoveLeft, canMoveUp, canMoveDown, canMove };
};
