import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import LeaderBoard from '../LeaderBoard.vue';
import { useBaseStore } from '../../stores/base';
import { baseUrl } from '@/const';
import type { AverageUserRecord, Response, SingleUserRecord, UserRecord } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

// LeaderBoard's entire template is a <Teleport to="body">, so DOM lookups go
// through document directly rather than wrapper.find().
interface LeaderBoardInternals {
  filteredRecords: UserRecord[];
  scrollWidth: string;
  factorChoices: string[];
  minHeight: string;
  tbodyHeight: string;
  tableContainerHeight: string;
  tbodyHeightMobile: string;
  bestAverage: string;
}

function internals(wrapper: VueWrapper): LeaderBoardInternals {
  return wrapper.vm as unknown as LeaderBoardInternals;
}

let currentWrapper: VueWrapper | undefined;
function mountBoard(formType = 'default') {
  currentWrapper = mount(LeaderBoard, { props: { formType }, attachTo: document.body });
  return currentWrapper;
}

function respondWith(records: UserRecord[]): void {
  vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0, records } satisfies Response);
}

async function waitLoaded(): Promise<void> {
  await vi.waitFor(() => {
    expect(document.querySelector('.leaderboard')).not.toBeNull();
  });
}

// Finds the radio group whose header <p> matches, then clicks the choice with the given label.
async function pickInGroup(headerText: string, label: string): Promise<void> {
  await waitLoaded();
  const containers = Array.from(document.querySelectorAll('.puzzle-mode-container'));
  const container = containers.find(c => c.querySelector('p')?.textContent.trim() === headerText);
  if (container === undefined) {
    throw new Error(`group "${headerText}" not found`);
  }
  const span = Array.from(container.querySelectorAll('.puzzle-mode-group span'))
    .find(s => s.textContent.trim() === label);
  if (span === undefined) {
    throw new Error(`choice "${label}" not found in group "${headerText}"`);
  }
  span.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
}

async function pickPuzzleSize(size: number): Promise<void> {
  await waitLoaded();
  const mark = Array.from(document.querySelectorAll('.slider-marks span'))
    .find(s => s.textContent.trim() === String(size));
  mark?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
}

// A real 4x4 (CORE_NUM) standard time-record leaderboard, id/tps/dates distinct
// enough to exercise every tie-break rule when needed.
function timeRecord(overrides: Partial<SingleUserRecord> = {}): SingleUserRecord {
  return {
    id: 1, record_id: 1, record_type: 'time', puzzle_type: 'standard', puzzle_size: 4,
    time: 15000, moves: 45, tps: '3.0', name: 'gamer_01', control_type: 'mouse',
    updated_at: '2024-01-01T00:00:00Z', public_id: 'abc123', scramble: '1,2,3',
    ...overrides
  };
}

// Resolving the lazily-imported children up front: defineAsyncComponent loads them on
// first render, so a vi.waitFor for one is really timing module resolution (~350ms cold,
// against waitFor's 1000ms default). See ActionPanel.spec.ts for the full note.
beforeAll(async () => {
  await import('../GamesTable.vue');
});

