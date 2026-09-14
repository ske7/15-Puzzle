import { expect, test, type Page } from '@playwright/test';
import { jsonRoute, mockApi } from './fixtures/api';
import { driveMoves, firstLegalMove, solve } from './helpers/solver';

const OPT_M = 1;
const numLines = 3;

async function orders(page: Page): Promise<{ current: number[]; mixed: number[] }> {
  return await page.evaluate(() => ({
    current: window.__cage15Test__!.getCurrentOrders(),
    mixed: window.__cage15Test__!.getMixedOrders()
  }));
}

async function hoverCell(page: Page, index: number): Promise<{ x: number; y: number }> {
  const box = (await page.locator('.board').boundingBox())!;
  const cell = box.width / numLines;
  const point = {
    x: box.x + (index % numLines + 0.5) * cell,
    y: box.y + (Math.floor(index / numLines) + 0.5) * cell
  };
  await page.mouse.move(point.x, point.y);
  return point;
}

test.describe('fmc blitz', () => {
  test.describe.configure({ timeout: 120000 });

  test('sends every solve to the server while an earlier one is still being saved', async ({ page }) => {
    const savedMoves: number[] = [];
    await mockApi(page, {
      get_current_user: jsonRoute({ status: 'ok', token: 'fake-token', name: 'tester' }),
      game: async (route) => {
        savedMoves.push((route.request().postDataJSON() as { game: { moves: number } }).game.moves);
        await new Promise((resolve) => setTimeout(resolve, 8000));
        await route.fulfill({ json: { status: 'ok', game_id: savedMoves.length, public_id: 'pub', opt_m: OPT_M } });
      },
      update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
    });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('numLines', '3');
      localStorage.setItem('proMode', 'true');
      localStorage.setItem('hoverOnControl', 'true');
      localStorage.setItem('fmcBlitz', 'true');
    });

    await page.goto('/');
    await expect(page.locator('.p-container canvas')).toBeVisible();

    const solved: number[] = [];
    for (let scramble = 1; scramble <= 2; scramble += 1) {
      const start = await orders(page);
      const moves = solve(start.current, numLines);
      await driveMoves(page, moves);
      solved.push(moves.length);
      await page.waitForFunction(
        (previous) => window.__cage15Test__!.getMixedOrders().join(',') !== previous,
        start.mixed.join(',')
      );
    }

    // Both reach the server before it has answered the first.
    await expect.poll(() => savedMoves.length, { timeout: 6000 }).toBe(2);
    expect(savedMoves).toEqual(solved);
  });

  // The optimal-moves gap for a solved scramble arrives from the server a moment after the
  // next scramble is dealt. It belongs on screen until that next scramble is started, and a
  // cursor resting on the board must not start it by itself.
  test('shows the optimal-moves gap between scrambles until the next one is started', async ({ page }) => {
    await mockApi(page, {
      get_current_user: jsonRoute({ status: 'ok', token: 'fake-token', name: 'tester' }),
      game: async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.fulfill({ json: { status: 'ok', game_id: 1, public_id: 'pub-1', opt_m: OPT_M } });
      },
      update_stats: jsonRoute({ status: 'ok', stats: {}, was_avg_records: [] })
    });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('numLines', '3');
      localStorage.setItem('proMode', 'true');
      localStorage.setItem('hoverOnControl', 'true');
      localStorage.setItem('fmcBlitz', 'true');
    });

    await page.goto('/');
    await expect(page.locator('.p-container canvas')).toBeVisible();
    const optMoves = page.locator('.opt-moves');

    let movesAlreadyMade = 0;
    for (let scramble = 1; scramble <= 3; scramble += 1) {
      const start = await orders(page);
      // Rest the cursor on the blank, where hovering moves nothing.
      const resting = await hoverCell(page, start.current.indexOf(0));

      const moves = solve((await orders(page)).current, numLines);
      await driveMoves(page, moves);
      await page.waitForFunction(
        (previous) => window.__cage15Test__!.getMixedOrders().join(',') !== previous,
        start.mixed.join(',')
      );

      // The hand on the mouse is not perfectly still.
      await page.mouse.move(resting.x + 2, resting.y + 2);

      await expect(optMoves, `scramble ${scramble}`).toBeVisible();
      await expect(optMoves).toHaveText(`+${movesAlreadyMade + moves.length - OPT_M}`);
      const next = await orders(page);
      expect(next.current, `scramble ${scramble + 1} was started by a resting cursor`).toEqual(next.mixed);

      await page.keyboard.press(firstLegalMove(next.current.indexOf(0), numLines).key);
      await expect(optMoves).toBeHidden();
      movesAlreadyMade = 1;
    }
  });
});
