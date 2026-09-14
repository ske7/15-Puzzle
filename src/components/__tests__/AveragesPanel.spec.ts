import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AveragesPanel from '../AveragesPanel.vue';
import { useBaseStore } from '../../stores/base';
import type { AverageStats, Response, WasAvgRecord } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

interface AveragesPanelInternals {
  positionTop: string;
  positionLeft: string;
  checkDirection: (arrayID: number, field: 'time' | 'moves' | 'tps', direction: 'up' | 'down') => boolean;
  checkIfWasRecord: (type: string, field: string) => boolean;
}

function internals(wrapper: VueWrapper): AveragesPanelInternals {
  return wrapper.vm as unknown as AveragesPanelInternals;
}

let currentWrapper: VueWrapper | undefined;
function mountPanel() {
  currentWrapper = mount(AveragesPanel, { attachTo: document.body });
  return currentWrapper;
}

// Realistic average snapshots for a 3x3 board: an older set and a faster/slower
// mixed follow-up set, so up/down comparisons exercise both directions.
const olderStats: AverageStats = {
  aoSt: '15.230', aoSm: '20', aoStps: '1.31',
  ao5t: '14.500', ao5m: '19', ao5tps: '1.31',
  ao12t: '16.200', ao12m: '21', ao12tps: '1.30',
  ao50t: '17.000', ao50m: '22', ao50tps: '1.29',
  ao100t: '18.000', ao100m: '23', ao100tps: '1.28',
  ao1000t: '19.000', ao1000m: '24', ao1000tps: '1.27'
};
const newerStats: AverageStats = {
  aoSt: '15.230', aoSm: '20', aoStps: '1.31',
  ao5t: '13.900', ao5m: '18', ao5tps: '1.35',
  ao12t: '16.900', ao12m: '21', ao12tps: '1.24',
  ao50t: '17.000', ao50m: '22', ao50tps: '1.29',
  ao100t: '18.400', ao100m: '25', ao100tps: '1.22',
  ao1000t: '19.000', ao1000m: '24', ao1000tps: '1.27'
};
// Every field higher/lower than olderStats, across all six rows including ao1000,
// to exercise the up/down arrow for every row/metric at once.
const allUpStats: AverageStats = {
  aoSt: '16.000', aoSm: '21', aoStps: '1.35',
  ao5t: '15.100', ao5m: '20', ao5tps: '1.40',
  ao12t: '17.000', ao12m: '22', ao12tps: '1.40',
  ao50t: '18.000', ao50m: '23', ao50tps: '1.35',
  ao100t: '19.000', ao100m: '24', ao100tps: '1.35',
  ao1000t: '20.000', ao1000m: '25', ao1000tps: '1.35'
};
const allDownStats: AverageStats = {
  aoSt: '14.000', aoSm: '19', aoStps: '1.20',
  ao5t: '13.000', ao5m: '18', ao5tps: '1.20',
  ao12t: '15.000', ao12m: '20', ao12tps: '1.20',
  ao50t: '16.000', ao50m: '21', ao50tps: '1.20',
  ao100t: '17.000', ao100m: '22', ao100tps: '1.20',
  ao1000t: '18.000', ao1000m: '23', ao1000tps: '1.20'
};
const wasAvgRecords: WasAvgRecord[] = [
  { type: 'ao5', record_time: true, record_moves: false, record_tps: true },
  { type: 'ao12', record_time: false, record_moves: false, record_tps: false }
];

function setUpPanel(overrides: Partial<ReturnType<typeof useBaseStore>> = {}) {
  const store = useBaseStore();
  store.token = 'real-session-token';
  store.proMode = true;
  store.boardPos = { left: 500, top: 200, right: 800, bottom: 500 };
  Object.assign(store, overrides);
  return store;
}

// Resolving the lazily-imported children up front: defineAsyncComponent loads them on
// first render, so a vi.waitFor for one is really timing module resolution (~350ms cold,
// against waitFor's 1000ms default). See ActionPanel.spec.ts for the full note.
beforeAll(async () => {
  await import('../LeaderBoard.vue');
});

