import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './fixtures/api';
import { driveMoves, firstLegalMove, solve } from './helpers/solver';

// Pro mode's hover control moves a tile as the pointer passes over it, with no button ever
// held. jsdom has no layout, so the unit suite can only check the cell arithmetic against a
// board position it was handed; these run against the real built bundle, where the board's
// position on screen is whatever the browser decides. Each test states one rule the control
// scheme has always followed, so a future rewrite has something to answer to.

interface Board {
  orders: number[];
  numLines: number;
}

async function openProBoard(page: Page, numLines: number, hover: boolean): Promise<Board> {
  await mockApi(page);
  await page.addInitScript(([size, hoverOn]) => {
    localStorage.setItem('numLines', size);
    localStorage.setItem('hoverOnControl', hoverOn);
    // A stored proMode is what marks this as a returning player. Without it, usePrepare
    // treats the visit as a first one and forces hoverOnControl back on.
    localStorage.setItem('proMode', 'true');
  }, [String(numLines), String(hover)]);

  await page.goto('/');
  await expect(page.locator('.p-container')).toBeVisible();

  const board = await readBoard(page);
  expect(board.numLines).toBe(numLines);
  return board;
}

async function readBoard(page: Page): Promise<Board> {
  return await page.evaluate(() => ({
    orders: window.__cage15Test__!.getCurrentOrders(),
    numLines: window.__cage15Test__!.getNumLines()
  }));
}

async function cellCentre(page: Page, index: number, numLines: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('.board').boundingBox();
  expect(box).not.toBeNull();
  const cell = box!.width / numLines;
  return {
    x: box!.x + (index % numLines + 0.5) * cell,
    y: box!.y + (Math.floor(index / numLines) + 0.5) * cell
  };
}

// A single hover sample on one cell's centre. Playwright's default one-step move dispatches
// exactly one mousemove, so nothing is crossed on the way in and no button is ever pressed.
async function hoverCell(page: Page, index: number, numLines: number): Promise<void> {
  const { x, y } = await cellCentre(page, index, numLines);
  await page.mouse.move(x, y);
}

// The far end of the blank's own row or column - the longest run the board offers from
// here. Alternating the axis keeps every target a different cell from the last one.
function farEndOppositeBlank(board: Board, alongRow: boolean): number {
  const blank = board.orders.indexOf(0);
  const row = Math.floor(blank / board.numLines);
  const col = blank % board.numLines;
  if (alongRow) {
    return row * board.numLines + (col === 0 ? board.numLines - 1 : 0);
  }
  return (row === 0 ? board.numLines - 1 : 0) * board.numLines + col;
}

// The far end of the blank's own row: sliding a whole run to it is the longest move the
// board offers from here, so a mis-mapped cell cannot coincidentally produce the same count.
function targetInBlankRow(board: Board): { index: number; distance: number } {
  const blank = board.orders.indexOf(0);
  const row = Math.floor(blank / board.numLines);
  const col = blank % board.numLines;
  const targetCol = col === 0 ? board.numLines - 1 : 0;
  return {
    index: row * board.numLines + targetCol,
    distance: Math.abs(targetCol - col)
  };
}

// The moves span also nests a hidden opt-moves badge whose text Playwright reads regardless
// of CSS visibility ("12+0"), so match a prefix - but one that cannot take 1 for 12.
function movesLocator(page: Page) {
  return page.locator('.factor-wrapper', { hasText: 'Moves:' }).locator('.ml-5');
}

function exactly(moves: number): RegExp {
  return new RegExp(`^${moves}(?!\\d)`);
}

