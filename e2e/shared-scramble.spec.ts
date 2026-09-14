import { expect, test } from '@playwright/test';
import { jsonRoute, mockApi, userScrambleFixture } from './fixtures/api';

test.describe('shared scramble', () => {
  test('?playground&public_id=X prefills playground mode from the real mocked scramble', async ({ page }) => {
    const scramble = userScrambleFixture();
    await mockApi(page, {
      get_current_user: jsonRoute({ status: 'ok', game_id: 0, token: 'fake-token', name: 'me' }),
      user_scramble: jsonRoute({ status: 'ok', game_id: 0, stats: scramble })
    });
    await page.addInitScript(() => localStorage.setItem('token', 'fake-token'));

    // checkPlaygroundMode() in usePrepare.ts only reads public_id at all once `playground`
    // itself is also in the URL - a real shared-scramble link carries both params together.
    await page.goto(`/?playground&public_id=${scramble.public_id}`);

    await expect(page.locator('.playground-row-info')).toBeVisible();
    const numLines = await page.evaluate(() => window.__cage15Test__!.getNumLines());
    expect(numLines).toBe(3); // sqrt(scramble.length) for the 9-tile fixture scramble
  });
});
