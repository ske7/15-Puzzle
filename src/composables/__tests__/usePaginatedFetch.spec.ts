import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePaginatedFetch } from '../usePaginatedFetch';
import { useBaseStore } from '../../stores/base';
import { withSetup } from '../../../tests/withSetup';
import { OrderDirection } from '@/const';
import type { Response } from '@/types';

interface Row {
  id: number;
  score?: number;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function mount(scrollElementId = 'scroll-el', atachScroll = true, doLocalSort = false) {
  const endpointBuilder = vi.fn(
    (offset: number, limit: number, sortField: string, orderDirection: OrderDirection) =>
      `records?offset=${offset}&limit=${limit}&sort=${sortField}&dir=${orderDirection}`
  );
  const extractRecords = (res: Response): Row[] => res.records ?? [];
  const [result, unmount] = withSetup(() =>
    usePaginatedFetch<Row>(endpointBuilder, extractRecords, scrollElementId, atachScroll, doLocalSort));
  return { result, unmount, endpointBuilder };
}

describe('usePaginatedFetch', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with empty, not-yet-fetched state', () => {
    const { result, unmount } = mount();
    expect(result.records.value).toEqual([]);
    expect(result.errorMsg.value).toBe('');
    expect(result.isFetching.value).toBe(false);
    expect(result.fetched.value).toBe(false);
    expect(result.isDone.value).toBe(false);
    expect(result.sortField.value).toBe('id');
    expect(result.orderDirection.value).toBe(OrderDirection.Desc);
    unmount();
  });

  it('does not fetch on mount when the scroll element is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = mount('does-not-exist');
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    unmount();
  });

  it('fetches on mount and attaches a scroll listener when the element exists', async () => {
    const el = document.createElement('div');
    el.id = 'scroll-el';
    document.body.appendChild(el);
    const addSpy = vi.spyOn(el, 'addEventListener');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [{ id: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = mount();
    await vi.waitFor(() => {
      expect(result.records.value).toEqual([{ id: 1 }]);
    });
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(result.fetched.value).toBe(true);
    expect(result.isDone.value).toBe(false);
    unmount();
  });

  it('does not attach a scroll listener when atachScroll is false', async () => {
    const el = document.createElement('div');
    el.id = 'scroll-el';
    document.body.appendChild(el);
    const addSpy = vi.spyOn(el, 'addEventListener');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [] })));

    const { unmount } = mount('scroll-el', false);
    await Promise.resolve();
    expect(addSpy).not.toHaveBeenCalled();
    unmount();
  });

  it('marks isDone once the server returns no more records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [] })));
    const { result, unmount } = mount('missing-el');
    result.fetch();
    await vi.waitFor(() => {
      expect(result.isDone.value).toBe(true);
    });
    expect(result.records.value).toEqual([]);
    unmount();
  });

  it('ignores fetch calls while already fetching or already done', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, unmount } = mount('missing-el');

    result.fetch();
    result.fetch(); // should be ignored: isFetching is already true
    await vi.waitFor(() => {
      expect(result.isDone.value).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    result.fetch(); // should be ignored: isDone is now true
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('records a network error and flags the store on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('NetworkError when attempting to fetch')));
    const { result, unmount } = mount('missing-el');
    const store = useBaseStore();
    result.fetch();
    await vi.waitFor(() => {
      expect(result.isFetching.value).toBe(false);
    });
    expect(result.errorMsg.value).toContain('NetworkError');
    expect(store.isNetworkError).toBe(true);
    expect(result.fetched.value).toBe(false);
    unmount();
  });

  it('records a non-network error without flagging the store', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const { result, unmount } = mount('missing-el');
    const store = useBaseStore();
    result.fetch();
    await vi.waitFor(() => {
      expect(result.isFetching.value).toBe(false);
    });
    expect(result.errorMsg.value).toBe('boom');
    expect(store.isNetworkError).toBe(false);
    unmount();
  });

  it('reset() clears state and offset, then refetches from the start', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [{ id: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, endpointBuilder, unmount } = mount('missing-el');
    result.fetch();
    await vi.waitFor(() => {
      expect(result.records.value).toEqual([{ id: 1 }]);
    });
    expect(endpointBuilder).toHaveBeenLastCalledWith(0, 50, 'id', OrderDirection.Desc);

    result.reset();
    await vi.waitFor(() => {
      expect(endpointBuilder).toHaveBeenCalledTimes(2);
    });
    // reset() re-fetches from offset 0 again, not the advanced offset from the first page.
    expect(endpointBuilder).toHaveBeenLastCalledWith(0, 50, 'id', OrderDirection.Desc);
    unmount();
  });

  it('scrolling near the bottom triggers another fetch while not done', async () => {
    const el = document.createElement('div');
    el.id = 'scroll-el';
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollTop', { value: 900, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [{ id: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, unmount } = mount();
    // Wait for the mount-triggered fetch to fully settle (isFetching back to false),
    // not just for the mock to have been called - fetch() guards against overlapping
    // calls, so dispatching while the first one is still in flight would be a no-op.
    await vi.waitFor(() => {
      expect(result.fetched.value).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    el.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    unmount();
  });

  it('does not fetch on scroll when not near the bottom', async () => {
    const el = document.createElement('div');
    el.id = 'scroll-el';
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [{ id: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = mount();
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    el.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('detaches the scroll listener on unmount', async () => {
    const el = document.createElement('div');
    el.id = 'scroll-el';
    document.body.appendChild(el);
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [] })));

    const { unmount } = mount();
    await Promise.resolve();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  describe('sort()', () => {
    it('switching to a new field sorts ascending and refetches by default', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [] }));
      vi.stubGlobal('fetch', fetchMock);
      const { result, endpointBuilder, unmount } = mount('missing-el');
      await Promise.resolve();

      result.sort('score');
      expect(result.sortField.value).toBe('score');
      expect(result.orderDirection.value).toBe(OrderDirection.Asc);
      await vi.waitFor(() => {
        expect(endpointBuilder).toHaveBeenLastCalledWith(0, 50, 'score', OrderDirection.Asc);
      });
      unmount();
    });

    it('re-sorting the same field toggles the direction', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', game_id: 0, records: [] })));
      const { result, unmount } = mount('missing-el', true, true);
      expect(result.orderDirection.value).toBe(OrderDirection.Desc);

      result.sort('id');
      expect(result.orderDirection.value).toBe(OrderDirection.Asc);

      result.sort('id');
      expect(result.orderDirection.value).toBe(OrderDirection.Desc);
      unmount();
    });

    it('sorts in place without refetching when doLocalSort is enabled', () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const { result, unmount } = mount('missing-el', true, true);
      result.records.value = [{ id: 3, score: 30 }, { id: 1, score: 10 }, { id: 2, score: undefined }];

      result.sort('score');
      expect(result.orderDirection.value).toBe(OrderDirection.Asc);
      // Ascending: undefined sorts first, then by numeric score.
      expect(result.records.value.map((r) => r.id)).toEqual([2, 1, 3]);
      expect(fetchMock).not.toHaveBeenCalled();

      result.sort('score');
      expect(result.orderDirection.value).toBe(OrderDirection.Desc);
      // Descending: undefined sorts last.
      expect(result.records.value.map((r) => r.id)).toEqual([3, 1, 2]);
      unmount();
    });

    it('covers every comparator branch directly, independent of engine sort-call order', () => {
      // Array.prototype.sort's internal comparator call pattern (including argument
      // order for a given pair) is engine/size-dependent, so relying on the resulting
      // order of a small fixture array can silently leave some comparator branches
      // untested - or hit them via the opposite argument order than intended. Capturing
      // the comparator function itself and calling it directly with exact, chosen (a, b)
      // pairs sidesteps that entirely.
      function captureComparator(sortCall: () => void): (a: Row, b: Row) => number {
        let comparator!: (a: Row, b: Row) => number;
        const originalSort = Array.prototype.sort;
        Array.prototype.sort = function (this: Row[], compareFn): Row[] {
          comparator = compareFn as (a: Row, b: Row) => number;
          return originalSort.call(this, compareFn) as Row[];
        };
        try {
          sortCall();
        } finally {
          Array.prototype.sort = originalSort;
        }
        return comparator;
      }

      const { result, unmount } = mount('missing-el', true, true);

      const ascending = captureComparator(() => { result.sort('score') });
      expect(ascending({ id: 1, score: undefined }, { id: 2, score: undefined })).toBe(0);
      expect(ascending({ id: 1, score: undefined }, { id: 2, score: 5 })).toBe(-1);
      expect(ascending({ id: 1, score: 5 }, { id: 2, score: undefined })).toBe(1);
      expect(ascending({ id: 1, score: 1 }, { id: 2, score: 2 })).toBe(-1);
      expect(ascending({ id: 1, score: 5 }, { id: 2, score: 3 })).toBe(1);
      expect(ascending({ id: 1, score: 5 }, { id: 2, score: 5 })).toBe(0);

      const descending = captureComparator(() => { result.sort('score') });
      expect(descending({ id: 1, score: undefined }, { id: 2, score: 5 })).toBe(1);
      expect(descending({ id: 1, score: 5 }, { id: 2, score: undefined })).toBe(-1);
      expect(descending({ id: 1, score: 1 }, { id: 2, score: 2 })).toBe(1);
      expect(descending({ id: 1, score: 5 }, { id: 2, score: 3 })).toBe(-1);

      unmount();
    });
  });

  describe('formatDate()', () => {
    it('returns an empty string for an undefined date', () => {
      const { result, unmount } = mount('missing-el');
      expect(result.formatDate(undefined)).toBe('');
      unmount();
    });

    it('formats a given date string', () => {
      const { result, unmount } = mount('missing-el');
      expect(result.formatDate('2024-01-15T10:30:00Z')).toMatch(/^2024-01-15 \d{2}:\d{2}:\d{2}$/);
      unmount();
    });
  });
});
