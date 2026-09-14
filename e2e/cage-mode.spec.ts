import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/api';

test.describe('cage mode', () => {
  test('?cage forces the 4x4 core size, persists enableCageMode, and opens the real image gallery', async ({ page }) => {
    await mockApi(page);

    await page.goto('/?cage');
    // Cage mode loads real themed tile images before the loading veil clears.
    await expect(page.locator('.loading-veil')).toHaveCount(0, { timeout: 15000 });

    const numLines = await page.evaluate(() => window.__cage15Test__!.getNumLines());
    expect(numLines).toBe(4);
    const enableCageMode = await page.evaluate(() => localStorage.getItem('enableCageMode'));
    expect(enableCageMode).toBe('true');

    await page.getByText('Completed').click();
    await expect(page.locator('.image-gallery')).toBeVisible();
  });

  // A player with every cage but one unlocked is always dealt that same last cage, so each
  // reset reshuffles the tiles under an unchanged picture.
  test('keeps loading after every reset when the same cage picture comes back', async ({ page }) => {
    test.setTimeout(120000);
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('_xcu', btoa(Array.from({ length: 24 }, (_, i) => i).join(',')));
    });

    await page.goto('/?cage');
    await expect(page.getByText('Please wait a moment')).toBeHidden({ timeout: 15000 });

    for (let reset = 1; reset <= 12; reset += 1) {
      const before = await page.evaluate(() => window.__cage15Test__!.getMixedOrders().join(','));
      await page.getByRole('button', { name: 'Restart' }).first().click();
      await page.waitForFunction(
        (previous) => window.__cage15Test__!.getMixedOrders().join(',') !== previous,
        before,
        { timeout: 10000 }
      );

      await expect(page.getByText('Please wait a moment'), `reset ${reset}`).toBeHidden({ timeout: 10000 });
    }
  });

  // Cage mode only exists at 4x4, so turning it on from any other size has to rebuild the
  // board at 4x4 before its tile images load. The loading veil waits for one image per
  // cell, so a board still built at the old size can never finish loading.
  for (const startSize of [3, 6]) {
    test(`turning cage mode on from a ${startSize}x${startSize} board finishes loading`, async ({ page }) => {
      await mockApi(page);
      await page.addInitScript((size) => {
        localStorage.setItem('numLines', size);
        localStorage.setItem('proMode', 'true');
      }, String(startSize));

      await page.goto('/');
      await expect.poll(async () => await page.evaluate(() => window.__cage15Test__!.getNumLines())).toBe(startSize);

      await page.getByRole('button', { name: 'Config' }).click();
      await page.locator('#enable-cage-mode').check();
      await page.getByRole('button', { name: 'OK' }).click();

      await expect(page.getByText('Please wait a moment')).toBeHidden({ timeout: 15000 });
      await expect(page.locator('.loading-veil')).toHaveCount(0);
      const board = await page.evaluate(() => ({
        numLines: window.__cage15Test__!.getNumLines(),
        cells: window.__cage15Test__!.getMixedOrders().length
      }));
      expect(board).toEqual({ numLines: 4, cells: 16 });
    });
  }
});
