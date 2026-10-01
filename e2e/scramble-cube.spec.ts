import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './fixtures/api';

// Everything here is layout, which jsdom does not do: where the turning cube's corners
// actually land, and whether they ever give the About modal scrollbars.
async function openAbout(page: Page): Promise<void> {
  await mockApi(page);
  await page.goto('/');
  await page.locator('.action-panel').getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.locator('.info-modal')).toBeVisible();
}

// Samples every frame for a while: how far the cube's faces ever poke out of the modal's
// padding box, and how many frames the modal had scrollbars in.
async function watchCube(page: Page, ms: number): Promise<{ worst: number; scrolled: number; frames: number }> {
  return page.evaluate(async (duration) => {
    const modal = document.querySelector<HTMLElement>('.info-modal')!;
    const box = modal.getBoundingClientRect();
    const left = box.left + modal.clientLeft;
    const top = box.top + modal.clientTop;
    let worst = -Infinity;
    let scrolled = 0;
    let frames = 0;
    const start = performance.now();
    while (performance.now() - start < duration) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      for (const face of document.querySelectorAll('.cube-face')) {
        const r = face.getBoundingClientRect();
        worst = Math.max(worst, left - r.left, top - r.top, r.right - left - modal.clientWidth, r.bottom - top - modal.clientHeight);
      }
      if (modal.scrollWidth > modal.clientWidth || modal.scrollHeight > modal.clientHeight) {
        scrolled += 1;
      }
      frames += 1;
    }
    return { worst, scrolled, frames };
  }, ms);
}

// Waits until the cube is on its way down, which is when a player would hit it again.
async function waitForFall(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const seen = window as unknown as { lastCubeTop?: number };
    const top = document.querySelector('.cube-scene')!.getBoundingClientRect().top;
    const falling = seen.lastCubeTop !== undefined && top > seen.lastCubeTop + 1;
    seen.lastCubeTop = top;
    return falling;
  }, undefined, { polling: 'raf' });
}

async function pressCube(page: Page, side = 0): Promise<void> {
  const centre = await page.locator('.cube-scene').evaluate((scene) => {
    const r = scene.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(centre.x + side * 8, centre.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.evaluate(() => {
    delete (window as unknown as { lastCubeTop?: number }).lastCubeTop;
  });
}

test.describe('about modal cube', () => {
  test('turns in the top right corner without leaving the modal', async ({ page }) => {
    await openAbout(page);
    const modal = await page.locator('.info-modal').boundingBox();
    const scene = await page.locator('.cube-scene').boundingBox();
    expect(modal!.x + modal!.width - scene!.x - scene!.width).toBeCloseTo(18, 0);
    expect(scene!.y - modal!.y).toBeCloseTo(18, 0);
    const seen = await watchCube(page, 3000);
    expect(seen.worst).toBeLessThanOrEqual(0.5);
    expect(seen.scrolled).toBe(0);
  });

  test('bounces around inside the modal while it is hit in mid-flight', async ({ page }) => {
    await openAbout(page);
    await pressCube(page);
    for (const side of [1, -1, 1, -1]) {
      await waitForFall(page);
      await pressCube(page, side);
    }
    const seen = await watchCube(page, 4000);
    // WebKit can drop to a few frames a second while other browsers run alongside it.
    expect(seen.frames).toBeGreaterThan(10);
    expect(seen.worst).toBeLessThanOrEqual(0.5);
    expect(seen.scrolled).toBe(0);
  });

  test('keeps the OK button and links out of reach while it flies', async ({ page }) => {
    await openAbout(page);
    await pressCube(page);
    await expect(page.locator('.info-modal.cube-flying')).toHaveCount(1);
    // A player's click lands on it, but the button is out of reach while the cube flies.
    const ok = (await page.locator('.info-modal .buttons button').boundingBox())!;
    await page.mouse.click(ok.x + ok.width / 2, ok.y + ok.height / 2);
    await expect(page.locator('.info-modal')).toBeVisible();
    await page.locator('.info-modal:not(.cube-flying)').waitFor({ timeout: 30000 });
    await page.locator('.info-modal .buttons button').click();
    await expect(page.locator('.info-modal')).toHaveCount(0);
  });
});
