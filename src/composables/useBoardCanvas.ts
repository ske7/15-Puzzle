import { toValue, type MaybeRefOrGetter } from 'vue';
import { getTileColor } from '@/colors';

const TILE_TEXT_COLOR = '#0a0a23';

export interface BoardCanvasOptions {
  numLines: MaybeRefOrGetter<number>;
  squareSize: MaybeRefOrGetter<number>;
  font: MaybeRefOrGetter<string>;
  blankColor: MaybeRefOrGetter<string>;
}

export interface UseBoardCanvasResult {
  attach: (canvas: HTMLCanvasElement | null) => void;
  resize: () => void;
  paintCell: (index: number, value: number) => void;
  paintAll: (orders: readonly number[]) => void;
}

export const useBoardCanvas = (options: BoardCanvasOptions): UseBoardCanvasResult => {
  let element: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let scale = 1;

  const attach = (canvas: HTMLCanvasElement | null): void => {
    element = canvas;
    resize();
  };

  const resize = (): void => {
    if (element === null) {
      ctx = null;
      return;
    }
    const side = toValue(options.numLines) * toValue(options.squareSize);
    scale = devicePixelRatio;
    const backing = Math.round(side * scale);
    element.width = backing;
    element.height = backing;
    element.style.width = `${backing / scale}px`;
    element.style.height = `${backing / scale}px`;
    const context = element.getContext('2d');
    if (context === null) {
      ctx = null;
      return;
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = toValue(options.font);
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    ctx = context;
  };

  const paintAll = (orders: readonly number[]): void => {
    for (let index = 0; index < orders.length; index += 1) {
      paintCell(index, orders[index]);
    }
  };

  const paintCell = (index: number, value: number): void => {
    if (ctx === null) {
      return;
    }
    const numLines = toValue(options.numLines);
    const cell = toValue(options.squareSize);
    const col = index % numLines;
    const row = Math.floor(index / numLines);
    const left = snapToDevicePixel(col * cell);
    const top = snapToDevicePixel(row * cell);
    const right = snapToDevicePixel((col + 1) * cell);
    const bottom = snapToDevicePixel((row + 1) * cell);

    ctx.fillStyle = value === 0 ? toValue(options.blankColor) : getTileColor(numLines, value);
    ctx.fillRect(left, top, right - left, bottom - top);
    if (value === 0) {
      return;
    }
    ctx.fillStyle = TILE_TEXT_COLOR;
    ctx.fillText(value.toString(), (left + right) / 2, (top + bottom) / 2);
  };

  const snapToDevicePixel = (cssPx: number): number => Math.round(cssPx * scale) / scale;

  return { attach, resize, paintCell, paintAll };
};
