import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/api';

test.describe('dark mode persistence', () => {
  test('toggling dark mode persists across a real reload', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');

    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Config' }).click();
    await page.check('#dark-mode');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const stored = await page.evaluate(() => localStorage.getItem('darkMode'));
    expect(stored).toBe('true');

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
