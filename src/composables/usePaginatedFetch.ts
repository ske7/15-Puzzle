import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useBaseStore } from '../stores/base';
import { useDateFormat } from '@vueuse/core';
import { useGetFetchAPI } from './useFetchAPI';
import { type Response } from '@/types';
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
  sort: (newSortField: string) => void;
  sortField: Ref<string>;
  orderDirection: Ref<OrderDirection>;
  attachScrollListener: (el: HTMLElement) => () => void;
}

export function usePaginatedFetch<T>(
  endpointBuilder: (
    offset: number,
    limit: number,
    sortField: string,
    orderDirection: OrderDirection
  ) => string,
  extractRecords: (response: Response) => T[],
  scrollElementId: string
): PaginatedFetchResult<T> {
  const baseStore = useBaseStore();
  const limit = 50;
  let offset = 0;

  const records = ref<T[]>([]) as Ref<T[]>;
  const errorMsg = ref('');
  const isFetching = ref(false);
  const fetched = ref(false);
  const isDone = ref(false);
  const sortField = ref('id');
  const orderDirection = ref<OrderDirection>(OrderDirection.Desc);

  const fetch = (): void => {
    if (isFetching.value || isDone.value) return;
    errorMsg.value = '';
    isFetching.value = true;

    const endpoint = endpointBuilder(offset, limit, sortField.value, orderDirection.value);

    useGetFetchAPI(endpoint, baseStore.token)
      .then(res => {
        isFetching.value = false;
        const newRecords = extractRecords(res);
        if (newRecords.length === 0) {
          isDone.value = true;
        } else {
          records.value.push(...newRecords);
          offset += limit;
        }
        fetched.value = true;
      })
      .catch((error: unknown) => {
        errorMsg.value = error as string;
        if (String(errorMsg.value).toLowerCase().includes('networkerror')) {
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

  const sort = (newSortField: string): void => {
    if (newSortField !== sortField.value) {
      sortField.value = newSortField;
      orderDirection.value = OrderDirection.Asc;
    } else if (orderDirection.value === OrderDirection.Asc) {
      orderDirection.value = OrderDirection.Desc;
    } else {
      orderDirection.value = OrderDirection.Asc;
    }
    reset();
  };

  const formatDate = (date?: string): string => {
    if (date == null) {
      return '';
    }
    return useDateFormat(date, 'YYYY-MM-DD HH:mm:ss').value;
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
      detachScroll = attachScrollListener(el);
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
    sort,
    sortField,
    orderDirection,
    attachScrollListener
  };
}