test.describe('pro hover control', () => {
  test('moves the tile hovered, with no click anywhere first', async ({ page }) => {
    const board = await openProBoard(page, 4, true);
    const target = targetInBlankRow(board);

    await hoverCell(page, target.index, board.numLines);

    // The blank slides to meet the pointer, so it ends up in the cell hovered.
    const after = await readBoard(page);
    expect(after.orders.indexOf(0)).toBe(target.index);
    await expect(movesLocator(page)).toHaveText(exactly(target.distance));
  });

  test('a fast sweep across a row registers every tile it crosses', async ({ page }) => {
    const board = await openProBoard(page, 6, true);
    const blank = board.orders.indexOf(0);
    const row = Math.floor(blank / board.numLines);
    const startCol = blank % board.numLines;

    // One sample onto the row's left end, then a single unbroken swipe to its right end.
    await hoverCell(page, row * board.numLines, board.numLines);
    const end = await cellCentre(page, row * board.numLines + 5, board.numLines);
    await page.mouse.move(end.x, end.y, { steps: 40 });

    const after = await readBoard(page);
    expect(after.orders.indexOf(0)).toBe(row * board.numLines + 5);
    // startCol moves to bring the blank to the left end, then one per cell crossed on the
    // way back across. A sample dropped mid-swipe leaves the blank short of the far end.
    await expect(movesLocator(page)).toHaveText(exactly(startCol + 5));
  });

  // The board moves on screen without changing size whenever something above it grows: a
  // panel filling in from the network, an error line appearing. No resize observer fires
  // for that, and the window neither resized nor scrolled, so anything holding a remembered
  // board position is now wrong - and every hover after it lands on the wrong row.
  test('keeps hitting the right cell after the page reflows under it', async ({ page }) => {
    const board = await openProBoard(page, 4, true);

    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '120px';
      document.querySelector('#app')!.prepend(spacer);
    });

    const target = targetInBlankRow(board);
    await hoverCell(page, target.index, board.numLines);

    expect((await readBoard(page)).orders.indexOf(0)).toBe(target.index);
  });

  // The reported failure: hovering the far end opposite the blank, expecting the whole run
  // to slide, and nothing happens - not every time, and worse the longer a session runs.
  // One sweep proves nothing here; the point is that the fortieth behaves like the first.
  test('slides a full run on every sweep of a long session', async ({ page }) => {
    // Forty real sweeps. Firefox dispatches synthetic input measurably slower, and under a
    // parallel run across three browsers that pushes past the 30s default.
    test.setTimeout(60000);
    const numLines = 4;
    await openProBoard(page, numLines, true);

    for (let sweep = 0; sweep < 40; sweep += 1) {
      const target = farEndOppositeBlank(await readBoard(page), sweep % 2 === 0);
      await hoverCell(page, target, numLines);

      const after = await readBoard(page);
      expect(after.orders.indexOf(0), `sweep ${sweep}`).toBe(target);
    }
  });

  // A cursor resting on a cell while the board changes under it - the next marathon round
  // arriving, or a keyboard move. The cell it is already sitting on has to move on the next
  // sample, without being made to leave the cell and come back first.
  test('moves the cell the cursor is already on once the board changes under it', async ({ page }) => {
    const numLines = 4;
    await openProBoard(page, numLines, true);

    // Park the cursor by sweeping a run to it, so the blank ends up under the cursor.
    const parked = farEndOppositeBlank(await readBoard(page), true);
    await hoverCell(page, parked, numLines);
    await expect.poll(async () => (await readBoard(page)).orders.indexOf(0)).toBe(parked);

    // The keyboard moves the blank off that cell; the cursor has not moved at all.
    await page.keyboard.press(firstLegalMove(parked, numLines).key);
    await expect.poll(async () => (await readBoard(page)).orders.indexOf(0)).not.toBe(parked);

    // The cursor only twitches, staying well inside the same cell.
    const centre = await cellCentre(page, parked, numLines);
    await page.mouse.move(centre.x + 2, centre.y + 2);

    expect((await readBoard(page)).orders.indexOf(0)).toBe(parked);
  });

  // The reported path: a marathon scramble solved by hovering leaves the cursor on the last
  // cell, and the next scramble appears with a movable tile under it. Before that scramble's
  // first move a tile moves only when the cursor enters it, as the per-tile mouseenter always
  // did, so leaving the board and coming back onto the tile has to move it.
  test('in a marathon, re-entering the tile under the cursor from off the board moves it', async ({ page }) => {
    test.setTimeout(120000);
    const numLines = 3;
    const restingCell = numLines * numLines - 1;
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('numLines', '3');
      localStorage.setItem('hoverOnControl', 'true');
      localStorage.setItem('proMode', 'true');
      localStorage.setItem('marathonMode', 'true');
    });

    const onlyEnteringMoves = (blank: number): boolean => {
      const sameLine = Math.floor(blank / numLines) === Math.floor(restingCell / numLines) ||
        blank % numLines === restingCell % numLines;
      return sameLine && blank !== restingCell;
    };

    let found = false;
    for (let attempt = 0; attempt < 40 && !found; attempt += 1) {
      if (attempt % 4 === 0) {
        await page.goto('/');
        await expect(page.locator('.p-container canvas')).toBeVisible();
      }
      const start = await readBoard(page);
      const startScramble = start.orders.join(',');
      const moves = solve(start.orders, numLines);
      await driveMoves(page, moves.slice(0, -1));
      await hoverCell(page, restingCell, numLines);
      await page.waitForFunction(
        (previous) => window.__cage15Test__!.getMixedOrders().join(',') !== previous,
        startScramble
      );

      const next = await readBoard(page);
      if (!onlyEnteringMoves(next.orders.indexOf(0))) {
        continue;
      }
      found = true;

      const centre = await cellCentre(page, restingCell, numLines);
      await page.mouse.move(centre.x + 3, centre.y + 3);
      expect((await readBoard(page)).orders, 'a twitch inside the cell must not start the scramble').toEqual(next.orders);

      await page.mouse.move(1, 1);
      await page.mouse.move(centre.x, centre.y);
      await expect.poll(async () => (await readBoard(page)).orders.indexOf(0)).toBe(restingCell);
    }
    expect(found, 'no scramble put a movable tile under the resting cursor').toBe(true);
  });

  test('maps the pointer to the right cell after a puzzle-size change', async ({ page }) => {
    await openProBoard(page, 4, true);

    // The board's own size selector, off to the right - the tiles are never clicked.
    await page.locator('.puzzle-sizes span', { hasText: /^6$/ }).click();
    await expect.poll(async () => (await readBoard(page)).numLines).toBe(6);

    const board = await readBoard(page);
    const target = targetInBlankRow(board);

    await hoverCell(page, target.index, board.numLines);

    const after = await readBoard(page);
    expect(after.orders.indexOf(0)).toBe(target.index);
  });

  test('holding ctrl suspends hover, and releasing it resumes', async ({ page }) => {
    const board = await openProBoard(page, 4, true);
    const target = targetInBlankRow(board);

    await page.keyboard.down('Control');
    await hoverCell(page, target.index, board.numLines);
    await expect(movesLocator(page)).toHaveText(exactly(0));
    await page.keyboard.up('Control');

    // Off the board and back, so the resumed hover is a fresh entry into the same cell.
    await page.mouse.move(1, 1);
    await hoverCell(page, target.index, board.numLines);
    expect((await readBoard(page)).orders.indexOf(0)).toBe(target.index);
  });

  test('with hover control off, a click moves and a hover does not', async ({ page }) => {
    const board = await openProBoard(page, 4, false);
    const target = targetInBlankRow(board);

    await hoverCell(page, target.index, board.numLines);
    await expect(movesLocator(page)).toHaveText(exactly(0));

    const { x, y } = await cellCentre(page, target.index, board.numLines);
    await page.mouse.click(x, y);

    const after = await readBoard(page);
    expect(after.orders.indexOf(0)).toBe(target.index);
    await expect(movesLocator(page)).toHaveText(exactly(target.distance));
  });
});

