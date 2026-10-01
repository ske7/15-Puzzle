import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/api';

test.describe('pro mode', () => {
  test('a first visit boots pro mode, the default, with the canvas board responding to real keyboard moves', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => localStorage.setItem('numLines', '3'));

    await page.goto('/');
    await expect(page.locator('.p-container')).toBeVisible();

    // Uses a leading-digit regex, not an exact match: this span also nests a hidden
    // (v-show) opt-moves badge whose text Playwright's toHaveText reads regardless of
    // CSS visibility, so the full text content is "0+0", not "0".
    const movesValue = page.locator('.factor-wrapper', { hasText: 'Moves:' }).locator('.ml-5');
    await expect(movesValue).toHaveText(/^0/);

    // The blank tile's position is random, so not every direction is valid from a given
    // scramble - pressing all four guarantees at least one real move lands.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');

    await expect(movesValue).not.toHaveText(/^0/);
  });
});
