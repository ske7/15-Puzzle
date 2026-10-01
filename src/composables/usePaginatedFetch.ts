import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useBaseStore } from '../stores/base';
import { useDateFormat } from '@vueuse/core';
import { getErrorMessage, useGetFetchAPI } from './useFetchAPI';
import { type Response, type UserRecord, type UserStats } from '@/types';
import { OrderDirection } from '@/const';

interface PaginatedFetchResult<T> {
  records: Ref<T[]>;
  errorMsg: Ref<string>;
  isFetching: Ref<boolean>;
  fetched: Ref<boolean>;
  isDone: Ref<boolean>;
  fetch: () => void;
  reset: () => void;
  formatDate: (date?: string) => string;
  formatShortDate: (date?: string) => string;
  columnClass: (label: string) => string;
  sort: (newSortField: string) => void;
  sortArrow: (field: string, invert?: boolean) => string;
  sortField: Ref<string>;
  orderDirection: Ref<OrderDirection>;
  attachScrollListener: (el: HTMLElement) => () => void;
}

export function usePaginatedFetch<T, TRecord = UserRecord>(
  endpointBuilder: (
    offset: number,
    limit: number,
    sortField: string,
    orderDirection: OrderDirection
  ) => string,
  extractRecords: (response: Response<UserStats, TRecord>) => T[],
  scrollElementId: string,
  atachScroll = true,
  doLocalSort = false,
  limit = 50
): PaginatedFetchResult<T> {
  const baseStore = useBaseStore();
  let offset = 0;

  const records = ref<T[]>([]) as Ref<T[]>;
  const errorMsg = ref('');
  const isFetching = ref(false);
  const fetched = ref(false);
  const isDone = ref(false);
  const sortField = ref('id');
  const orderDirection = ref(OrderDirection.Desc);

  const fetch = (): void => {
    if (isFetching.value || isDone.value) return;
    errorMsg.value = '';
    isFetching.value = true;

    const endpoint = endpointBuilder(offset, limit, sortField.value, orderDirection.value);

    useGetFetchAPI<UserStats, TRecord>(endpoint, baseStore.token)
      .then(res => {
        isFetching.value = false;
        const newRecords = extractRecords(res);
        if (newRecords.length === 0) {
          isDone.value = true;
        } else {
          records.value.push(...newRecords);
          offset += limit;
          // A server ignoring offset/limit answers every page with the whole list, so stop
          // after the first one instead of appending the same records again.
          isDone.value = newRecords.length > limit;
        }
        fetched.value = true;
      })
      .catch((error: unknown) => {
        errorMsg.value = getErrorMessage(error);
        if (errorMsg.value.toLowerCase().includes('networkerror')) {
          baseStore.isNetworkError = true;
        }
        isFetching.value = false;
      });
  };

  const reset = (): void => {
    offset = 0;
    records.value = [];
    fetched.value = false;
    isDone.value = false;
    fetch();
  };

  const localSort = (): void => {
    const field = sortField.value as keyof T;
    const direction = orderDirection.value;

    records.value.sort((a: T, b: T) => {
      const aValue = a?.[field];
      const bValue = b?.[field];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === OrderDirection.Asc ? -1 : 1;
      if (bValue == null) return direction === OrderDirection.Asc ? 1 : -1;

      if (Number(aValue) < Number(bValue)) return direction === OrderDirection.Asc ? -1 : 1;
      if (Number(aValue) > Number(bValue)) return direction === OrderDirection.Asc ? 1 : -1;
      return 0;
    });
  };

  const sort = (newSortField: string): void => {
    if (newSortField !== sortField.value) {
      sortField.value = newSortField;
      orderDirection.value = OrderDirection.Asc;
    } else if (orderDirection.value === OrderDirection.Asc) {
      orderDirection.value = OrderDirection.Desc;
    } else {
      orderDirection.value = OrderDirection.Asc;
    }
    if (doLocalSort) {
      localSort();
    } else {
      reset();
    }
  };

  const sortArrow = (field: string, invert = false): string => {
    if (sortField.value !== field) {
      return '↑↓';
    }
    return (orderDirection.value === OrderDirection.Asc) !== invert ? '↑' : '↓';
  };

  const formatDate = (date?: string): string => {
    return formatAs(date, 'YYYY-MM-DD HH:mm:ss');
  };

  // "29/09/26 18:15:25", which wraps into date over time in a phone's narrow date column.
  const formatShortDate = (date?: string): string => {
    return formatAs(date, 'DD/MM/YY HH:mm:ss');
  };

  function formatAs(date: string | undefined, pattern: string): string {
    if (date == null) {
      return '';
    }
    return useDateFormat(date, pattern).value;
  }

  // "Opt.diff" -> "col-opt-diff", "Public ID" -> "col-public-id": styles a column's header and cells together.
  const columnClass = (label: string): string => {
    return `col-${label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`;
  };

  function attachScrollListener(el: HTMLElement): () => void {
    const onscroll = (_event: Event): void => {
      if (!isDone.value && el.scrollTop + el.offsetHeight >= el.scrollHeight - 100) {
        fetch();
      }
    };
    el.addEventListener('scroll', onscroll);
    return () => { el.removeEventListener('scroll', onscroll) };
  }

  let detachScroll: (() => void) | null = null;

  onMounted(() => {
    const el = document.getElementById(scrollElementId);
    if (el != null) {
      fetch();
      if (atachScroll) {
        detachScroll = attachScrollListener(el);
      }
    }
  });
  onUnmounted(() => {
    if (detachScroll != null) {
      detachScroll();
      detachScroll = null;
    }
  });

  return {
    records,
    errorMsg,
    isFetching,
    fetched,
    isDone,
    fetch,
    reset,
    formatDate,
    formatShortDate,
    columnClass,
    sort,
    sortArrow,
    sortField,
    orderDirection,
    attachScrollListener
  };
}
