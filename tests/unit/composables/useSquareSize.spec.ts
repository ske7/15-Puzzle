import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '@/stores/base';
import { withSetup } from '../../withSetup';
import { useSquareSize } from '@/composables/useSquareSize';
import { boardRoomKey } from '@/composables/useBoardRoom';
import { getCurrentInstance, ref } from 'vue';

describe('useSquareSize', () => {
  function setWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const MODES = [
    { mode: 'pro', proMode: true, spaceBetween: 0 },
    { mode: 'casual', proMode: false, spaceBetween: 8 },
    { mode: 'cage', proMode: false, spaceBetween: 0 }
  ];
  const SCREENS = [
    { width: 1280, board: 408 },
    { width: 540, board: 408 },
    { width: 700, board: 488 },
    { width: 420, board: 370 },
    { width: 360, board: 320 }
  ];

  describe.each(SCREENS)('on a $width px wide screen', ({ width, board }) => {
    it.each(MODES)('keeps the $mode board $board px wide for every puzzle size', ({ proMode, spaceBetween }) => {
      setWidth(width);
      const store = useBaseStore();
      Object.assign(store, { proMode, spaceBetween });
      const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
      for (const numLines of [3, 4, 5, 6, 7, 8]) {
        store.numLines = numLines;
        expect(numLines * squareSize.value + spaceBetween * (numLines + 1)).toBeCloseTo(board, 9);
        expect(store.boardSize(squareSize.value)).toBe(`${board}px`);
      }
      unmount();
    });
  });

  describe('on a phone too short for the whole page', () => {
    function squareSizeWithRoom(width: number, room: number): number {
      setWidth(width);
      const store = useBaseStore();
      Object.assign(store, { proMode: true, spaceBetween: 0, numLines: 4 });
      const [{ squareSize }, unmount] = withSetup(() => {
        getCurrentInstance()!.appContext.app.provide(boardRoomKey, ref(room));
        return useSquareSize();
      });
      const size = squareSize.value;
      unmount();
      return size;
    }

    it('fits the board into the height the page leaves', () => {
      expect(squareSizeWithRoom(375, 266) * 4).toBe(266);
      expect(squareSizeWithRoom(320, 218) * 4).toBe(218);
    });

    it('keeps the width-based board when there is height to spare', () => {
      expect(squareSizeWithRoom(390, 500) * 4).toBe(340);
    });

    it('never shrinks the board below 200px', () => {
      expect(squareSizeWithRoom(375, 120) * 4).toBe(200);
    });

    it('leaves tablet and desktop boards alone', () => {
      expect(squareSizeWithRoom(700, 266) * 4).toBe(488);
      expect(squareSizeWithRoom(1280, 266) * 4).toBe(408);
    });
  });

  it('lets a tile be fractional rather than change the board', () => {
    setWidth(1280);
    const store = useBaseStore();
    Object.assign(store, { proMode: true, spaceBetween: 0, numLines: 7 });
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBeCloseTo(408 / 7, 9);
    unmount();
  });
});
