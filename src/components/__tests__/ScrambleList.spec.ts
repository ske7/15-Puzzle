import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScrambleList from '../ScrambleList.vue';
import { useBaseStore } from '../../stores/base';
import { baseUrl } from '@/const';
import type { Response, UserScrambleData } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

interface ScrambleListInternals {
  puzzleSize: number;
}

function internals(wrapper: VueWrapper): ScrambleListInternals {
  return wrapper.vm as unknown as ScrambleListInternals;
}

let currentWrapper: VueWrapper | undefined;
function mountList() {
  currentWrapper = mount(ScrambleList, { attachTo: document.body });
  return currentWrapper;
}

// A real solvable 3x3 scramble, plus a real solve path for it.
const record3x3: UserScrambleData = {
  id: 1,
  puzzle_size: 3,
  best_time: 12340,
  best_moves: 42,
  best_time_moves: 42,
  best_tps: 3.4,
  scramble: '4,1,3,2,0,6,7,5,8',
  solve_path: 'RRRUULDD',
  public_id: 'abc123',
  created_at: '2024-06-01T12:30:00Z',
  optimal_moves: 18,
  opt_diff: 5
};

async function waitFetched(wrapper: VueWrapper): Promise<void> {
  await vi.waitFor(() => {
    expect(wrapper.find('.buttons').exists()).toBe(true);
  });
}

function respondWith(records: UserScrambleData[]): void {
  vi.mocked(useGetFetchAPI).mockResolvedValue(
    { status: 'ok', game_id: 0, scramble_records: records } satisfies Response
  );
}