// Casual tiles slide into place, so hover there is hit-tested on the grid: a tile still sliding
// under the pointer, caught by its own hover, would be sent straight back.
test.describe('casual hover control', () => {
  test('a sweep out along the blank row and back moves each tile once, while tiles keep sliding', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('numLines', '4');
      localStorage.setItem('hoverOnControl', 'true');
      localStorage.setItem('proMode', 'false');
    });
    await page.goto('/');
    await expect(page.locator('.board .square').first()).toBeVisible();
    const board = await readBoard(page);
    const blank = board.orders.indexOf(0);
    const target = targetInBlankRow(board);
    const step = target.index > blank ? 1 : -1;
    // Every cell from `from` to `to`, both included, even when they are the same cell.
    const sweep = async (from: number, to: number): Promise<void> => {
      const direction = to < from ? -1 : 1;
      for (let i = 0; i <= Math.abs(to - from); i += 1) {
        const { x, y } = await cellCentre(page, from + i * direction, board.numLines);
        await page.mouse.move(x, y, { steps: 4 });
      }
    };

    // One jump onto the first cell, so the way in crosses no other tile.
    await hoverCell(page, blank + step, board.numLines);
    await sweep(blank + step, target.index);
    expect((await readBoard(page)).orders.indexOf(0)).toBe(target.index);
    await expect(movesLocator(page)).toHaveText(exactly(target.distance));

    await sweep(target.index - step, blank);
    expect((await readBoard(page)).orders.indexOf(0)).toBe(blank);
    await expect(movesLocator(page)).toHaveText(exactly(2 * target.distance));

    expect(await page.locator('.board .square').first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.2s');
  });
});

// The playground opens on its own page, so a finger slide there is checked end to end too.
test.describe('finger slide in the playground', () => {
  test.use({ hasTouch: true });

  test('slides every tile a finger crosses in the playground', async ({ page, context, browserName }) => {
    // Chromium only by design: Playwright has no touch drag, so real touch input goes through its DevTools protocol.
    test.skip(browserName !== 'chromium', 'a real touch drag can only be sent through the Chromium DevTools protocol');
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('numLines', '4');
      localStorage.setItem('hoverOnControl', 'true');
      localStorage.setItem('proMode', 'true');
    });
    await page.goto('/?playground');
    await expect(page.locator('.p-container canvas')).toBeVisible();

    const board = await readBoard(page);
    const target = targetInBlankRow(board);
    const from = await cellCentre(page, board.orders.indexOf(0), board.numLines);
    const to = await cellCentre(page, target.index, board.numLines);
    const cdp = await context.newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', point?: { x: number; y: number }): Promise<void> => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ x: point.x, y: point.y }] : [] });
    };

    await touch('touchStart', from);
    for (let step = 1; step <= 12; step++) {
      await touch('touchMove', { x: from.x + (to.x - from.x) * step / 12, y: from.y });
    }
    await touch('touchEnd');

    expect((await readBoard(page)).orders.indexOf(0)).toBe(target.index);
    await expect(movesLocator(page)).toHaveText(exactly(target.distance));
  });
});
