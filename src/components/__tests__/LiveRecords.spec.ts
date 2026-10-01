import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import LiveRecords from '../LiveRecords.vue';
import { baseUrl } from '@/const';
import type { LiveRecord, Response, UserStats } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

// Real records from the sorted_records endpoint, one of each kind the list has to show.
const averageTps: LiveRecord = {
  record_id: 5606, name: 'heykey', record_type: 'ao50', puzzle_type: 'standard', puzzle_size: 3,
  time: null, moves: null, avg_time: '7.399', avg_moves: '44.25', avg_tps: '6.219',
  effective_updated_at: '2026-09-18T06:20:23.072Z', update_info: 'average: tps'
};
const singleTime: LiveRecord = {
  record_id: 5603, name: 'heykey', record_type: 'time', puzzle_type: 'standard', puzzle_size: 3,
  time: 1286, moves: 10, avg_time: null, avg_moves: null, avg_tps: null,
  effective_updated_at: '2026-09-18T05:50:58.809Z', update_info: 'single: time'
};
const singleMoves: LiveRecord = {
  record_id: 5602, name: 'heykey', record_type: 'moves', puzzle_type: 'standard', puzzle_size: 3,
  time: 1286, moves: 10, avg_time: null, avg_moves: null, avg_tps: null,
  effective_updated_at: '2026-09-18T05:50:58.798Z', update_info: 'single: moves'
};
const marathonTime: LiveRecord = {
  record_id: 5599, name: 'Odam', record_type: 'time', puzzle_type: 'marathon', puzzle_size: 4,
  time: 127995, moves: 608, avg_time: null, avg_moves: null, avg_tps: null,
  effective_updated_at: '2026-09-17T20:05:25.452Z', update_info: 'single: time'
};
const fmcBlitz: LiveRecord = {
  record_id: 5365, name: 'solomonp', record_type: 'fmc_blitz_moves', puzzle_type: 'standard', puzzle_size: 4,
  time: 121935, moves: 1059, avg_time: null, avg_moves: null, avg_tps: null,
  effective_updated_at: '2026-07-16T19:11:28.460Z', update_info: 'fmc_blitz_moves: moves'
};
const averageAll: LiveRecord = {
  record_id: 3495, name: 'leo', record_type: 'ao12', puzzle_type: 'standard', puzzle_size: 4,
  time: null, moves: null, avg_time: '14.952', avg_moves: '97.1', avg_tps: '6.627',
  effective_updated_at: '2025-06-23T18:57:20.198Z', update_info: 'average: time, moves, tps'
};
const samples = [averageTps, singleTime, singleMoves, marathonTime, fmcBlitz, averageAll];

// The same records repeated with distinct ids, newest first, as a full unpaginated list.
function manyRecords(count: number): LiveRecord[] {
  return Array.from({ length: count }, (_, i) => ({ ...samples[i % samples.length], record_id: 10000 - i }));
}

function localDate(record: LiveRecord): string {
  return new Date(record.effective_updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function respondWith(records: LiveRecord[]): void {
  vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'OK', game_id: 0, records });
}

let currentWrapper: VueWrapper | undefined;
function mountList() {
  currentWrapper = mount(LiveRecords, { attachTo: document.body });
  return currentWrapper;
}

function rows(): string[][] {
  return Array.from(document.querySelectorAll('.live-records tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) =>
      Array.from(td.querySelectorAll('.result-value')).length > 0
        ? Array.from(td.querySelectorAll('.result-value')).map((s) => s.textContent?.trim()).join(' | ')
        : (td.textContent?.trim() ?? '')));
}

const brandNewRecord: LiveRecord = {
  record_id: 5700, name: 'olivique', record_type: 'time', puzzle_type: 'standard', puzzle_size: 4,
  time: 7062, moves: 62, avg_time: null, avg_moves: null, avg_tps: null,
  effective_updated_at: '2026-09-18T06:21:00.000Z', update_info: 'single: time'
};

function scrollListTo(top: number): void {
  const list = document.getElementById('live-records-list')!;
  Object.defineProperty(list, 'scrollTop', { value: top, writable: true, configurable: true });
}

