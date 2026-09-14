import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import ProBoard from '../ProBoard.vue';
import { useBaseStore } from '../../stores/base';
import { forgetCanvasContexts, lastCanvasContext } from '../../../tests/canvasContext';
import { ControlType } from '@/const';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
}

// A real solved board of the given size, blank in the bottom-right corner.
function setup(numLines: number) {
  const store = useBaseStore();
  const cells = numLines * numLines;
  store.numLines = numLines;
  store.spaceBetween = 0;
  store.proMode = true;
  store.mixedOrders = Array.from({ length: cells }, (_, i) => (i + 1) % cells);
  store.currentOrders = store.mixedOrders.slice();
  return store;
}

let currentWrapper: ReturnType<typeof mount> | undefined;
let frames: (() => void)[] = [];

function mountBoard(squareSize = 80) {
  currentWrapper = mount(ProBoard, { props: { squareSize } });
  return currentWrapper;
}

interface ProBoardInternals {
  font: string;
  blankColor: string;
}

function internals(wrapper: ReturnType<typeof mountBoard>): ProBoardInternals {
  return wrapper.vm as unknown as ProBoardInternals;
}

// The real 2D context handed out by the shared canvas stub, so drawing is asserted through
// the calls the component actually makes rather than by mocking the renderer.
const context = lastCanvasContext;

function runFrames(): void {
  const pending = frames;
  frames = [];
  for (const frame of pending) {
    frame();
  }
}

describe('ProBoard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setWidth(1024);
    frames = [];
    forgetCanvasContexts();
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    vi.unstubAllGlobals();
  });

  describe('font size', () => {
    it.each([
      { numLines: 4, expected: '45px' },
      { numLines: 6, expected: '39px' },
      { numLines: 7, expected: '35px' },
      { numLines: 8, expected: '33px' }
    ])('uses $expected at $numLines lines on a wide screen', ({ numLines, expected }) => {
      setup(numLines);
      const wrapper = mountBoard();
      expect(internals(wrapper).font).toBe(`600 ${expected} consolas, sans-serif`);
    });

    it.each([
      { numLines: 4, expected: '33px' },
      { numLines: 6, expected: '29px' },
      { numLines: 7, expected: '25px' },
      { numLines: 8, expected: '24px' }
    ])('drops to $expected at $numLines lines on a narrow screen', ({ numLines, expected }) => {
      setWidth(390);
      setup(numLines);
      const wrapper = mountBoard();
      expect(internals(wrapper).font).toBe(`600 ${expected} consolas, sans-serif`);
    });
  });

  it('sizes the canvas to the whole board, not one tile', () => {
    setup(4);
    const wrapper = mountBoard(80);
    expect(wrapper.find('canvas').element.style.width).toBe('320px');
  });

  it('paints every cell once on mount', () => {
    setup(3);
    mountBoard();
    // One fill per cell, and text on all but the blank.
    expect(context().fillRect).toHaveBeenCalledTimes(9);
    expect(context().fillText).toHaveBeenCalledTimes(8);
  });

  it('uses the dark blank colour in dark mode', () => {
    const store = setup(3);
    store.darkMode = true;
    const wrapper = mountBoard();
    expect(internals(wrapper).blankColor).toBe('#121212');
  });

  describe('repainting', () => {
    it('repaints only the two cells a move changes', async () => {
      const store = setup(3);
      mountBoard();
      const ctx = context();
      ctx.fillRect.mockClear();

      store.moveRight(ControlType.Mouse);
      await nextTick();
      runFrames();

      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    });

    it('coalesces several moves in one frame into one repaint per cell', async () => {
      const store = setup(3);
      mountBoard();
      const ctx = context();
      ctx.fillRect.mockClear();

      // The blank travels 8 -> 7 -> 6, so cell 7 changes twice but is painted once.
      store.moveRight(ControlType.Mouse);
      await nextTick();
      store.moveRight(ControlType.Mouse);
      await nextTick();
      runFrames();

      expect(ctx.fillRect).toHaveBeenCalledTimes(3);
    });

    it('repaints the whole board when the puzzle size changes', async () => {
      const store = setup(3);
      mountBoard();
      const ctx = context();
      ctx.fillRect.mockClear();

      store.numLines = 4;
      store.mixedOrders = Array.from({ length: 16 }, (_, i) => (i + 1) % 16);
      store.currentOrders = store.mixedOrders.slice();
      await nextTick();

      // A resize replaces the context, so the fresh one carries the new board's paints.
      expect(context().fillRect).toHaveBeenCalledTimes(16);
    });

    it('cancels a pending frame when unmounted', async () => {
      const store = setup(3);
      const wrapper = mountBoard();
      store.moveRight(ControlType.Mouse);
      await nextTick();

      wrapper.unmount();
      currentWrapper = undefined;

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('in-place tally', () => {
    it('recounts tiles in their home position after a move', async () => {
      const store = setup(3);
      store.doneFirstMove = true;
      mountBoard();

      store.moveRight(ControlType.Mouse); // slides tile 8 right, off its home square
      await nextTick();

      expect(store.inPlaceCount).toBe(7);
    });

    // A move of its own sets doneFirstMove, so the guard can only be seen on the path that
    // actually reaches it: a fresh scramble arriving as a new array, with no move made.
    it('leaves the tally to the store before the first move', async () => {
      const store = setup(3);
      store.doneFirstMove = false;
      mountBoard();
      store.inPlaceCount = 3;

      store.currentOrders = [1, 2, 3, 4, 5, 0, 7, 8, 6]; // a recount would say 7
      await nextTick();

      expect(store.inPlaceCount).toBe(3);
    });

    it('reaches the solved tally when the last tile lands home', async () => {
      const store = setup(3);
      store.doneFirstMove = true;
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 0, 8];
      mountBoard();

      store.moveLeft(ControlType.Mouse); // slides tile 8 back into its home square
      await nextTick();

      expect(store.inPlaceCount).toBe(8);
      expect(store.isDone).toBe(true);
    });
  });
});
