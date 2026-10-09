import { computed, type ComputedRef } from 'vue';
import { useBaseStore } from '../stores/base';
import { useWindowWidth } from './useWindowWidth';
import { useBoardRoom } from './useBoardRoom';

const MIN_PHONE_BOARD = 200;

export const useSquareSize = (): { squareSize: ComputedRef<number> } => {
  const baseStore = useBaseStore();

  const windowWidth = useWindowWidth();
  const room = useBoardRoom();

  // Tiles may be fractional, so the board keeps the same width for every puzzle size and mode.
  const squareSize = computed(() => {
    const gaps = baseStore.spaceBetween * (baseStore.numLines + 1);
    return (boardWidth(windowWidth.value, room.value) - gaps) / baseStore.numLines;
  });

  return { squareSize };
};

function boardWidth(windowWidth: number, room: number): number {
  if (windowWidth <= 480) {
    return Math.max(MIN_PHONE_BOARD, Math.min(phoneBoardWidth(windowWidth), room));
  }
  if (windowWidth >= 600 && windowWidth <= 820) {
    return 488;
  }
  return 408;
}

// Phones fit the board to the screen's width, and to the height the rest of the page leaves.
function phoneBoardWidth(windowWidth: number): number {
  return windowWidth <= 370 ? windowWidth - 40 : windowWidth - 50;
}
