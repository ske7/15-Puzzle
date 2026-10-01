import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import UserAccount from '../UserAccount.vue';
import { useBaseStore } from '../../stores/base';
import type { Response, UserRecord, UserStats } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

// Realistic records for a 3x3 standard board, plus decoys for other sizes/modes
// that must be filtered out, and averages given out of display order to prove
// the real sort logic reorders them.
const records: UserRecord[] = [
  {
    id: 1, record_type: 'time', puzzle_type: 'standard', puzzle_size: 3,
    time: 12340, moves: 42, tps: '3.402', created_at: '2024-01-15T12:00:00Z', control_type: 'mouse', record_id: 1
  },
  {
    id: 2, record_type: 'moves', puzzle_type: 'standard', puzzle_size: 3,
    time: 15000, moves: 38, tps: '2.533', created_at: '2024-02-20T12:00:00Z', control_type: 'touch', record_id: 2
  },
  {
    id: 3, record_type: 'fmc_blitz_moves', puzzle_type: 'standard', puzzle_size: 3,
    time: 0, moves: 25, tps: '0', created_at: '2024-03-01T12:00:00Z', control_type: 'mouse', record_id: 3
  },
  {
    id: 4, record_type: 'ao100', puzzle_type: 'standard', puzzle_size: 3,
    avg_time: '15.234', avg_moves: '45.2', avg_tps: '3.1', record_id: 4
  },
  {
    id: 5, record_type: 'ao5', puzzle_type: 'standard', puzzle_size: 3,
    avg_time: '13.500', avg_moves: '40.0', avg_tps: '3.5', record_id: 5
  },
  {
    id: 6, record_type: 'ao50', puzzle_type: 'standard', puzzle_size: 3,
    avg_time: '14.800', avg_moves: '43.1', avg_tps: '3.2', record_id: 6
  },
  {
    id: 7, record_type: 'time', puzzle_type: 'marathon', puzzle_size: 3,
    time: 99999, moves: 99, tps: '1.0', record_id: 7
  },
  {
    id: 8, record_type: 'time', puzzle_type: 'standard', puzzle_size: 4,
    time: 88888, moves: 88, tps: '1.0', record_id: 8
  }
];

function userStats(overrides: Partial<UserStats['user_data']> = {}): UserStats {
  return {
    user_data: {
      created_at: '2023-05-10T12:00:00Z',
      last_game_at: '2024-06-01T12:00:00Z',
      num_finished_games: 120,
      play_time: 3723456, // 1h 2m 3s 456ms
      id: 1,
      ...overrides
    },
    user_records: records
  };
}

function statsResponse(stats: UserStats): Response {
  return { status: 'ok', game_id: 0, stats };
}

let currentWrapper: VueWrapper | undefined;

function mountAccount() {
  currentWrapper = mount(UserAccount, { attachTo: document.body });
  return currentWrapper;
}

// Resolving the lazily-imported children up front: defineAsyncComponent loads them on
// first render, so a vi.waitFor for one is really timing module resolution (~350ms cold,
// against waitFor's 1000ms default). See ActionPanel.spec.ts for the full note.
beforeAll(async () => {
  await import('../GamesTable.vue');
});

