import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GamesTable from '../GamesTable.vue';
import { useBaseStore } from '../../stores/base';
import { baseUrl } from '@/const';
import type { GameData, Response } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

interface GamesTableInternals {
  puzzleSize: number;
  puzzleModeChoices: string[];
  tableTitle: string;
}

function internals(wrapper: VueWrapper): GamesTableInternals {
  return wrapper.vm as unknown as GamesTableInternals;
}

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
}

let currentWrapper: VueWrapper | undefined;
function mountTable(props: {
  formType: string; recordId?: number; avgType?: string; recordPuzzleSize?: number
}) {
  currentWrapper = mount(GamesTable, { props, attachTo: document.body });
  return currentWrapper;
}

function respondWith(records: GameData[]): void {
  vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0, game_records: records } satisfies Response);
}

async function waitFetched(wrapper: VueWrapper): Promise<void> {
  await vi.waitFor(() => {
    expect(wrapper.find('.buttons').exists()).toBe(true);
  });
}

// A real solvable 3x3 game record.
function gameRecord(overrides: Partial<GameData> = {}): GameData {
  return {
    id: 1,
    time: 12340,
    moves: 42,
    puzzle_size: 3,
    puzzle_type: 'standard',
    control_type: 'mouse',
    consecutive_solves: 3,
    scramble: '4,1,3,2,0,6,7,5,8',
    solve_path: 'RRRUULDD',
    tps: '3.402',
    created_at: '2024-06-01T12:00:00Z',
    public_id: 'abc123',
    opt_diff: 5,
    opt_moves: 18,
    md: 10,
    excluded_from_avg: null,
    ...overrides
  };
}

