import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './fixtures/api';
import type { LiveRecord } from '../src/types';

// Real records from the sorted_records endpoint, one of each kind.
const samples: LiveRecord[] = [
  {
    record_id: 5606, name: 'heykey', record_type: 'ao50', puzzle_type: 'standard', puzzle_size: 3,
    time: null, moves: null, avg_time: '7.399', avg_moves: '44.25', avg_tps: '6.219',
    effective_updated_at: '2026-09-18T06:20:23.072Z', update_info: 'average: tps'
  },
  {
    record_id: 5603, name: 'heykey', record_type: 'time', puzzle_type: 'standard', puzzle_size: 3,
    time: 1286, moves: 10, avg_time: null, avg_moves: null, avg_tps: null,
    effective_updated_at: '2026-09-18T05:50:58.809Z', update_info: 'single: time'
  },
  {
    record_id: 5599, name: 'Odam', record_type: 'time', puzzle_type: 'marathon', puzzle_size: 4,
    time: 127995, moves: 608, avg_time: null, avg_moves: null, avg_tps: null,
    effective_updated_at: '2026-09-17T20:05:25.452Z', update_info: 'single: time'
  },
  {
    record_id: 3495, name: 'leo', record_type: 'ao12', puzzle_type: 'standard', puzzle_size: 4,
    time: null, moves: null, avg_time: '14.952', avg_moves: '97.1', avg_tps: '6.627',
    effective_updated_at: '2025-06-23T18:57:20.198Z', update_info: 'average: time, moves, tps'
  }
];

const allRecords: LiveRecord[] = Array.from({ length: 250 }, (_, i) => ({ ...samples[i % samples.length], record_id: 10000 - i }));

async function openLiveRecords(page: Page, paginates: boolean): Promise<string[]> {
  const requests: string[] = [];
  await mockApi(page, {
    sorted_records: async (route) => {
      const url = new URL(route.request().url());
      requests.push(url.search);
      const offset = Number(url.searchParams.get('offset'));
      const limit = Number(url.searchParams.get('limit'));
      const records = paginates ? allRecords.slice(offset, offset + limit) : allRecords;
      await route.fulfill({ json: { status: 'OK', game_id: 0, records } });
    }
  });
  await page.goto('/');
  await page.locator('.registered-block .link-item', { hasText: /^Live$/ }).click();
  await expect(page.locator('.live-records tbody tr')).toHaveCount(paginates ? 100 : allRecords.length);
  return requests;
}

async function scrollListToBottom(page: Page): Promise<void> {
  await page.locator('#live-records-list').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
}