describe('UserAccount', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useBaseStore();
    store.numLines = 3;
    store.marathonMode = false;
    store.userName = 'demi';
    store.token = 'tok';
  });

  afterEach(() => {
    // UserAccount's panel is a <Teleport to="body">, landing outside its own
    // component tree - unmounting properly (not just clearing the DOM) is what
    // actually disposes its onClickOutside listener and reactive effects.
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  it('fetches the current user stats with the auth token on mount', () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    expect(useGetFetchAPI).toHaveBeenCalledWith('current_user_stats', 'tok');
  });

  it('does not start a fetch while another fetch is already in flight', () => {
    const store = useBaseStore();
    store.isFetching = true;
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    expect(useGetFetchAPI).not.toHaveBeenCalled();
  });

  it('shows nothing while the stats are still loading', () => {
    vi.mocked(useGetFetchAPI).mockReturnValue(new Promise(() => undefined));
    mountAccount();
    expect(document.querySelector('.user-account')).toBeNull();
  });

  it('shows the account panel once stats have loaded', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelector('.user-account')).not.toBeNull();
    });
    expect(document.querySelector('.user-info p')?.textContent).toBe('Name: demi');
    expect(document.querySelectorAll('.user-info p')[1].textContent)
      .toMatch(/^Registration date: [A-Za-z]{3} \d{1,2}, \d{4}$/);
    expect(document.querySelectorAll('.user-info p')[2].textContent).toContain('Num games: 120');
    expect(document.querySelectorAll('.user-info p')[3].textContent).toBe('Play time: 1h 2m 3s 456ms');
  });

  it('shows zero finished games when the account has none', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats({ num_finished_games: 0 })));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.user-info p')[2]).not.toBeUndefined();
    });
    expect(document.querySelectorAll('.user-info p')[2].textContent).toContain('Num games: 0');
  });

  it('defaults to marathon mode when the store is already in marathon mode', async () => {
    const store = useBaseStore();
    store.marathonMode = true;
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.items-table')[0]).not.toBeUndefined();
    });
    const marathonRadio = Array.from(document.querySelectorAll('input[type="radio"]'))
      .find((input) => input.getAttribute('value') === 'marathon') as HTMLInputElement;
    expect(marathonRadio.checked).toBe(true);
    const rows = document.querySelectorAll('.items-table')[0].querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelectorAll('td')[1].textContent).toBe('99.999');
  });

  it('falls back to a zero play time when the field is missing from the response', async () => {
    const stats = userStats();
    // The server contract guarantees play_time as a number, but real API responses
    // aren't statically enforced - simulate one missing the field.
    (stats.user_data as { play_time?: number }).play_time = undefined;
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(stats));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.user-info p')[3].textContent).toBe('Play time: 0');
    });
  });

  it('lists the best time/moves/fmc-blitz records for the selected size and mode', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.items-table')[0]).not.toBeUndefined();
    });
    const rows = document.querySelectorAll('.items-table')[0].querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);

    const [timeRow, movesRow, blitzRow] = Array.from(rows).map((r) => r.querySelectorAll('td'));
    expect(timeRow[0].textContent).toBe('time');
    expect(timeRow[1].textContent).toBe('12.34');
    expect(timeRow[3].textContent).toMatch(/^\d{2}\/\d{2}\/\d{2}$/);
    expect(timeRow[4].textContent).toBe('m');

    expect(movesRow[0].textContent).toBe('moves');
    expect(movesRow[1].textContent).toBe('38');
    expect(movesRow[4].textContent).toBe('t');

    expect(blitzRow[0].textContent).toBe('FMC');
    expect(blitzRow[1].textContent).toBe('25');
  });

  it('re-filters best records when a different puzzle size is picked', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.items-table')[0]).not.toBeUndefined();
    });

    // cores[1] is 4 - the puzzle_size of the only other "standard" time record.
    document.querySelectorAll('.slider-marks span')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      const rows = document.querySelectorAll('.items-table')[0].querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
    });
    const row = document.querySelectorAll('.items-table')[0].querySelector('tbody tr');
    expect(row?.querySelectorAll('td')[1].textContent).toBe('88.888');
  });

  it('re-filters best records when marathon mode is picked, showing no date for a record missing one', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.items-table')[0]).not.toBeUndefined();
    });

    const marathonRadio = Array.from(document.querySelectorAll('input[type="radio"]'))
      .find((input) => input.getAttribute('value') === 'marathon');
    marathonRadio?.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      const rows = document.querySelectorAll('.items-table')[0].querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
    });
    const row = document.querySelectorAll('.items-table')[0].querySelector('tbody tr');
    expect(row?.querySelectorAll('td')[1].textContent).toBe('99.999');
    expect(row?.querySelectorAll('td')[3].textContent).toBe('');
  });

  it('lists average records sorted into ao5/ao12/ao50/ao100 order', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.items-table')[1]).not.toBeUndefined();
    });
    const rows = document.querySelectorAll('.items-table')[1].querySelectorAll('tbody tr');
    const types = Array.from(rows).map((r) => r.querySelector('td')?.textContent);
    expect(types).toEqual(['ao5', 'ao50', 'ao100']);
  });

  it('flags a network error and stops fetching', async () => {
    const store = useBaseStore();
    vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('NetworkError when attempting to fetch'));
    mountAccount();
    await vi.waitFor(() => {
      expect(store.isFetching).toBe(false);
    });
    expect(store.isNetworkError).toBe(true);
  });

  it('does not flag a network error for an unrelated failure', async () => {
    const store = useBaseStore();
    vi.mocked(useGetFetchAPI).mockRejectedValue(new Error('boom'));
    mountAccount();
    await vi.waitFor(() => {
      expect(store.isFetching).toBe(false);
    });
    expect(store.isNetworkError).toBe(false);
  });

  it('emits close when the OK button is clicked', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    const wrapper = mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelector('.user-account')).not.toBeNull();
    });
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  it('emits close when clicking outside the panel', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    const wrapper = mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelector('.user-account')).not.toBeNull();
    });
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  it('opens the games table on "(your games)"', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    const wrapper = mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelector('.user-account')).not.toBeNull();
    });

    document.querySelector('.last-games')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('.games-table')).not.toBeNull();
    });
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('closes the games table on an outside click without closing the account panel itself', async () => {
    vi.mocked(useGetFetchAPI).mockResolvedValue(statsResponse(userStats()));
    const wrapper = mountAccount();
    await vi.waitFor(() => {
      expect(document.querySelector('.user-account')).not.toBeNull();
    });

    document.querySelector('.last-games')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('.games-table')).not.toBeNull();
    });

    // GamesTable's own onClickOutside closes it via closeGamesTable(); UserAccount's
    // onClickOutside guard skips closing the account panel itself while it was open.
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('.games-table')).toBeNull();
    });
    expect(wrapper.emitted('close')).toBeUndefined();
  });
});