describe('AveragesPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0, records: [] } satisfies Response);
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  describe('visibility', () => {
    it.each([
      ['replay mode', { replayMode: true }],
      ['playground mode', { playgroundMode: true }],
      ['a network error', { isNetworkError: true }],
      ['current averages hidden by the user', { hideCurrentAverages: true }],
      ['pro mode off', { proMode: false }]
    ])('is not rendered during %s', (_label, overrides) => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      Object.assign(store, overrides);
      const wrapper = mountPanel();
      expect(wrapper.find('.avg-wrapper').exists()).toBe(false);
    });

    it('is not rendered before any averages exist', () => {
      setUpPanel();
      const wrapper = mountPanel();
      expect(wrapper.find('.avg-wrapper').exists()).toBe(false);
    });

    it('renders once pro mode is active with at least one average', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      const wrapper = mountPanel();
      expect(wrapper.find('.avg-wrapper').exists()).toBe(true);
    });
  });

  describe('position computeds', () => {
    it('derives positionTop/positionLeft from the real board position', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      const wrapper = mountPanel();
      expect(internals(wrapper).positionTop).toBe('300px');
      expect(internals(wrapper).positionLeft).toBe('200px');
    });
  });

  describe('averages rows', () => {
    it('shows the real values with no arrows before a previous average exists', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      const wrapper = mountPanel();
      const rows = wrapper.findAll('.avg-row');
      expect(rows[1].text()).toContain('14.500');
      expect(wrapper.findAll('.red')).toHaveLength(0);
      expect(wrapper.findAll('.green')).toHaveLength(0);
    });

    it('shows "tbd" when a value is missing', () => {
      const store = setUpPanel();
      store.setCurrentAverages({} satisfies AverageStats, true);
      const wrapper = mountPanel();
      expect(wrapper.findAll('.avg-row')[1].text()).toContain('tbd');
    });

    it('shows red-up/green-down arrows for slower/faster times and moves, and the inverse for tps', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.setCurrentAverages(newerStats);
      store.setWasAvgRecords(wasAvgRecords);
      const wrapper = mountPanel();
      const rows = wrapper.findAll('.avg-row');

      // ao5: time down (faster, green), moves down (fewer, green), tps up (higher, green)
      const ao5 = rows[1];
      expect(ao5.text()).toContain('13.900');
      expect(ao5.findAll('.green')).toHaveLength(3);
      expect(ao5.findAll('.red')).toHaveLength(0);
      expect(ao5.find('.purple').exists()).toBe(true);

      // ao12: time up (slower, red), moves same (no arrow), tps down (lower, red)
      const ao12 = rows[2];
      expect(ao12.findAll('.red')).toHaveLength(2);
      expect(ao12.findAll('.green')).toHaveLength(0);

      // ao50: everything unchanged, no arrows
      const ao50 = rows[3];
      expect(ao50.findAll('.red')).toHaveLength(0);
      expect(ao50.findAll('.green')).toHaveLength(0);

      // ao1000 only renders in g1000Mode
      expect(wrapper.text()).not.toContain('ao1000');
    });

    it('renders the ao1000 row and aoS row in g1000Mode', () => {
      const store = setUpPanel({ g1000Mode: true });
      store.setCurrentAverages(olderStats, true);
      store.setCurrentAverages(newerStats);
      const wrapper = mountPanel();
      expect(wrapper.text()).toContain('ao1000');
      const aoS = wrapper.findAll('.avg-row')[6];
      expect(aoS.text()).toContain('15.230');
    });

    it('shows a red-up arrow for time/moves and a green-up arrow for tps on every row when everything got worse', () => {
      const store = setUpPanel({ g1000Mode: true });
      store.setCurrentAverages(olderStats, true);
      store.setCurrentAverages(allUpStats);
      const wrapper = mountPanel();
      for (const row of wrapper.findAll('.avg-row').slice(1)) {
        expect(row.findAll('.red')).toHaveLength(2);
        expect(row.findAll('.green')).toHaveLength(1);
      }
    });

    it('shows a green-down arrow for time/moves and a red-down arrow for tps on every row when everything improved', () => {
      const store = setUpPanel({ g1000Mode: true });
      store.setCurrentAverages(olderStats, true);
      store.setCurrentAverages(allDownStats);
      const wrapper = mountPanel();
      for (const row of wrapper.findAll('.avg-row').slice(1)) {
        expect(row.findAll('.green')).toHaveLength(2);
        expect(row.findAll('.red')).toHaveLength(1);
      }
    });

    it('shows "tbd" for every field on every row when none have run yet', () => {
      const store = setUpPanel({ g1000Mode: true });
      store.setCurrentAverages({} satisfies AverageStats, true);
      const wrapper = mountPanel();
      for (const row of wrapper.findAll('.avg-row').slice(1)) {
        expect(row.text().match(/tbd/g)).toHaveLength(3);
      }
    });

    it('does not mark a row purple when it was never a record', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.setWasAvgRecords(wasAvgRecords);
      const wrapper = mountPanel();
      const ao50 = wrapper.findAll('.avg-row')[3];
      expect(ao50.find('.purple').exists()).toBe(false);
    });
  });

  describe('up/down checks with no averages to compare', () => {
    it('report false once currentAverages becomes empty, even with a previous average on record', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.setCurrentAverages(newerStats);
      const wrapper = mountPanel();
      store.currentAverages = [];
      const vm = internals(wrapper);
      expect(vm.checkDirection(1, 'time', 'up')).toBe(false);
      expect(vm.checkDirection(1, 'time', 'down')).toBe(false);
      expect(vm.checkDirection(1, 'moves', 'up')).toBe(false);
      expect(vm.checkDirection(1, 'moves', 'down')).toBe(false);
      expect(vm.checkDirection(1, 'tps', 'up')).toBe(false);
      expect(vm.checkDirection(1, 'tps', 'down')).toBe(false);
    });
  });

  describe('up/down checks with a missing value on one side', () => {
    it('treats a missing current value as 0 against a real previous value', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.setCurrentAverages({} satisfies AverageStats);
      const wrapper = mountPanel();
      const vm = internals(wrapper);
      expect(vm.checkDirection(1, 'time', 'down')).toBe(true);
      expect(vm.checkDirection(1, 'time', 'up')).toBe(false);
      expect(vm.checkDirection(1, 'moves', 'down')).toBe(true);
      expect(vm.checkDirection(1, 'moves', 'up')).toBe(false);
      expect(vm.checkDirection(1, 'tps', 'down')).toBe(true);
      expect(vm.checkDirection(1, 'tps', 'up')).toBe(false);
    });

    it('treats a missing previous value as 0 against a real current value', () => {
      const store = setUpPanel();
      store.setCurrentAverages({} satisfies AverageStats, true);
      store.setCurrentAverages(newerStats);
      const wrapper = mountPanel();
      const vm = internals(wrapper);
      expect(vm.checkDirection(1, 'time', 'up')).toBe(true);
      expect(vm.checkDirection(1, 'time', 'down')).toBe(false);
      expect(vm.checkDirection(1, 'moves', 'up')).toBe(true);
      expect(vm.checkDirection(1, 'moves', 'down')).toBe(false);
      expect(vm.checkDirection(1, 'tps', 'up')).toBe(true);
      expect(vm.checkDirection(1, 'tps', 'down')).toBe(false);
    });
  });

  describe('checkIfWasRecord', () => {
    it('reads record_time/record_moves/record_tps for a known type', () => {
      const store = setUpPanel();
      store.setWasAvgRecords(wasAvgRecords);
      const wrapper = mountPanel();
      const check = internals(wrapper).checkIfWasRecord;
      expect(check('ao5', 'time')).toBe(true);
      expect(check('ao5', 'moves')).toBe(false);
      expect(check('ao5', 'tps')).toBe(true);
    });

    it('falls back to false for a type with no recorded average and for an unknown field', () => {
      const store = setUpPanel();
      store.setWasAvgRecords(wasAvgRecords);
      const wrapper = mountPanel();
      const check = internals(wrapper).checkIfWasRecord;
      expect(check('ao100', 'time')).toBe(false);
      expect(check('ao5', 'unknown-field')).toBe(false);
    });
  });

  describe('consecutive solves', () => {
    it('shows the real consecutive solves count from the store', () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.consecutiveSolves = 7;
      const wrapper = mountPanel();
      expect(wrapper.find('.consecutive-solves').text()).toBe('Consecutive solves: 7');
    });
  });

  describe('opening and closing the leaderboard', () => {
    it('pauses and opens the leaderboard when clicked while running', async () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.paused = false;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.paused).toBe(true);
      expect(store.showLeaderBoard).toBe(true);
    });

    it('does not touch pause state when already paused, and stays paused after closing', async () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.paused = true;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.paused).toBe(true);
      await vi.waitFor(() => {
        expect(document.querySelector('.leaderboard')).not.toBeNull();
      });
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.showLeaderBoard).toBe(false);
      expect(store.paused).toBe(true);
    });

    it('unpauses on close when it auto-paused on open', async () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.paused = false;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      await vi.waitFor(() => {
        expect(document.querySelector('.leaderboard')).not.toBeNull();
      });
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.showLeaderBoard).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('opens the leaderboard without auto-pausing once the puzzle is done', async () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.paused = false;
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.paused).toBe(false);
      expect(store.showLeaderBoard).toBe(true);
    });

    it('does nothing when clicked while another modal is open', async () => {
      const store = setUpPanel();
      store.setCurrentAverages(olderStats, true);
      store.paused = false;
      store.showConfig = true;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.showLeaderBoard).toBe(false);
      expect(store.paused).toBe(false);
    });

    it('does nothing when clicked during a running marathon', async () => {
      const store = setUpPanel({ marathonMode: true });
      store.setCurrentAverages(olderStats, true);
      store.paused = false;
      store.time = 5000;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.showLeaderBoard).toBe(false);
    });

    it('allows opening during marathon mode once the run is finished', async () => {
      const store = setUpPanel({ marathonMode: true });
      store.setCurrentAverages(olderStats, true);
      store.paused = false;
      store.inPlaceCount = store.arrayLength - 1;
      store.time = 5000;
      const wrapper = mountPanel();
      await wrapper.find('.best-averages .link-item').trigger('click');
      expect(store.showLeaderBoard).toBe(true);
    });
  });
});