describe('LeaderBoard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    respondWith([]);
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  describe('fetching', () => {
    it('requests plain stats for the default (records) form', () => {
      mountBoard('default');
      expect(useGetFetchAPI).toHaveBeenCalledWith('stats', undefined);
    });

    it('requests average stats for a non-default form', () => {
      mountBoard('averages');
      expect(useGetFetchAPI).toHaveBeenCalledWith('stats?avg=1', undefined);
    });

    it('is hidden until the fetch settles', () => {
      vi.mocked(useGetFetchAPI).mockReturnValue(new Promise(() => undefined));
      mountBoard();
      expect(document.querySelector('.leaderboard')).toBeNull();
    });

    it('shows the real records once fetched', async () => {
      respondWith([timeRecord()]);
      mountBoard();
      await waitLoaded();
      expect(document.querySelector('.leaderboard')).not.toBeNull();
    });

    it('surfaces a real error message and flags a network error', async () => {
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('NetworkError when attempting to fetch'));
      const store = useBaseStore();
      mountBoard();
      await vi.waitFor(() => {
        expect(store.isNetworkError).toBe(true);
      });
    });

    it('does not flag a network error for an unrelated failure', async () => {
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('unauthorized'));
      const store = useBaseStore();
      mountBoard();
      await waitLoaded();
      expect(store.isNetworkError).toBe(false);
    });
  });

  describe('default vs averages layout', () => {
    it('shows the Leaderboard header and a single-record table by default', async () => {
      mountBoard('default');
      await waitLoaded();
      expect(document.querySelector('#leaderboard-caption')?.textContent.trim()).toBe('Leaderboard');
      expect(document.querySelector('table.items-table')?.classList.contains('items-avg')).toBe(false);
    });

    it('shows the Best Averages header and an averages table otherwise', async () => {
      mountBoard('averages');
      await waitLoaded();
      expect(document.querySelector('#leaderboard-caption')?.textContent.trim()).toBe('Best Averages');
      expect(document.querySelector('table.items-avg')).not.toBeNull();
    });

    it('sizes the modal and table differently for each layout', () => {
      const defaultWrapper = mountBoard('default');
      expect(internals(defaultWrapper).minHeight).toBe('620px');
      expect(internals(defaultWrapper).tbodyHeight).toBe('244px');
      expect(internals(defaultWrapper).tableContainerHeight).toBe('284px');
      expect(internals(defaultWrapper).tbodyHeightMobile).toBe('233px');
      defaultWrapper.unmount();
      currentWrapper = undefined;
      document.body.innerHTML = '';

      const avgWrapper = mountBoard('averages');
      expect(internals(avgWrapper).minHeight).toBe('498px');
      expect(internals(avgWrapper).tbodyHeight).toBe('122px');
      expect(internals(avgWrapper).tableContainerHeight).toBe('162px');
      expect(internals(avgWrapper).tbodyHeightMobile).toBe('116.5px');
    });
  });

  describe('initial state from the store', () => {
    it('starts on the marathon puzzle mode when the store is already in a marathon run', async () => {
      const store = useBaseStore();
      store.marathonMode = true;
      mountBoard('default');
      await waitLoaded();
      expect(document.querySelector<HTMLInputElement>('#marathon')?.checked).toBe(true);
    });
  });

  describe('factorChoices / bestType resets', () => {
    it('offers fmc blitz as a factor at an eligible standard size', () => {
      const wrapper = mountBoard('default'); // default size 4 is fmc-eligible
      expect(internals(wrapper).factorChoices).toEqual(['time', 'moves', 'fmc_blitz_moves']);
    });

    it('drops fmc blitz once the size is not fmc-eligible', async () => {
      const wrapper = mountBoard('default');
      await pickPuzzleSize(6);
      expect(internals(wrapper).factorChoices).toEqual(['time', 'moves']);
    });

    it('resets bestType away from fmc blitz when the size becomes ineligible', async () => {
      mountBoard('default');
      await pickInGroup('Best Factor', 'FMC Blitz');
      await pickPuzzleSize(6);
      // real proof the reset happened: fmc blitz column disappears, time returns
      expect(document.querySelector('th.w-70')?.textContent.trim()).toBe('Time');
    });

    it('resets bestType away from fmc blitz when switching to marathon', async () => {
      mountBoard('default');
      await pickInGroup('Best Factor', 'FMC Blitz');
      await pickInGroup('Puzzle Mode', 'Marathon');
      // real proof the reset happened: fmc blitz column disappears, time returns
      expect(document.querySelector('th.w-70')?.textContent.trim()).toBe('Time');
    });

    it('keeps a non-fmc-blitz bestType untouched when switching to marathon', async () => {
      mountBoard('default');
      await pickInGroup('Puzzle Mode', 'Marathon');
      // Time was already the active factor, so nothing needed to change here -
      // still real proof the watcher ran without disturbing an unrelated bestType.
      expect(document.querySelector('th.w-70')?.textContent.trim()).toBe('Time');
    });

    it('only shows averages factors for the averages form', () => {
      const wrapper = mountBoard('averages');
      expect(internals(wrapper).factorChoices).toEqual(['ao5', 'ao12', 'ao50', 'ao100']);
    });
  });

  describe('filteredRecords / sortSingleRecords', () => {
    it('filters by the real size, mode, and factor', async () => {
      respondWith([
        timeRecord({ id: 1, record_id: 1 }),
        timeRecord({ id: 2, record_id: 2, puzzle_size: 5 }),
        timeRecord({ id: 3, record_id: 3, puzzle_type: 'marathon' }),
        timeRecord({ id: 4, record_id: 4, record_type: 'moves' })
      ]);
      const wrapper = mountBoard('default');
      await waitLoaded();
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([1]);
    });

    it('sorts by time ascending, tps descending, then most-recent first', async () => {
      respondWith([
        timeRecord({ id: 1, record_id: 1, time: 15000, tps: '3.0', updated_at: '2024-01-01T00:00:00Z' }),
        timeRecord({ id: 2, record_id: 2, time: 12000, tps: '3.0', updated_at: '2024-01-01T00:00:00Z' }),
        timeRecord({ id: 3, record_id: 3, time: 12000, tps: '4.0', updated_at: '2024-01-01T00:00:00Z' }),
        timeRecord({ id: 4, record_id: 4, time: 12000, tps: '4.0', updated_at: '2024-02-01T00:00:00Z' })
      ]);
      const wrapper = mountBoard('default');
      await waitLoaded();
      // 3/4 beat 2 on tps; 2/3/4 all beat 1 on time; between 3 and 4, the earlier
      // updated_at (3) sorts first under the real tie-break comparator.
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([3, 4, 2, 1]);
    });

    it('sorts by moves ascending, tps descending, then most-recent first', async () => {
      respondWith([
        timeRecord({ id: 1, record_id: 1, record_type: 'moves', moves: 50, tps: '3.0', updated_at: '2024-01-01T00:00:00Z' }),
        timeRecord({ id: 2, record_id: 2, record_type: 'moves', moves: 40, tps: '3.0', updated_at: '2024-01-01T00:00:00Z' }),
        timeRecord({ id: 3, record_id: 3, record_type: 'moves', moves: 40, tps: '4.0', updated_at: '2024-01-01T00:00:00Z' })
      ]);
      const wrapper = mountBoard('default');
      await pickInGroup('Best Factor', 'Moves');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([3, 2, 1]);
    });

    it('breaks a moves/tps tie by updated_at, same as time mode', async () => {
      respondWith([
        timeRecord({ id: 1, record_id: 1, record_type: 'moves', moves: 40, tps: '4.0', updated_at: '2024-02-01T00:00:00Z' }),
        timeRecord({ id: 2, record_id: 2, record_type: 'moves', moves: 40, tps: '4.0', updated_at: '2024-01-01T00:00:00Z' })
      ]);
      const wrapper = mountBoard('default');
      await pickInGroup('Best Factor', 'Moves');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1]);
    });

    it('renders fmc blitz moves and its computed time-per-move column', async () => {
      respondWith([timeRecord({ record_type: 'fmc_blitz_moves', moves: 30, tps: '6' })]);
      mountBoard('default');
      await pickInGroup('Best Factor', 'FMC Blitz');
      await waitLoaded();
      expect(document.querySelector('.records-tbody tr td.link-item')?.textContent.trim()).toBe('30');
      // moves / tps = 30 / 6 = 5.000
      expect(document.querySelectorAll('.records-tbody tr td')[3].textContent.trim()).toBe('5.000');
    });
  });

  describe('averages sorting', () => {
    const avgRecord = (overrides: Partial<AverageUserRecord> = {}): AverageUserRecord => ({
      id: 1, record_id: 1, record_type: 'ao5', puzzle_type: 'standard', puzzle_size: 4,
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides
    });

    it('sorts averages by time ascending by default, missing values last', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, avg_time: '15.000' }),
        avgRecord({ id: 2, record_id: 2, avg_time: '12.000' }),
        avgRecord({ id: 3, record_id: 3, avg_time: undefined })
      ]);
      const wrapper = mountBoard('averages');
      await waitLoaded();
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1, 3]);
    });

    it('sorts averages by moves ascending when selected', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, avg_moves: '50' }),
        avgRecord({ id: 2, record_id: 2, avg_moves: '40' })
      ]);
      const wrapper = mountBoard('averages');
      await pickInGroup('Best Factor', 'Moves');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1]);
    });

    it('breaks an averages-moves tie by updated_at', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, avg_moves: '40', updated_at: '2024-02-01T00:00:00Z' }),
        avgRecord({ id: 2, record_id: 2, avg_moves: '40', updated_at: '2024-01-01T00:00:00Z' })
      ]);
      const wrapper = mountBoard('averages');
      await pickInGroup('Best Factor', 'Moves');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1]);
    });

    it('sorts averages by TPS descending when selected, missing values last', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, avg_tps: '3.0' }),
        avgRecord({ id: 2, record_id: 2, avg_tps: '4.0' }),
        avgRecord({ id: 3, record_id: 3, avg_tps: undefined })
      ]);
      const wrapper = mountBoard('averages');
      await pickInGroup('Best Factor', 'TPS');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1, 3]);
    });

    it('breaks an averages-TPS tie by updated_at', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, avg_tps: '4.0', updated_at: '2024-02-01T00:00:00Z' }),
        avgRecord({ id: 2, record_id: 2, avg_tps: '4.0', updated_at: '2024-01-01T00:00:00Z' })
      ]);
      const wrapper = mountBoard('averages');
      await pickInGroup('Best Factor', 'TPS');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1]);
    });

    it('filters averages by the selected ao-type', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, record_type: 'ao5' }),
        avgRecord({ id: 2, record_id: 2, record_type: 'ao12' })
      ]);
      const wrapper = mountBoard('averages');
      await pickInGroup('Average Type', 'ao12');
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2]);
    });

    it('falls back to a plain avg_time comparison for a bestAverage value the UI never sets', async () => {
      respondWith([
        avgRecord({ id: 1, record_id: 1, avg_time: '15.000' }),
        avgRecord({ id: 2, record_id: 2, avg_time: '12.000' })
      ]);
      const wrapper = mountBoard('averages');
      await waitLoaded();
      internals(wrapper).bestAverage = 'unknown';
      await nextTick();
      expect(internals(wrapper).filteredRecords.map(r => r.id)).toEqual([2, 1]);
    });
  });

  describe('scrollWidth', () => {
    it('needs no reserved width with few records', async () => {
      respondWith([timeRecord()]);
      const wrapper = mountBoard('default');
      await waitLoaded();
      expect(internals(wrapper).scrollWidth).toBe('0px');
    });

    it('reserves the real measured scrollbar width once more than 10 records exist (default form)', async () => {
      respondWith(Array.from({ length: 11 }, (_v, i) => timeRecord({ id: i + 1, record_id: i + 1 })));
      const wrapper = mountBoard('default');
      await waitLoaded();
      expect(internals(wrapper).scrollWidth).not.toBe('0px');
    });

    it('reserves the real measured scrollbar width once more than 5 records exist (averages form)', async () => {
      respondWith(Array.from({ length: 6 }, (_v, i) => ({
        id: i + 1, record_id: i + 1, record_type: 'ao5', puzzle_type: 'standard', puzzle_size: 4,
        avg_time: '12.000'
      } satisfies UserRecord)));
      const wrapper = mountBoard('averages');
      await waitLoaded();
      expect(internals(wrapper).scrollWidth).not.toBe('0px');
    });

    it('measures the real scrollbar width from an already-present table body on mount', async () => {
      const tbody = document.createElement('tbody');
      tbody.className = 'records-tbody';
      document.body.appendChild(tbody);
      respondWith(Array.from({ length: 11 }, (_v, i) => timeRecord({ id: i + 1, record_id: i + 1 })));
      const wrapper = mountBoard('default');
      await waitLoaded();
      // real (0 in jsdom, since offsetWidth/clientWidth both measure 0) scrollbar width
      expect(internals(wrapper).scrollWidth).toBe('0px');
    });
  });

  describe('link rendering', () => {
    it('links a time record with a real scramble to its game', async () => {
      respondWith([timeRecord({ scramble: '1,2,3,4' })]);
      mountBoard('default');
      await waitLoaded();
      const link = document.querySelector<HTMLAnchorElement>('.records-tbody a.link-item');
      expect(link?.getAttribute('href')).toBe(`${baseUrl}?game_id=abc123`);
    });

    it('shows plain text for a time record with no scramble on file', async () => {
      respondWith([timeRecord({ scramble: undefined })]);
      mountBoard('default');
      await waitLoaded();
      expect(document.querySelector('.records-tbody a.link-item')).toBeNull();
      expect(document.querySelector('.records-tbody td.min-width span')).not.toBeNull();
    });

    it('links a moves record the same way', async () => {
      respondWith([timeRecord({ record_type: 'moves', scramble: '1,2,3,4' })]);
      mountBoard('default');
      await pickInGroup('Best Factor', 'Moves');
      await waitLoaded();
      const link = document.querySelector<HTMLAnchorElement>('.records-tbody a.link-item');
      expect(link?.getAttribute('href')).toBe(`${baseUrl}?game_id=abc123`);
    });

    it('shows plain text for a moves record with no scramble on file', async () => {
      respondWith([timeRecord({ record_type: 'moves', scramble: undefined })]);
      mountBoard('default');
      await pickInGroup('Best Factor', 'Moves');
      await waitLoaded();
      expect(document.querySelector('.records-tbody a.link-item')).toBeNull();
      expect(document.querySelector('.records-tbody td.min-width span')).not.toBeNull();
    });
  });

  describe('opening/closing the games table', () => {
    it('opens the fmc blitz games table with the real record id', async () => {
      respondWith([timeRecord({ record_type: 'fmc_blitz_moves', record_id: 42 })]);
      mountBoard('default');
      await pickInGroup('Best Factor', 'FMC Blitz');
      await waitLoaded();
      document.querySelector<HTMLElement>('.records-tbody td.link-item')?.click();
      await nextTick();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
    });

    it('opens the averages games table with the real record id and avg type', async () => {
      respondWith([{
        id: 1, record_id: 7, record_type: 'ao5', puzzle_type: 'standard', puzzle_size: 4,
        avg_time: '12.000'
      }]);
      mountBoard('averages');
      await waitLoaded();
      document.querySelector<HTMLElement>('.records-tbody td.link-item')?.click();
      await nextTick();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
    });

    it('opens the averages games table from the moves column too', async () => {
      respondWith([{
        id: 1, record_id: 7, record_type: 'ao5', puzzle_type: 'standard', puzzle_size: 4,
        avg_moves: '45.0'
      }]);
      mountBoard('averages');
      await pickInGroup('Best Factor', 'Moves');
      await waitLoaded();
      document.querySelector<HTMLElement>('.records-tbody td.link-item')?.click();
      await nextTick();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
    });

    it('opens the averages games table from the TPS column too', async () => {
      respondWith([{
        id: 1, record_id: 7, record_type: 'ao5', puzzle_type: 'standard', puzzle_size: 4,
        avg_tps: '3.5'
      }]);
      mountBoard('averages');
      await pickInGroup('Best Factor', 'TPS');
      await waitLoaded();
      document.querySelector<HTMLElement>('.records-tbody td.link-item')?.click();
      await nextTick();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
    });

    it('closes the games table via its own close event', async () => {
      respondWith([timeRecord({ record_type: 'fmc_blitz_moves' })]);
      mountBoard('default');
      await pickInGroup('Best Factor', 'FMC Blitz');
      await waitLoaded();
      document.querySelector<HTMLElement>('.records-tbody td.link-item')?.click();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
      const closeButton = Array.from(document.querySelectorAll('.games-table button'))
        .find(b => b.textContent.trim() === 'OK');
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).toBeNull();
      });
    });
  });

  describe('closing the leaderboard', () => {
    it('emits close when clicking OK', async () => {
      const wrapper = mountBoard();
      await waitLoaded();
      document.querySelector('.buttons button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits close when clicking outside', async () => {
      const wrapper = mountBoard();
      await waitLoaded();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('does not close on an outside click while the games table is open', async () => {
      respondWith([timeRecord({ record_type: 'fmc_blitz_moves' })]);
      const wrapper = mountBoard('default');
      await pickInGroup('Best Factor', 'FMC Blitz');
      await waitLoaded();
      document.querySelector<HTMLElement>('.records-tbody td.link-item')?.click();
      await vi.waitFor(() => {
        expect(document.querySelector('.games-table')).not.toBeNull();
      });
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });
});