describe('GamesTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // jsdom's own default, made explicit so the wide-screen test below can't leak into
    // the rest of the file.
    setWidth(1024);
    respondWith([]);
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  describe('fetch URL selection', () => {
    it('requests the real session games endpoint for userGames, from the real store puzzle state', () => {
      const store = useBaseStore();
      store.numLines = 5;
      store.marathonMode = true;
      mountTable({ formType: 'userGames' });
      expect(useGetFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('user_games?puzzle_size=5&puzzle_type=marathon&offset=0&limit=50&order_field=id&order_direction=desc'),
        undefined
      );
    });

    it('requests the real average-record games endpoint for avgGames, ignoring puzzle mode', () => {
      mountTable({ formType: 'avgGames', recordId: 42, avgType: 'time' });
      expect(useGetFetchAPI).toHaveBeenCalledWith('avg_record_games?avg_record_id=42&avg_type=time', undefined);
    });

    it('requests the real fmc blitz record games endpoint for fmcBlitzGames', () => {
      mountTable({ formType: 'fmcBlitzGames', recordId: 7 });
      expect(useGetFetchAPI).toHaveBeenCalledWith('fmc_blitz_record_games?fmc_blitz_record_id=7', undefined);
    });

    it('sizes the board from the real recordPuzzleSize prop for avgGames/fmcBlitzGames', () => {
      const wrapper = mountTable({ formType: 'avgGames', recordId: 1, avgType: 'time', recordPuzzleSize: 5 });
      expect(internals(wrapper).puzzleSize).toBe(5);
    });

    it('falls back to an empty list when the real response carries no game_records at all', async () => {
      vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0 } satisfies Response);
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      expect(wrapper.findAll('.flex-table')).toHaveLength(1); // only the sticky header remains
    });
  });

  describe('initial puzzle mode / choices', () => {
    it('starts on g1000 mode when the store is already in a g1000 run', () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.g1000Mode = true;
      const wrapper = mountTable({ formType: 'userGames' });
      expect(wrapper.find<HTMLInputElement>('#g1000').element.checked).toBe(true);
    });

    it('offers g1000 as a puzzle mode choice at the real core size (3)', () => {
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      expect(internals(wrapper).puzzleModeChoices).toEqual(['standard', 'marathon', 'g1000']);
    });

    it('omits g1000 as a choice at any other real size', () => {
      const store = useBaseStore();
      store.numLines = 4;
      const wrapper = mountTable({ formType: 'userGames' });
      expect(internals(wrapper).puzzleModeChoices).toEqual(['standard', 'marathon']);
    });
  });

  describe('puzzle size / mode watchers', () => {
    it('re-fetches with the real new size and mode when the puzzle size changes', async () => {
      const store = useBaseStore();
      store.numLines = 4;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '5')!.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('puzzle_size=5'), undefined);
    });

    it('adds g1000 back as a choice when returning to the core size', async () => {
      const store = useBaseStore();
      store.numLines = 4;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '3')!.trigger('click');
      expect(internals(wrapper).puzzleModeChoices).toEqual(['standard', 'marathon', 'g1000']);
    });

    it('drops g1000 mode back to standard when leaving the core size while on g1000', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.g1000Mode = true;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '4')!.trigger('click');
      expect(wrapper.find<HTMLInputElement>('#standard').element.checked).toBe(true);
    });

    it('falls back an active opt_diff sort to moves when leaving the core size', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      const optDiffSort = wrapper.findAll('.table-header .pro-sort')[3];
      await optDiffSort.trigger('click');
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      await wrapper.findAll('.slider-marks span').find(s => s.text() === '4')!.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('order_field=moves'), undefined);
    });

    it('ignores a puzzle size of 0, which the slider itself never emits', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      (wrapper.vm as unknown as { puzzleSize: number }).puzzleSize = 0;
      await nextTick();
      expect(useGetFetchAPI).not.toHaveBeenCalled();
    });

    it('re-fetches when the puzzle mode changes', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      const marathon = wrapper.find('label[for="marathon"] span');
      await marathon.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('puzzle_type=marathon'), undefined);
    });
  });

  describe('tableTitle', () => {
    it.each([
      ['userGames', 'Your Games'],
      ['avgGames', 'Average Record Games'],
      ['fmcBlitzGames', 'FMC Blitz Games']
    ])('shows the real title for %s', (formType, expected) => {
      const wrapper = mountTable({ formType, recordId: 1, avgType: 'time' });
      expect(wrapper.find('.header span').text()).toBe(expected);
    });

    it('falls back to the userGames title for an unrecognized formType', () => {
      const wrapper = mountTable({ formType: 'somethingElse' });
      expect(wrapper.find('.header span').text()).toBe('Your Games');
    });
  });

  describe('template - puzzle controls visibility', () => {
    it('shows the puzzle size/mode controls only for userGames', () => {
      const wrapper = mountTable({ formType: 'userGames' });
      expect(wrapper.find('.puzzle-size-slider-container').exists()).toBe(true);
      expect(wrapper.find('.puzzle-mode-container').exists()).toBe(true);
    });

    it('hides the puzzle size/mode controls for avgGames/fmcBlitzGames', () => {
      const wrapper = mountTable({ formType: 'avgGames', recordId: 1, avgType: 'time' });
      expect(wrapper.find('.puzzle-size-slider-container').exists()).toBe(false);
      expect(wrapper.find('.puzzle-mode-container').exists()).toBe(false);
    });
  });

  describe('template - error state', () => {
    it('shows the real error message and hides the export link/table on failure', async () => {
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('boom'));
      const wrapper = mountTable({ formType: 'userGames' });
      await vi.waitFor(() => {
        expect(wrapper.find('.table-error-msg').exists()).toBe(true);
      });
      expect(wrapper.text()).toContain('boom');
      expect(wrapper.find('.export-link-wrapper').exists()).toBe(false);
      expect(wrapper.find('#game-list-table').exists()).toBe(false);
      expect(wrapper.find('.buttons').exists()).toBe(true);
    });
  });

  describe('template - rows', () => {
    it('shows every real field for a fetched row, including the opt_diff column at the core size', async () => {
      respondWith([gameRecord()]);
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      expect(wrapper.text()).toContain('12.34'); // time / 1000
      expect(wrapper.text()).toContain('42'); // moves
      expect(wrapper.text()).toContain('3.402'); // tps
      expect(wrapper.text()).toContain('+5'); // opt_diff
      const link = wrapper.find<HTMLAnchorElement>('.w-70 a.link-item');
      expect(link.attributes('href')).toBe(`${baseUrl}?game_id=abc123`);
    });

    it('hides the opt_diff column away from the core size', async () => {
      respondWith([gameRecord({ puzzle_size: 4 })]);
      const store = useBaseStore();
      store.numLines = 4;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      expect(wrapper.text()).not.toContain('Opt.diff');
    });

    it('hides the opt_diff badge for a real negative diff', async () => {
      respondWith([gameRecord({ opt_diff: -1 })]);
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      expect(wrapper.text()).not.toContain('+-1');
    });

    it('shows +0 for a real missing opt_diff, falling back to zero', async () => {
      respondWith([gameRecord({ opt_diff: undefined })]);
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      expect(wrapper.text()).toContain('+0');
    });

    it('shows the id as plain text when a game has no real scramble on file', async () => {
      respondWith([gameRecord({ scramble: undefined })]);
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      expect(wrapper.find('.w-70 a').exists()).toBe(false);
      expect(wrapper.find('.w-70 span').exists()).toBe(true);
    });

    it.each([
      ['time', 'best', '.w-85.green'],
      ['moves', 'best', '.w-85.green'],
      ['tps', 'worst', '.w-70.red']
    ])('highlights the %s column for the real matching average type', async (avgType, excluded, selector) => {
      respondWith([gameRecord({ excluded_from_avg: excluded })]);
      const wrapper = mountTable({ formType: 'avgGames', recordId: 1, avgType });
      await waitFetched(wrapper);
      expect(wrapper.find(selector).exists()).toBe(true);
    });

    it('does not highlight a normal, non-excluded row', async () => {
      respondWith([gameRecord({ excluded_from_avg: null })]);
      const wrapper = mountTable({ formType: 'avgGames', recordId: 1, avgType: 'time' });
      await waitFetched(wrapper);
      expect(wrapper.find('.green').exists()).toBe(false);
      expect(wrapper.find('.red').exists()).toBe(false);
    });
  });

  describe('sorting', () => {
    it('shows the default sort arrow on the id column, and the inverted arrow logic for TPS', () => {
      const wrapper = mountTable({ formType: 'userGames' });
      const headerSorts = wrapper.findAll('.table-header .pro-sort');
      expect(headerSorts[0].text()).toBe('↓'); // id, default desc
      expect(headerSorts[headerSorts.length - 1].text()).toBe('↑↓'); // tps, not active
    });

    it('re-requests with the real chosen field once a desktop sort control is clicked', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      const timeSort = wrapper.findAll('.table-header .pro-sort')[1];
      await timeSort.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('order_field=time&order_direction=asc'), undefined);
      expect(timeSort.text()).toBe('↑');
    });

    it('shows the inverted TPS arrow once TPS is the active sort', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      const tpsSort = wrapper.findAll('.table-header .pro-sort').at(-1)!;
      await tpsSort.trigger('click');
      expect(tpsSort.text()).toBe('↓'); // ascending shows down for TPS
    });

    it('sorts real already-fetched avgGames records locally, without a new fetch', async () => {
      respondWith([
        gameRecord({ id: 1, moves: 50 }),
        gameRecord({ id: 2, moves: 40 })
      ]);
      const wrapper = mountTable({ formType: 'avgGames', recordId: 1, avgType: 'time' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      const movesSort = wrapper.findAll('.table-header .pro-sort')[2];
      await movesSort.trigger('click');
      expect(useGetFetchAPI).not.toHaveBeenCalled();
      const ids = wrapper.findAll('.items .w-70 .link-item').map(el => el.text());
      expect(ids).toEqual(['2', '1']); // ascending by moves: 40 before 50
    });

    it('re-requests from the real mobile sort control too', async () => {
      respondWith([gameRecord()]);
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([]);
      const mobileMovesSort = wrapper.findAll('.table-header-mobile .pro-sort')[2];
      await mobileMovesSort.trigger('click');
      expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('order_field=moves'), undefined);
    });

    it.each([
      ['id', 0, '↑', '↓'],
      ['time', 1, '↑', '↓'],
      ['moves', 2, '↑', '↓'],
      ['opt_diff', 3, '↑', '↓'],
      ['tps', 4, '↓', '↑'] // tps arrow direction is inverted
    ])('toggles the real %s sort direction on repeated desktop clicks', async (_field, index, firstArrow, secondArrow) => {
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      const sortEl = wrapper.findAll('.table-header .pro-sort')[index];
      await sortEl.trigger('click');
      expect(sortEl.text()).toBe(firstArrow);
      await sortEl.trigger('click');
      expect(sortEl.text()).toBe(secondArrow);
    });

    it.each([
      ['id', 0],
      ['time', 1],
      ['moves', 2],
      ['opt_diff', 3],
      ['tps', 4]
    ])('toggles the real %s sort direction from repeated mobile clicks', async (_field, index) => {
      respondWith([gameRecord()]);
      const store = useBaseStore();
      store.numLines = 3;
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      await wrapper.findAll('.table-header-mobile .pro-sort')[index].trigger('click');
      await waitFetched(wrapper);
      expect(wrapper.findAll('.table-header-mobile .pro-sort')[index].text()).not.toBe('↑↓');
      await wrapper.findAll('.table-header-mobile .pro-sort')[index].trigger('click');
      await waitFetched(wrapper);
      expect(wrapper.findAll('.table-header-mobile .pro-sort')[index].text()).not.toBe('↑↓');
    });
  });

  describe('doExport / jsonToCSV', () => {
    function captureExport(): () => Promise<string> {
      let capturedBlob: Blob | undefined;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
        capturedBlob = obj as Blob;
        return 'blob:mock';
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      return async () => (await capturedBlob!.text());
    }

    it('exports the real already-fetched records for avgGames without a network call', async () => {
      respondWith([gameRecord()]);
      const getCsv = captureExport();
      const wrapper = mountTable({ formType: 'avgGames', recordId: 1, avgType: 'time', recordPuzzleSize: 3 });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      await wrapper.find('.export-link-wrapper a').trigger('click');
      expect(useGetFetchAPI).not.toHaveBeenCalled();
      const csv = await getCsv();
      expect(csv).toContain('game_link,created_at,consecutive_solves,time,moves,opt_moves,opt_diff,tps,scramble,md,solve_path');
      expect(csv).toContain(`${baseUrl}?game_id=abc123`);
      expect(csv).toContain('18,5'); // opt_moves,opt_diff
    });

    it('omits the opt_moves/opt_diff columns away from the core size', async () => {
      respondWith([gameRecord({ puzzle_size: 5 })]);
      const store = useBaseStore();
      store.numLines = 5;
      const getCsv = captureExport();
      const wrapper = mountTable({ formType: 'fmcBlitzGames', recordId: 1, recordPuzzleSize: 5 });
      await waitFetched(wrapper);
      await wrapper.find('.export-link-wrapper a').trigger('click');
      const csv = await getCsv();
      expect(csv).toContain('game_link,created_at,consecutive_solves,time,moves,tps,scramble,md,solve_path');
      expect(csv).not.toContain('opt_moves');
    });

    it('fetches and exports the real session games for userGames', async () => {
      respondWith([gameRecord()]);
      const store = useBaseStore();
      store.token = 'real-session-token';
      const getCsv = captureExport();
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockClear();
      respondWith([gameRecord({ id: 99 })]);
      await wrapper.find('.export-link-wrapper a').trigger('click');
      await vi.waitFor(async () => {
        expect((await getCsv())).toContain(`${baseUrl}?game_id=abc123`);
      });
      expect(useGetFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('session_games?puzzle_size='), 'real-session-token'
      );
    });

    it('shows a real error instead of exporting when the session games request fails', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('export failed'));
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      await wrapper.find('.export-link-wrapper a').trigger('click');
      await vi.waitFor(() => {
        expect(wrapper.find('.table-error-msg').text()).toBe('export failed');
      });
      expect(consoleSpy).toHaveBeenCalledWith('export failed');
    });
  });

  describe('responsive column widths', () => {
    it('constrains the scramble and solution columns at 1100px and below', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      const cells = wrapper.findAll('.table-header .flex-row');
      expect(cells.at(-2)!.text()).toBe('Scramble');
      expect(cells.at(-2)!.classes()).toContain('w-85');
      expect(cells.at(-1)!.classes()).toContain('w-85');
    });

    it('lets them take the full width on a wider screen', async () => {
      setWidth(1200);
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      const cells = wrapper.findAll('.table-header .flex-row');
      expect(cells.at(-2)!.text()).toBe('Scramble');
      expect(cells.at(-2)!.classes()).not.toContain('w-85');
      expect(cells.at(-1)!.classes()).not.toContain('w-85');
    });
  });

  describe('closing', () => {
    it('emits close when clicking OK', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      await waitFetched(wrapper);
      await wrapper.find('button.tool-button').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits close when clicking outside', async () => {
      const wrapper = mountTable({ formType: 'userGames' });
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });
});
