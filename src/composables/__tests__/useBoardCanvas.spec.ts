import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useBoardCanvas } from '../useBoardCanvas';
import { forgetCanvasContexts, lastCanvasContext, refuseNextCanvasContext } from '../../../tests/canvasContext';
import { getTileColor } from '@/colors';

const CELL = 50;

function make(numLines = 3, squareSize = CELL) {
  return useBoardCanvas({
    numLines,
    squareSize,
    font: '600 45px consolas, sans-serif',
    blankColor: '#ffffff'
  });
}

const context = lastCanvasContext;

describe('useBoardCanvas', () => {
  beforeEach(() => {
    forgetCanvasContexts();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scales the backing store for the device pixel ratio', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const canvas = document.createElement('canvas');
    make().attach(canvas);

    expect(canvas.style.width).toBe('150px');
    expect(canvas.width).toBe(300);
    expect(context().setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  // The reported hairline gaps between tiles. A 67px tile at 125% display scaling puts its
  // edge on device pixel 83.75; the half-covered pixel either side of that antialiases
  // against the transparent canvas and the board shows through as a 1px seam. Only some
  // puzzle sizes were affected because only some square sizes give a fractional product.
  describe('on a fractional device pixel ratio', () => {
    const RATIO = 1.25;

    // Rounding differences make exact equality unsafe here, so assert what actually
    // matters: the edge sits on a whole device pixel.
    function expectOnDevicePixel(cssPx: number): void {
      expect(cssPx * RATIO).toBeCloseTo(Math.round(cssPx * RATIO), 6);
    }

    it('keeps neighbouring cells exactly flush', () => {
      vi.stubGlobal('devicePixelRatio', RATIO);
      const board = make(4, 67);
      board.attach(document.createElement('canvas'));
      const ctx = context();
      ctx.fillRect.mockClear();

      board.paintCell(0, 1); // top-left
      board.paintCell(1, 2); // its right-hand neighbour
      board.paintCell(4, 5); // the one below it

      const [left, top, width, height] = ctx.fillRect.mock.calls[0] as number[];
      const [nextLeft] = ctx.fillRect.mock.calls[1] as number[];
      const [, belowTop] = ctx.fillRect.mock.calls[2] as number[];

      expect(left + width).toBe(nextLeft); // no gap and no overlap across
      expect(top + height).toBe(belowTop); // nor down
      for (const edge of [left, nextLeft, top, belowTop]) {
        expectOnDevicePixel(edge);
      }
    });

    it('fills out to the canvas edge, leaving no strip at the board rim', () => {
      vi.stubGlobal('devicePixelRatio', RATIO);
      const canvas = document.createElement('canvas');
      const board = make(4, 67);
      board.attach(canvas);
      const ctx = context();
      ctx.fillRect.mockClear();

      board.paintCell(15, 0); // bottom-right corner

      const [left, top, width, height] = ctx.fillRect.mock.calls[0] as number[];
      expect((left + width) * RATIO).toBeCloseTo(canvas.width, 6);
      expect((top + height) * RATIO).toBeCloseTo(canvas.height, 6);
    });
  });

  it('paints each cell at its own offset', () => {
    const board = make();
    board.attach(document.createElement('canvas'));
    const ctx = context();
    ctx.fillRect.mockClear();

    board.paintCell(0, 1);
    board.paintCell(4, 5);
    board.paintCell(8, 9);

    expect(ctx.fillRect.mock.calls).toEqual([
      [0, 0, CELL, CELL],
      [CELL, CELL, CELL, CELL],
      [CELL * 2, CELL * 2, CELL, CELL]
    ]);
  });

  it('centres the tile number in its cell', () => {
    const board = make();
    board.attach(document.createElement('canvas'));
    const ctx = context();

    board.paintCell(4, 5);

    expect(ctx.fillText).toHaveBeenCalledWith('5', CELL * 1.5, CELL * 1.5);
  });

  it('fills the blank with the blank colour and draws no number on it', () => {
    const board = make();
    board.attach(document.createElement('canvas'));
    const ctx = context();
    ctx.fillText.mockClear();

    board.paintCell(8, 0);

    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('fills a numbered tile with its band colour, then draws the number over it', () => {
    const board = make(4);
    board.attach(document.createElement('canvas'));
    const ctx = context();
    // fillStyle only ever holds the last value written, so record the sequence instead.
    const styles: string[] = [];
    Object.defineProperty(ctx, 'fillStyle', {
      set: (value: string) => { styles.push(value) },
      get: () => styles.at(-1) ?? '',
      configurable: true
    });

    board.paintCell(0, 7);

    expect(styles).toEqual([getTileColor(4, 7), '#0a0a23']);
  });

  it('paints the whole board from an orders array', () => {
    const board = make();
    board.attach(document.createElement('canvas'));
    const ctx = context();
    ctx.fillRect.mockClear();

    board.paintAll([1, 2, 3, 4, 5, 6, 7, 8, 0]);

    expect(ctx.fillRect).toHaveBeenCalledTimes(9);
    expect(ctx.fillText).toHaveBeenCalledTimes(8);
  });

  it('follows a reactive square size on the next resize', () => {
    const squareSize = ref(CELL);
    const board = useBoardCanvas({
      numLines: 3, squareSize, font: '', blankColor: '#ffffff'
    });
    const canvas = document.createElement('canvas');
    board.attach(canvas);

    squareSize.value = 100;
    board.resize();

    expect(canvas.style.width).toBe('300px');
  });

  describe('when there is nothing to paint on', () => {
    it('does nothing with no canvas attached', () => {
      const board = make();
      expect(() => {
        board.resize();
        board.paintCell(0, 1);
      }).not.toThrow();
    });

    it('leaves the board unpainted when the browser refuses a context', () => {
      refuseNextCanvasContext();
      const board = make();
      board.attach(document.createElement('canvas'));

      // No context was handed out, so nothing can be drawn - and nothing throws.
      expect(() => board.paintAll([1, 2, 3, 4, 5, 6, 7, 8, 0])).not.toThrow();
    });

    it('stops painting once detached', () => {
      const board = make();
      board.attach(document.createElement('canvas'));
      const ctx = context();
      board.attach(null);
      ctx.fillRect.mockClear();

      board.paintCell(0, 1);

      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });
});