describe('ScrambleList', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  it('renders the header and requests the first page for the current puzzle size', () => {
    const store = useBaseStore();
    store.numLines = 5;
    respondWith([]);
    mountList();
    expect(useGetFetchAPI).toHaveBeenCalledWith(
      expect.stringContaining('list_user_scrambles?puzzle_size=5&offset=0&limit=50&order_field=id&order_direction=desc'),
      undefined
    );
    expect(document.querySelector('.header span')?.textContent?.trim()).toBe('Saved Scrambles');
  });

  it('treats a response with no scramble_records field as an empty page', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0 } satisfies Response);
    const wrapper = mountList();
    await waitFetched(wrapper);
    expect(wrapper.findAll('.flex-table')).toHaveLength(1); // just the header row, no records
  });

  it('shows the table rows once fetched', async () => {
    respondWith([record3x3]);
    const wrapper = mountList();
    await vi.waitFor(() => {
      expect(wrapper.find('.buttons').exists()).toBe(true);
    });
    expect(wrapper.findAll('.flex-table').length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain('42');
  });

  it('hides the row table and the OK button until the first page has loaded', () => {
    vi.mocked(useGetFetchAPI).mockReturnValue(new Promise(() => undefined));
    const wrapper = mountList();
    expect(wrapper.find('.buttons').exists()).toBe(false);
    expect(wrapper.findAll('.flex-table')).toHaveLength(1); // just the header row
  });

  describe('optimal-moves/diff columns', () => {
    it('shows them for a 3x3 puzzle size', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      respondWith([record3x3]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      expect(wrapper.text()).toContain('Opt.');
      expect(wrapper.text()).toContain('Diff');
      expect(wrapper.text()).toContain('18'); // optimal_moves
      expect(wrapper.text()).toContain('+5'); // opt_diff
    });

    it('hides them for any other puzzle size', async () => {
      const store = useBaseStore();
      store.numLines = 4;
      respondWith([{ ...record3x3, puzzle_size: 4 }]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      expect(wrapper.text()).not.toContain('Opt.');
      expect(wrapper.text()).not.toContain('Diff');
    });

    it('hides the diff badge when there is no difference from optimal', async () => {
      useBaseStore().numLines = 3;
      respondWith([{ ...record3x3, opt_diff: 0 }]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      expect(wrapper.text()).not.toContain('+0');
    });

    it('hides the diff badge when the server omits it entirely', async () => {
      useBaseStore().numLines = 3;
      respondWith([{ ...record3x3, opt_diff: undefined }]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      expect(wrapper.text()).not.toContain('undefined');
    });
  });

  describe('row content', () => {
    it('shows the real time/moves/tps and a public playground link', async () => {
      respondWith([record3x3]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      expect(wrapper.text()).toContain('12.34'); // best_time / 1000
      expect(wrapper.text()).toContain('3.4');
      const link = wrapper.find('.w-120 a');
      expect(link.attributes('href')).toBe(`${baseUrl}?playground&public_id=abc123`);
      expect(link.text()).toBe('abc123');
    });

    it('renders a copy button only when a scramble/solve path is present', async () => {
      respondWith([
        { ...record3x3, id: 1, scramble: '4,1,3,2,0,6,7,5,8', solve_path: 'RRRUULDD' },
        { ...record3x3, id: 2, scramble: undefined, solve_path: undefined }
      ]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      expect(wrapper.findAllComponents({ name: 'CopyButton' })).toHaveLength(2);
    });

    it('sets the scramble and emits it as a real numeric array when clicking its id', async () => {
      respondWith([record3x3]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      await wrapper.find('.w-70 .link-item').trigger('click');
      expect(wrapper.emitted('set')).toEqual([[[4, 1, 3, 2, 0, 6, 7, 5, 8]]]);
    });
  });

  describe('sorting', () => {
    it('shows the default sort arrow on the id column and a neutral arrow elsewhere', () => {
      respondWith([]);
      const wrapper = mountList();
      const headerSorts = wrapper.findAll('.table-header .pro-sort');
      expect(headerSorts[0].text()).toBe('↓'); // id, default desc
      expect(headerSorts[1].text()).toBe('↑↓'); // best_time, not the active sort
    });

    it('switches the active sort field to ascending, then flips direction on a second click', async () => {
      respondWith([]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      const timeSort = wrapper.findAll('.table-header .pro-sort')[1];
      await timeSort.trigger('click');
      expect(timeSort.text()).toBe('↑');
      expect(useGetFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('order_field=best_time&order_direction=asc'), undefined
      );
      await timeSort.trigger('click');
      expect(timeSort.text()).toBe('↓');
    });

    it('sorts by every desktop column in both directions, including the 3x3-only ones', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      respondWith([]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      for (const sortEl of wrapper.findAll('.table-header .pro-sort')) {
        // click twice: once to make the field active (ascending), once to flip to descending
        await sortEl.trigger('click');
        await flushPromises();
        await sortEl.trigger('click');
        await flushPromises();
      }
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('order_field=id'), undefined);
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('order_field=best_moves'), undefined);
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('order_field=opt_diff'), undefined);
    });
  });

  describe('phone layout', () => {
    const columnOf = (cell: { classes: () => string[] }): string | undefined => {
      return cell.classes().find((name) => name.startsWith('col-'));
    };

    it('has one header row for every screen size, each cell sharing its column class with the cells below', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      respondWith([record3x3]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      expect(wrapper.findAll('.table-header')).toHaveLength(1);
      const header = wrapper.findAll('.table-header .flex-row').map(columnOf);
      expect(header).toEqual([
        'col-id', 'col-date', 'col-time', 'col-moves', 'col-opt', 'col-diff', 'col-scramble', 'col-solution', 'col-public-id'
      ]);
      expect(wrapper.findAll('.items .flex-row').map(columnOf)).toEqual(header);
    });

    it('keeps a day-first short date alongside the full one', async () => {
      respondWith([record3x3]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      expect(wrapper.find('.date-full').text()).toMatch(/^2024-06-01 /);
      expect(wrapper.find('.date-short').text()).toMatch(/^01\/06\/24 \d{2}:\d{2}:\d{2}$/);
    });

    it('carries the optimal-moves difference on the moves, for phones where its column is hidden', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      respondWith([record3x3]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      expect(wrapper.find('.col-moves .opt-moves').text()).toBe('+5');
    });

    it('leaves the moves bare when the scramble was solved optimally', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      respondWith([{ ...record3x3, opt_diff: 0 }]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      expect(wrapper.find('.opt-moves').exists()).toBe(false);
    });
  });

  describe('puzzle size changes', () => {
    it('ignores a puzzle size of 0, which the slider itself never emits', async () => {
      respondWith([]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      internals(wrapper).puzzleSize = 0;
      await wrapper.vm.$nextTick();
      expect(useGetFetchAPI).not.toHaveBeenCalled();
    });

    it('resets and re-fetches for the new size', async () => {
      respondWith([]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '5')!.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('puzzle_size=5&offset=0'), undefined
      );
    });

    it('falls back from an optimal-moves/diff sort to best_moves when leaving size 3', async () => {
      const store = useBaseStore();
      store.numLines = 3; // the optimal-moves/diff columns only render for size 3
      respondWith([]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      const optSort = wrapper.findAll('.table-header .pro-sort')[3]; // optimal_moves column
      await optSort.trigger('click');
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '5')!.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('order_field=best_moves'), undefined
      );
    });

    it('keeps a time/moves sort untouched when changing size', async () => {
      respondWith([]);
      const wrapper = mountList();
      await waitFetched(wrapper);
      const timeSort = wrapper.findAll('.table-header .pro-sort')[1];
      await timeSort.trigger('click');
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '5')!.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('order_field=best_time'), undefined
      );
    });
  });

  describe('closing', () => {
    it('emits close when clicking OK', async () => {
      respondWith([]);
      const wrapper = mountList();
      await vi.waitFor(() => {
        expect(wrapper.find('.buttons').exists()).toBe(true);
      });
      await wrapper.find('button.tool-button').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits close when clicking outside the list', async () => {
      respondWith([]);
      const wrapper = mountList();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });
});