test.describe('live records', () => {
  test('opens from the Live link next to Leaderboard', async ({ page }) => {
    await openLiveRecords(page, false);
    const links = await page.locator('.registered-block .link-item').allTextContents();
    expect(links.slice(links.indexOf('Leaderboard'), links.indexOf('Leaderboard') + 2)).toEqual(['Leaderboard', 'Live']);
    await expect(page.locator('.live-records .modal-header')).toHaveText('Live Records');
    await expect(page.locator('.live-records tbody tr').first().locator('td').nth(1)).toHaveText('heykey');
  });

  test('loads the next 100 records on scroll, until a short page ends the list', async ({ page }) => {
    const requests = await openLiveRecords(page, true);
    await scrollListToBottom(page);
    await expect(page.locator('.live-records tbody tr')).toHaveCount(200);
    await scrollListToBottom(page);
    await expect(page.locator('.live-records tbody tr')).toHaveCount(250);
    await scrollListToBottom(page);
    await expect(page.locator('.live-records tbody tr')).toHaveCount(250);
    // The empty page after the last records is what ends the list; nothing is requested after it.
    await expect.poll(() => requests).toEqual([
      '?offset=0&limit=100', '?offset=100&limit=100', '?offset=200&limit=100', '?offset=300&limit=100'
    ]);
    await scrollListToBottom(page);
    await expect.poll(() => requests).toHaveLength(4);
  });

  test('stops after a server that ignores offset and limit answers with the whole list', async ({ page }) => {
    const requests = await openLiveRecords(page, false);
    await scrollListToBottom(page);
    await expect(page.locator('.live-records tbody tr')).toHaveCount(allRecords.length);
    expect(requests).toEqual(['?offset=0&limit=100']);
  });

  test('keeps the column headers in view while scrolling', async ({ page }) => {
    await openLiveRecords(page, false);
    await page.locator('#live-records-list').evaluate((el) => {
      el.scrollTop = 300;
    });
    const listTop = await page.locator('#live-records-list').evaluate((el) => el.getBoundingClientRect().top);
    const headerTop = await page.locator('.live-records th').first().evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(headerTop - listTop)).toBeLessThan(1);
  });

  test('opens the games behind an average from its result value', async ({ page }) => {
    const requests: string[] = [];
    await mockApi(page, {
      sorted_records: async (route) => {
        await route.fulfill({ json: { status: 'OK', game_id: 0, records: allRecords.slice(0, 100) } });
      },
      avg_record_games: async (route) => {
        requests.push(new URL(route.request().url()).search);
        await route.fulfill({ json: { status: 'ok', game_id: 0, game_records: [] } });
      }
    });
    await page.goto('/');
    await page.locator('.registered-block .link-item', { hasText: /^Live$/ }).click();
    const averageRow = page.locator('.live-records tbody tr').filter({ hasText: 'ao12' }).first();
    await averageRow.locator('.result-value.link-item').first().click();
    // The games table is a lazily loaded chunk, so give it room on a loaded machine.
    await expect(page.locator('.games-table')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.games-table .modal-header')).toHaveText('Average Record Games');
    const firstAverage = allRecords.find((r) => r.record_type === 'ao12')!;
    await expect.poll(() => requests).toEqual([`?avg_record_id=${firstAverage.record_id}&avg_type=time`]);
    // The list stays open behind it.
    await expect(page.locator('.live-records')).toBeVisible();
  });

  test('opens the fmc blitz games from its result value', async ({ page }) => {
    const requests: string[] = [];
    const fmcRecord: LiveRecord = {
      record_id: 5365, name: 'solomonp', record_type: 'fmc_blitz_moves', puzzle_type: 'standard', puzzle_size: 4,
      time: 121935, moves: 1059, avg_time: null, avg_moves: null, avg_tps: null,
      effective_updated_at: '2026-07-16T19:11:28.460Z', update_info: 'fmc_blitz_moves: moves'
    };
    await mockApi(page, {
      sorted_records: async (route) => {
        await route.fulfill({ json: { status: 'OK', game_id: 0, records: [fmcRecord] } });
      },
      fmc_blitz_record_games: async (route) => {
        requests.push(new URL(route.request().url()).search);
        await route.fulfill({ json: { status: 'ok', game_id: 0, game_records: [] } });
      }
    });
    await page.goto('/');
    await page.locator('.registered-block .link-item', { hasText: /^Live$/ }).click();
    await page.locator('.live-records tbody tr .result-value.link-item').first().click();
    await expect(page.locator('.games-table .modal-header')).toHaveText('FMC Blitz Games', { timeout: 15000 });
    await expect.poll(() => requests).toEqual(['?fmc_blitz_record_id=5365']);
  });

  test('opens the game of a single record', async ({ page }) => {
    const requests: string[] = [];
    await mockApi(page, {
      sorted_records: async (route) => {
        await route.fulfill({ json: { status: 'OK', game_id: 0, records: allRecords.slice(0, 100) } });
      },
      record_public_id: async (route) => {
        requests.push(new URL(route.request().url()).search);
        await route.fulfill({ json: { status: 'OK', game_id: 0, public_id: 'n0wtau9rmjry' } });
      },
      game: async (route) => {
        await route.fulfill({ json: { status: 'ok', game_id: 0, stats: null } });
      }
    });
    await page.goto('/');
    await page.locator('.registered-block .link-item', { hasText: /^Live$/ }).click();
    const singleRow = page.locator('.live-records tbody tr').filter({ hasText: 'single' }).first();
    const singleRecord = allRecords.find((r) => r.record_type === 'time' && r.puzzle_type === 'standard')!;
    const listUrl = page.url();
    const newTab = page.waitForEvent('popup');
    await singleRow.locator('.result-value.link-item').first().click();
    await expect.poll(() => requests).toEqual([`?record_id=${singleRecord.record_id}`]);
    // The replay page opens in a new tab, leaving the list open where it was.
    const replayTab = await newTab;
    await expect(replayTab).toHaveURL(/\?game_id=n0wtau9rmjry/);
    expect(page.url()).toBe(listUrl);
    await expect(page.locator('.live-records')).toBeVisible();
  });

  test('closes with OK', async ({ page }) => {
    await openLiveRecords(page, false);
    await page.locator('.live-records .buttons button').click();
    await expect(page.locator('.live-records')).toHaveCount(0);
  });
});
