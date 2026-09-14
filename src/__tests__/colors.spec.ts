import { describe, expect, it } from 'vitest';
import { getTileColor } from '../colors';

const DEFAULT_COLOR = '#ffffff';

type Groups = readonly (readonly [string, readonly number[]])[];

function expectedColor(groups: Groups, tileNumber: number): string {
  for (const [color, tiles] of groups) {
    if (tiles.includes(tileNumber)) {
      return color;
    }
  }
  return DEFAULT_COLOR;
}

function checkAllTiles(size: number, groups: Groups): void {
  const max = size * size;
  // 0 and max+1 are out of range and must fall through to the default color.
  for (let tile = 0; tile <= max + 1; tile++) {
    expect(getTileColor(size, tile)).toBe(expectedColor(groups, tile));
  }
}

describe('getTileColor', () => {
  it('returns the theme fallback for an unsupported puzzle size', () => {
    expect(getTileColor(2, 1)).toBe('var(--square-bg-color)');
    expect(getTileColor(9, 1)).toBe('var(--square-bg-color)');
  });

  it('maps every tile for a 3x3 board', () => {
    checkAllTiles(3, [
      ['#ff6767', [1, 2, 3]],
      ['#fff054', [4, 7]],
      ['#7eff64', [5, 6]],
      ['#89dcff', [8]],
    ]);
  });

  it('maps every tile for a 4x4 board', () => {
    checkAllTiles(4, [
      ['#ff6767', [1, 2, 3, 4]],
      ['#fff054', [5, 9, 13]],
      ['#7eff64', [6, 7, 8]],
      ['#7effde', [10, 14]],
      ['#8eb3fe', [11, 12]],
      ['#cd88fe', [15]],
    ]);
  });

  it('maps every tile for a 5x5 board', () => {
    checkAllTiles(5, [
      ['#ff6767', [1, 2, 3, 4, 5]],
      ['#ffc74c', [6, 11, 16, 21]],
      ['#fff054', [7, 8, 9, 10]],
      ['#7eff64', [12, 17, 22]],
      ['#7effde', [13, 14, 15]],
      ['#84c8ff', [18, 23]],
      ['#9b95ff', [19, 20]],
      ['#cd88fe', [24]],
    ]);
  });

  it('maps every tile for a 6x6 board', () => {
    checkAllTiles(6, [
      ['#ff6767', [1, 2, 3, 4, 5, 6]],
      ['#ffb355', [7, 13, 19, 25, 31]],
      ['#eeff53', [8, 9, 10, 11, 12]],
      ['#94ff5b', [14, 20, 26, 32]],
      ['#69ff87', [15, 16, 17, 18]],
      ['#77ffdd', [21, 27, 33]],
      ['#83dadd', [22, 23, 24]],
      ['#8b9cff', [28, 34]],
      ['#bb8dff', [29, 30]],
      ['#f989ff', [35]],
    ]);
  });

  it('maps every tile for a 7x7 board', () => {
    checkAllTiles(7, [
      ['#ff6767', [1, 2, 3, 4, 5, 6, 7]],
      ['#ffa357', [8, 15, 22, 29, 36, 43]],
      ['#fff153', [9, 10, 11, 12, 13, 14]],
      ['#c1ff57', [16, 23, 30, 37, 44]],
      ['#7bff61', [17, 18, 19, 20, 21]],
      ['#6bff95', [24, 31, 38, 45]],
      ['#79ffde', [25, 26, 27, 28]],
      ['#83e6ff', [32, 39, 46]],
      ['#8bb2ff', [33, 34, 35]],
      ['#9a8dff', [40, 47]],
      ['#cf8dff', [41, 42]],
      ['#ff85fb', [48]],
    ]);
  });

  it('maps every tile for an 8x8 board', () => {
    checkAllTiles(8, [
      ['#ff6767', [1, 2, 3, 4, 5, 6, 7, 8]],
      ['#ff9959', [9, 17, 25, 33, 41, 49, 57]],
      ['#ffda53', [10, 11, 12, 13, 14, 15, 16]],
      ['#e3ff55', [18, 26, 34, 42, 50, 58]],
      ['#a2ff5b', [19, 20, 21, 22, 23, 24]],
      ['#6bff63', [27, 35, 43, 51, 59]],
      ['#6fffa1', [28, 29, 30, 31, 32]],
      ['#79ffde', [36, 44, 52, 60]],
      ['#83eeff', [37, 38, 39, 40]],
      ['#89c0ff', [45, 53, 61]],
      ['#8d97ff', [46, 47, 48]],
      ['#b18dff', [54, 62]],
      ['#dc8bff', [55, 56]],
      ['#ff83f3', [63]],
    ]);
  });
});
