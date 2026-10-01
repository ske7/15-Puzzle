import { expect, test, type Page } from '@playwright/test';
import { jsonRoute, marathonRepGameFixture, mockApi } from './fixtures/api';

const repGame = marathonRepGameFixture();
const scrambles = repGame.scramble.split(';');
const solvedBoard = '1,2,3,4,5,6,7,8,0';

async function openReplay(page: Page): Promise<void> {
  await mockApi(page, {
    game: jsonRoute({ status: 'ok', game_id: 0, stats: repGame })
  });
  await page.goto('/?game_id=42');
  await expect(page.locator('.board')).toBeVisible();
}

async function mixedOrders(page: Page): Promise<string> {
  return await page.evaluate(() => window.__cage15Test__!.getMixedOrders().join(','));
}

async function currentOrders(page: Page): Promise<string> {
  return await page.evaluate(() => window.__cage15Test__!.getCurrentOrders().join(','));
}

function button(page: Page, name: string) {
  return page.locator('.action-panel').getByRole('button', { name, exact: true });
}

async function recordProgress(page: Page): Promise<void> {
  await page.evaluate(() => {
    const samples: { scramble: string; time: string }[] = [];
    (window as unknown as { samples: typeof samples }).samples = samples;
    const sample = (): void => {
      samples.push({
        scramble: window.__cage15Test__!.getMixedOrders().join(','),
        time: document.querySelector('.info-wrapper .factor-wrapper')!.textContent
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function progress(page: Page): Promise<{ scrambles: string[]; times: number[] }> {
  const samples = await page.evaluate(() => (window as unknown as { samples: { scramble: string; time: string }[] }).samples);
  const seen: string[] = [];
  for (const { scramble } of samples) {
    if (seen.at(-1) !== scramble) {
      seen.push(scramble);
    }
  }
  return { scrambles: seen, times: samples.map(({ time }) => Number.parseFloat(time.replace(/[^\d.]/g, ''))) };
}

test.describe('marathon replay', () => {
  test('shows Restart, Walk, speed and Replay controls, starting on the first scramble', async ({ page }) => {
    await openReplay(page);

    await expect(button(page, 'Restart')).toBeVisible();
    await expect(button(page, 'Walk')).toBeVisible();
    await expect(button(page, 'Replay')).toBeVisible();
    await expect(button(page, 's')).toBeVisible();
    await expect(button(page, 'f')).toBeVisible();
    expect(await mixedOrders(page)).toBe(scrambles[0]);
  });

  test('walks through all five puzzles with one running timer and move count', async ({ page }) => {
    test.setTimeout(60000);
    await openReplay(page);
    await button(page, 'f').click();
    await recordProgress(page);

    await button(page, 'Walk').click();

    await expect(page.locator('.info-wrapper')).toContainText(new RegExp(`Moves:\\s*${repGame.moves}(?!\\d)`), { timeout: 30000 });
    await expect(button(page, 'Walk')).toBeVisible();
    expect(await currentOrders(page)).toBe(solvedBoard);
    const { scrambles: seen, times } = await progress(page);
    expect(seen).toEqual(scrambles);
    expect(times.every((time, i) => i === 0 || time >= times[i - 1])).toBe(true);
    expect(times.at(-1)).toBeGreaterThan(0);
  });

  test('stops a walk on a later puzzle and resumes it from there', async ({ page }) => {
    test.setTimeout(60000);
    await openReplay(page);
    await button(page, 'f').click();

    await button(page, 'Walk').click();
    await page.waitForFunction((second) => window.__cage15Test__!.getMixedOrders().join(',') === second, scrambles[1]);
    await button(page, 'Stop').click();
    await expect(button(page, 'Walk')).toBeVisible();
    const stoppedAt = await currentOrders(page);
    expect(await mixedOrders(page)).toBe(scrambles[1]);

    await button(page, 'Walk').click();

    await expect(page.locator('.info-wrapper')).toContainText(new RegExp(`Moves:\\s*${repGame.moves}(?!\\d)`), { timeout: 30000 });
    expect(stoppedAt).not.toBe(solvedBoard);
    expect(await currentOrders(page)).toBe(solvedBoard);
  });

  test('Restart during a walk on a later puzzle goes back to the first scramble', async ({ page }) => {
    test.setTimeout(60000);
    await openReplay(page);
    await button(page, 'f').click();
    await button(page, 'Walk').click();
    await page.waitForFunction((second) => window.__cage15Test__!.getMixedOrders().join(',') === second, scrambles[1]);

    await button(page, 'Restart').click();

    await expect(button(page, 'Walk')).toBeVisible();
    await page.waitForFunction((first) => window.__cage15Test__!.getCurrentOrders().join(',') === first, scrambles[0]);
    expect(await mixedOrders(page)).toBe(scrambles[0]);
    await expect(page.locator('.info-wrapper')).toContainText(/Moves:\s*0/);
  });

  test('a viewer can solve all five puzzles by hand, getting a new solution without a save button', async ({ page }) => {
    test.setTimeout(60000);
    await mockApi(page, {
      game: jsonRoute({ status: 'ok', game_id: 0, stats: repGame }),
      get_current_user: jsonRoute({ status: 'ok', game_id: 0, token: 'fake-token', name: repGame.name })
    });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-token');
    });
    await page.goto('/?game_id=42');
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('.registered-block')).toContainText('Profile');
    await recordProgress(page);

    const keys: Record<string, string> = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown' };
    for (const move of repGame.solve_path.replaceAll(';', '')) {
      await page.keyboard.press(keys[move]);
    }

    await expect(page.locator('.info-wrapper')).toContainText(new RegExp(`Moves:\\s*${repGame.moves}(?!\\d)`));
    expect(await currentOrders(page)).toBe(solvedBoard);
    const { scrambles: seen } = await progress(page);
    expect(seen).toEqual(scrambles);
    const newSolution = page.locator('.copy-button-wrapper', { hasText: 'New solution' });
    await expect(newSolution).toContainText(repGame.solve_path);
    await expect(newSolution.locator('.save-button')).toHaveCount(0);
    await expect(page.locator('.copy-button-wrapper', { hasText: 'Original solution' }).locator('.save-button')).toHaveCount(0);
  });

  test('Replay starts again from the first puzzle after a finished walk', async ({ page }) => {
    test.setTimeout(90000);
    await openReplay(page);
    await button(page, 'f').click();
    await button(page, 'Walk').click();
    await expect(page.locator('.info-wrapper')).toContainText(new RegExp(`Moves:\\s*${repGame.moves}(?!\\d)`), { timeout: 30000 });

    await button(page, 'Replay').click();

    await page.waitForFunction((first) => window.__cage15Test__!.getMixedOrders().join(',') === first, scrambles[0]);
    await expect(button(page, 'Replay')).toBeDisabled();
  });
});
