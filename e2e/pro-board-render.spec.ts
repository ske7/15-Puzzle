import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './fixtures/api';
import { firstLegalMove } from './helpers/solver';

// The pro board is one canvas, so nothing in the DOM says what it looks like - a unit test
// can only check which draw calls were made, never that pixels landed. These read the
// canvas back and assert the board on screen agrees with the board in the store.

const WHITE = '255,255,255';

async function openProBoard(page: Page, numLines: number): Promise<void> {
  await mockApi(page);
  await page.addInitScript((size) => {
    localStorage.setItem('numLines', size);
    localStorage.setItem('hoverOnControl', 'true');
    localStorage.setItem('proMode', 'true');
  }, String(numLines));

  await page.goto('/');
  await expect(page.locator('.p-container canvas')).toBeVisible();
}

// Sampled a fifth of the way into each cell rather than at its centre, which carries the
// tile number and would read back as text colour.
async function cellPixels(page: Page, numLines: number): Promise<string[]> {
  return await page.evaluate((size) => {
    const canvas = document.querySelector<HTMLCanvasElement>('.p-container canvas')!;
    const ctx = canvas.getContext('2d')!;
    const pitch = canvas.width / size;
    const pixels: string[] = [];
    for (let index = 0; index < size * size; index += 1) {
      const x = Math.floor((index % size + 0.2) * pitch);
      const y = Math.floor((Math.floor(index / size) + 0.2) * pitch);
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      pixels.push(`${r},${g},${b}`);
    }
    return pixels;
  }, numLines);
}

async function blankIndex(page: Page): Promise<number> {
  return await page.evaluate(() => window.__cage15Test__!.getCurrentOrders().indexOf(0));
}

// The faintest pixel on the canvas. A seam between two tiles is a strip of half-covered
// pixels, and what they are half-covered *with* is nothing: the canvas starts transparent
// and the board behind shows through. So a board painted edge to edge has no pixel below
// full opacity anywhere.
async function faintestPixel(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.p-container canvas')!;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let faintest = 255;
    for (let offset = 3; offset < data.length; offset += 4) {
      faintest = Math.min(faintest, data[offset]);
    }
    return faintest;
  });
}

test.describe('pro board rendering', () => {
  test('paints every cell, with the blank left as bare board', async ({ page }) => {
    await openProBoard(page, 4);

    const pixels = await cellPixels(page, 4);
    const blank = await blankIndex(page);

    expect(pixels[blank]).toBe(WHITE);
    // The other fifteen are real tiles, and a board of one flat colour would mean the
    // per-cell painting never happened.
    expect(pixels.filter((colour) => colour !== WHITE)).toHaveLength(15);
    expect(new Set(pixels).size).toBeGreaterThan(2);
  });

  test('repaints both cells the blank moves between', async ({ page }) => {
    await openProBoard(page, 4);
    const before = await blankIndex(page);
    const move = firstLegalMove(before, 4);

    await page.keyboard.press(move.key);

    // Unlike the initial paint, a move is drawn through the dirty set on the next frame -
    // hence polling rather than reading once - and it must cover both the cell the blank
    // left and the one it arrived at.
    await expect.poll(async () => (await cellPixels(page, 4))[move.target]).toBe(WHITE);
    expect((await cellPixels(page, 4))[before]).not.toBe(WHITE);
  });

  test('repaints the whole board at a new puzzle size', async ({ page }) => {
    await openProBoard(page, 4);

    await page.locator('.puzzle-sizes span', { hasText: /^6$/ }).click();
    await expect.poll(async () => await page.evaluate(() => window.__cage15Test__!.getNumLines())).toBe(6);

    const pixels = await cellPixels(page, 6);
    const blank = await blankIndex(page);

    expect(pixels).toHaveLength(36);
    expect(pixels[blank]).toBe(WHITE);
    expect(pixels.filter((colour) => colour !== WHITE)).toHaveLength(35);
  });
});

// 125% display scaling, which is ordinary on Windows. At this ratio the 4x4 and 5x5 square
// sizes multiply out to a fractional number of device pixels while 3x3, 6x6, 7x7 and 8x8
// do not - which is why the seams showed up on some puzzle sizes and not others.
test.describe('pro board rendering at fractional display scaling', () => {
  test.use({ deviceScaleFactor: 1.25 });

  for (const numLines of [4, 5]) {
    test(`leaves no transparent seam between tiles at ${numLines}x${numLines}`, async ({ page }) => {
      await openProBoard(page, numLines);

      expect(await faintestPixel(page)).toBe(255);
    });
  }
});
