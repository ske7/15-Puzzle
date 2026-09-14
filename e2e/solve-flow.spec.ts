import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/api';
import { driveMoves, solve } from './helpers/solver';

test.describe('solve flow', () => {
  // A real 3x3 scramble can need up to 31 moves (God's number), each driven by a real
  // keypress - comfortably inside Playwright's 30s default on Chromium/WebKit, but Firefox's
  // per-keypress dispatch runs measurably slower and can exceed it on a longer solve.
  test.describe.configure({ timeout: 60000 });

  test('solving a real freshly-shuffled 3x3 puzzle shows the win modal and persists the time record', async ({ page }) => {
    await mockApi(page);
    // getNumLinesFromLocalStorage() in usePrepare.ts reads this before the board ever
    // shuffles - forcing 3x3 keeps the real BFS solver's state space small (~181k states).
    await page.addInitScript(() => {
      localStorage.setItem('numLines', '3');
    });

    await page.goto('/');
    await expect(page.locator('.board')).toBeVisible();

    const { mixedOrders, numLines } = await page.evaluate(() => ({
      mixedOrders: window.__cage15Test__!.getMixedOrders(),
      numLines: window.__cage15Test__!.getNumLines()
    }));
    expect(numLines).toBe(3);

    const moves = solve(mixedOrders, numLines);
    expect(moves.length).toBeGreaterThan(0);
    await driveMoves(page, moves);

    await expect(page.locator('.win-modal')).toBeVisible();
    const timeRecord = await page.evaluate(() => localStorage.getItem('timeRecord3'));
    expect(timeRecord).not.toBeNull();
  });
});
