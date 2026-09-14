import { expect, test } from '@playwright/test';
import { jsonRoute, mockApi, repGameFixture } from './fixtures/api';

test.describe('replay', () => {
  test('?game_id=X plays back the real mocked game record', async ({ page }) => {
    const repGame = repGameFixture({ name: 'other_gamer' });
    await mockApi(page, {
      game: jsonRoute({ status: 'ok', game_id: 0, stats: repGame })
    });

    await page.goto('/?game_id=42');

    await expect(page.locator('.replay-row-info')).toContainText(repGame.name);
    await expect(page.locator('.board')).toBeVisible();
  });

  test('redirects home when the real game record is not found', async ({ page }) => {
    await mockApi(page, {
      game: jsonRoute({ status: 'ok', game_id: 0 })
    });

    await page.goto('/?game_id=999');

    await expect(page).toHaveURL(/^http:\/\/localhost:4173\/?$/);
  });
});
