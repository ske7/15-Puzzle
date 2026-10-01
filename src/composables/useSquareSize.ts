import { computed, type ComputedRef } from 'vue';
import { useBaseStore } from '../stores/base';
import { useWindowWidth } from './useWindowWidth';

const CAGE_ADD_PRO: Record<number, number> = { 3: 56, 4: 22, 5: 1, 6: -12, 7: -20, 8: -28 };
const CAGE_ADD_DEFAULT: Record<number, number> = { 3: 45, 4: 12, 5: -8, 6: -21, 7: -31, 8: -38 };

export const useSquareSize = (): { squareSize: ComputedRef<number> } => {
  const baseStore = useBaseStore();

  const windowWidth = useWindowWidth();

  const squareSize = computed(() => {
    const spaces = baseStore.spaceBetween * 5;
    const cageAdd = baseStore.proMode
      ? CAGE_ADD_PRO[baseStore.numLines]
      : CAGE_ADD_DEFAULT[baseStore.numLines];
    let value: number;
    if (windowWidth.value <= 370) {
      if (baseStore.proMode) {
        value = Math.floor((windowWidth.value - (spaces + 40)) / baseStore.numLines);
      } else {
        value = Math.floor((windowWidth.value - (spaces + 70)) / baseStore.numLines);
      }
    } else if (windowWidth.value <= 480) {
      value = Math.floor((windowWidth.value - (spaces + 50)) / baseStore.numLines);
    } else if (windowWidth.value <= 820 && windowWidth.value >= 600) {
      value = 100 + cageAdd;
    } else {
      value = 80 + cageAdd;
    }
    return value;
  });

  return { squareSize };
};