async function tickRefresh(): Promise<void> {
  await vi.advanceTimersByTimeAsync(30000);
}

function scrollListToBottom(): void {
  const list = document.getElementById('live-records-list')!;
  Object.defineProperty(list, 'scrollTop', { value: 900, configurable: true });
  Object.defineProperty(list, 'offsetHeight', { value: 100, configurable: true });
  Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
  list.dispatchEvent(new Event('scroll'));
}

// The games table is lazily imported, so resolving it up front keeps the waits below about
// rendering rather than module loading (see ActionPanel.spec.ts for the full note).
beforeAll(async () => {
  await import('../GamesTable.vue');
});

describe('LiveRecords', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // setTimeout stays real so vi.waitFor still works; the refresh interval is advanced by hand.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-18T06:21:23.072Z'));
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.mocked(useGetFetchAPI).mockReset();
  });

  it('asks the server for the first page, newest records first', async () => {
    respondWith(samples);
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(6);
    });
    expect(useGetFetchAPI).toHaveBeenCalledWith('sorted_records?offset=0&limit=100', undefined);
  });

  it('shows when, who, which record and what improved for every kind of record', async () => {
    respondWith(samples);
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(6);
    });
    expect(rows()).toEqual([
      ['1m ago', 'heykey', '3x3 ao50', '6.219 TPS'],
      ['30m ago', 'heykey', '3x3 single', '1.286s'],
      ['30m ago', 'heykey', '3x3 single', '10 moves'],
      ['10h ago', 'Odam', '4x4 M single', '127.995s'],
      [localDate(fmcBlitz), 'solomonp', '4x4 FMC blitz', '1059 moves'],
      [localDate(averageAll), 'leo', '4x4 ao12', '14.952s | 97.1 moves | 6.627 TPS']
    ]);
  });

  it('reads what improved whether or not the list of fields has spaces after its commas', async () => {
    respondWith([{ ...averageAll, update_info: 'average: time,moves,tps' }]);
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(1);
    });
    expect(rows()[0][3]).toBe('14.952s | 97.1 moves | 6.627 TPS');
  });

  it('marks marathon records with M and spells the record out on hover', async () => {
    const marathonAverage: LiveRecord = {
      ...averageTps, record_id: 5480, name: 'averageohioman1', puzzle_type: 'marathon', puzzle_size: 4, record_type: 'ao5'
    };
    respondWith([marathonTime, marathonAverage]);
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(2);
    });
    const recordCells = Array.from(document.querySelectorAll('.live-records tbody tr'))
      .map((tr) => tr.querySelectorAll('td')[2]);
    expect(recordCells.map((td) => td.textContent?.trim())).toEqual(['4x4 M single', '4x4 M ao5']);
    expect(recordCells.map((td) => td.getAttribute('title')))
      .toEqual(['4x4 marathon single', '4x4 marathon ao5']);
  });

  it('shows the full local date and time on hover over "when"', async () => {
    respondWith([averageTps]);
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(1);
    });
    const when = document.querySelector('.live-records tbody td')!;
    expect(when.getAttribute('title')).toMatch(/^2026-09-1[78] \d\d:\d\d:23$/);
  });

  it('shows "Loading..." until the first page arrives', async () => {
    const responses: ((value: Response<UserStats, LiveRecord>) => void)[] = [];
    vi.mocked(useGetFetchAPI).mockReturnValue(new Promise((resolve) => { responses.push(resolve) }));
    mountList();
    await nextTick();
    expect(document.querySelector('.live-records .list-note')?.textContent?.trim()).toBe('Loading...');
    responses[0]({ status: 'OK', game_id: 0, records: [averageTps] });
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(1);
    });
    expect(document.querySelector('.live-records .list-note')).toBeNull();
  });

  it('says so when there are no records', async () => {
    respondWith([]);
    mountList();
    await vi.waitFor(() => {
      expect(document.querySelector('.live-records .list-note')?.textContent?.trim()).toBe('No records yet');
    });
  });

  it('treats a response without a records list as empty', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'OK', game_id: 0 });
    mountList();
    await vi.waitFor(() => {
      expect(document.querySelector('.live-records .list-note')?.textContent?.trim()).toBe('No records yet');
    });
  });

  it('shows the error when the records cannot be loaded', async () => {
    vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('Service Unavailable'));
    mountList();
    await vi.waitFor(() => {
      expect(document.querySelector('.live-records .error-msg')?.textContent?.trim()).toBe('Service Unavailable');
    });
  });

  it('asks the server for the next 100 records on scroll', async () => {
    respondWith(manyRecords(100));
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(100);
    });
    respondWith(manyRecords(20).map((r) => ({ ...r, record_id: r.record_id - 100 })));
    scrollListToBottom();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(120);
    });
    expect(useGetFetchAPI).toHaveBeenLastCalledWith('sorted_records?offset=100&limit=100', undefined);
  });

  it('stops scrolling for more once a short page arrives', async () => {
    respondWith(manyRecords(100));
    mountList();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(100);
    });
    respondWith(manyRecords(20).map((r) => ({ ...r, record_id: r.record_id - 100 })));
    scrollListToBottom();
    await vi.waitFor(() => {
      expect(rows()).toHaveLength(120);
    });
    respondWith([]);
    scrollListToBottom();
    await vi.waitFor(() => {
      expect(useGetFetchAPI).toHaveBeenCalledTimes(3);
    });
    scrollListToBottom();
    await nextTick();
    expect(useGetFetchAPI).toHaveBeenCalledTimes(3);
    expect(rows()).toHaveLength(120);
  });

  describe('refreshing while open', () => {
    it('adds records that arrive while you are at the top of the list', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      scrollListTo(0);
      respondWith([brandNewRecord, ...samples]);
      await tickRefresh();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(7);
      });
      expect(rows()[0]).toEqual(['just now', 'olivique', '4x4 single', '7.062s']);
      expect(document.querySelector('.live-records .new-records')).toBeNull();
      expect(useGetFetchAPI).toHaveBeenLastCalledWith('sorted_records?offset=0&limit=20', undefined);
    });

    it('holds records back behind a line while you are scrolled down, and shows them on click', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      scrollListTo(500);
      respondWith([brandNewRecord, ...samples]);
      await tickRefresh();
      await vi.waitFor(() => {
        expect(document.querySelector('.live-records .new-records')?.textContent?.trim()).toBe('1 new record - show');
      });
      expect(rows()).toHaveLength(6);

      document.querySelector<HTMLElement>('.live-records .new-records .link-item')!.click();
      await nextTick();
      expect(rows()).toHaveLength(7);
      expect(rows()[0][1]).toBe('olivique');
      expect(document.getElementById('live-records-list')!.scrollTop).toBe(0);
      expect(document.querySelector('.live-records .new-records')).toBeNull();
    });

    it('does not refresh while the tab is in the background', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      const callsBefore = vi.mocked(useGetFetchAPI).mock.calls.length;
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await tickRefresh();
      expect(vi.mocked(useGetFetchAPI).mock.calls).toHaveLength(callsBefore);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await tickRefresh();
      expect(vi.mocked(useGetFetchAPI).mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('never lists the same record twice', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      scrollListTo(0);
      respondWith(samples);
      await tickRefresh();
      await nextTick();
      expect(rows()).toHaveLength(6);
    });

    it('lists a record once even when a later page repeats it', async () => {
      respondWith(manyRecords(100));
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(100);
      });
      // New records shift the server-side offsets, so the next page can start with one already shown.
      const nextPage = manyRecords(100).slice(99).concat(manyRecords(20).map((r) => ({ ...r, record_id: r.record_id - 100 })));
      respondWith(nextPage);
      scrollListToBottom();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(120);
      });
    });

    it('counts several new records in the line', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      scrollListTo(500);
      respondWith([
        brandNewRecord,
        { ...brandNewRecord, record_id: 5701, name: 'Kihei', effective_updated_at: '2026-09-18T06:21:10.000Z' },
        ...samples
      ]);
      await tickRefresh();
      await vi.waitFor(() => {
        expect(document.querySelector('.live-records .new-records')?.textContent?.trim()).toBe('2 new records - show');
      });
    });

    it('does not ask for new records before the first page has arrived', async () => {
      respondWith([]);
      mountList();
      await vi.waitFor(() => {
        expect(document.querySelector('.live-records .list-note')?.textContent?.trim()).toBe('No records yet');
      });
      const callsBefore = vi.mocked(useGetFetchAPI).mock.calls.length;
      await tickRefresh();
      expect(vi.mocked(useGetFetchAPI).mock.calls).toHaveLength(callsBefore);
    });

    it('copes with a refresh that answers without a records list', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'OK', game_id: 0 });
      await tickRefresh();
      await nextTick();
      expect(rows()).toHaveLength(6);
    });

    it('keeps a failed refresh from disturbing the records already listed', async () => {
      respondWith(samples);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(6);
      });
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('Service Unavailable'));
      await tickRefresh();
      await nextTick();
      expect(rows()).toHaveLength(6);
      expect(document.querySelector('.live-records .error-msg')).toBeNull();
    });

    it('keeps the "when" column current as time passes', async () => {
      respondWith([brandNewRecord]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      expect(rows()[0][0]).toBe('just now');
      vi.setSystemTime(new Date('2026-09-18T06:41:23.072Z'));
      await tickRefresh();
      await nextTick();
      expect(rows()[0][0]).toBe('20m ago');
    });
  });

  describe('links to the games behind an average', () => {
    const resultCell = (row: number): Element => document.querySelectorAll('.live-records tbody tr')[row].querySelectorAll('td')[3];

    // createLinkAndClick opens a page by clicking an anchor it builds; jsdom cannot navigate,
    // so the anchors are collected instead, the way BottomInfoPanel.spec.ts does it.
    let clickedLinks: string[] = [];
    let lastLink: { target: string | null; insideList: boolean } | undefined;
    beforeEach(() => {
      clickedLinks = [];
      lastLink = undefined;
      const createElement = document.createElement.bind(document);
      let anchor: HTMLAnchorElement | undefined;
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = createElement(tag);
        if (tag === 'a') {
          anchor = element as HTMLAnchorElement;
        }
        return element;
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clickedLinks.push(anchor?.getAttribute('href') ?? '');
        lastLink = {
          target: this.getAttribute('target'),
          insideList: document.querySelector('.live-records')?.contains(this) ?? false
        };
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('links every value of an average record', async () => {
      respondWith([averageAll]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      const values = Array.from(resultCell(0).querySelectorAll('.result-value'));
      expect(values.map((v) => v.textContent?.trim())).toEqual(['14.952s', '97.1 moves', '6.627 TPS']);
      expect(values.every((v) => v.classList.contains('link-item'))).toBe(true);
    });

    it('links an fmc blitz result too', async () => {
      respondWith([fmcBlitz]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      expect(resultCell(0).querySelectorAll('.link-item')).toHaveLength(1);
    });

    it('opens the game of a single record, like the leaderboard does', async () => {
      respondWith([singleTime]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'OK', game_id: 0, public_id: 'n0wtau9rmjry' });
      resultCell(0).querySelector<HTMLElement>('.result-value')!.click();
      await vi.waitFor(() => {
        expect(useGetFetchAPI).toHaveBeenLastCalledWith('record_public_id?record_id=5603', undefined);
      });
      await vi.waitFor(() => {
        expect(clickedLinks).toEqual([`${baseUrl}?game_id=n0wtau9rmjry`]);
      });
      // A new tab, opened from inside the list so its own outside-click never fires.
      expect(lastLink).toEqual({ target: '_blank', insideList: true });
      expect(document.querySelector('.live-records')).not.toBeNull();
    });

    it('opens the game of a marathon single too', async () => {
      respondWith([marathonTime]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'OK', game_id: 0, public_id: 'lxjdqfow1yjc' });
      resultCell(0).querySelector<HTMLElement>('.result-value')!.click();
      await vi.waitFor(() => {
        expect(clickedLinks).toEqual([`${baseUrl}?game_id=lxjdqfow1yjc`]);
      });
    });

    it('says so when a record has no game to open', async () => {
      respondWith([singleTime]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'OK', game_id: 0, public_id: undefined });
      resultCell(0).querySelector<HTMLElement>('.result-value')!.click();
      await vi.waitFor(() => {
        expect(document.querySelector('.live-records .error-msg')?.textContent?.trim())
          .toBe('Could not find the game of this record');
      });
      expect(clickedLinks).toEqual([]);
    });

    it('shows the error when the game cannot be looked up', async () => {
      respondWith([singleTime]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('Service Unavailable'));
      resultCell(0).querySelector<HTMLElement>('.result-value')!.click();
      await vi.waitFor(() => {
        expect(document.querySelector('.live-records .error-msg')?.textContent?.trim()).toBe('Service Unavailable');
      });
      expect(clickedLinks).toEqual([]);
    });

    it('ignores a second click while the game is being looked up', async () => {
      respondWith([singleTime]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      const responses: ((value: Response) => void)[] = [];
      vi.mocked(useGetFetchAPI).mockReturnValue(new Promise((resolve) => { responses.push(resolve) }));
      const value = resultCell(0).querySelector<HTMLElement>('.result-value')!;
      value.click();
      value.click();
      await nextTick();
      expect(vi.mocked(useGetFetchAPI).mock.calls.filter(([url]) => url.startsWith('record_public_id'))).toHaveLength(1);
      responses[0]({ status: 'OK', game_id: 0, public_id: 'n0wtau9rmjry' });
      await vi.waitFor(() => {
        expect(clickedLinks).toHaveLength(1);
      });
    });

    it('opens the fmc blitz games of that record', async () => {
      respondWith([fmcBlitz]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      resultCell(0).querySelector<HTMLElement>('.result-value')!.click();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
      expect(useGetFetchAPI).toHaveBeenLastCalledWith('fmc_blitz_record_games?fmc_blitz_record_id=5365', undefined);
      expect(document.querySelector('.games-table .modal-header')?.textContent?.trim()).toBe('FMC Blitz Games');
    });

    it('opens that record\'s games for the value clicked', async () => {
      respondWith([averageAll]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      resultCell(0).querySelectorAll<HTMLElement>('.result-value')[2].click();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
      expect(useGetFetchAPI).toHaveBeenLastCalledWith('avg_record_games?avg_record_id=3495&avg_type=tps', undefined);
      expect(document.querySelector('.games-table .modal-header')?.textContent?.trim()).toBe('Average Record Games');
    });

    it('asks for the moves games when the moves value is clicked', async () => {
      respondWith([averageAll]);
      mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      resultCell(0).querySelectorAll<HTMLElement>('.result-value')[1].click();
      await vi.waitFor(() => {
        expect(useGetFetchAPI).toHaveBeenLastCalledWith('avg_record_games?avg_record_id=3495&avg_type=moves', undefined);
      });
    });

    it('closes the games table with its OK button, keeping the list open', async () => {
      respondWith([averageAll]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      resultCell(0).querySelectorAll<HTMLElement>('.result-value')[0].click();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table .buttons button')).not.toBeNull();
      });
      document.querySelector<HTMLElement>('.games-table .buttons button')!.click();
      await nextTick();
      expect(document.querySelector('.games-table')).toBeNull();
      expect(document.querySelector('.live-records')).not.toBeNull();
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('stays open while the games table is open', async () => {
      respondWith([averageAll]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(rows()).toHaveLength(1);
      });
      resultCell(0).querySelectorAll<HTMLElement>('.result-value')[0].click();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
      // As on the leaderboard, a click outside closes the games table but leaves the list open.
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toBeUndefined();
      expect(document.querySelector('.games-table')).toBeNull();
    });
  });

  it('closes from the OK button', async () => {
    respondWith(samples);
    const wrapper = mountList();
    document.querySelector<HTMLElement>('.live-records .buttons button')!.click();
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('closes on a click outside the list', async () => {
    respondWith(samples);
    const wrapper = mountList();
    await nextTick();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
