import { ref, type Ref } from 'vue';
import { useBaseStore } from '../stores/base';
import { getErrorMessage, useGetFetchAPI } from './useFetchAPI';
import { type Response } from '@/types';

interface SingleFetchResult<T> {
  data: Ref<T | undefined>;
  errorMsg: Ref<string>;
}

// Uses the store's isFetching, not a local ref: BottomInfoPanel also hides while it is set.
export function useSingleFetch<T>(endpoint: string, extractData: (res: Response) => T): SingleFetchResult<T> {
  const baseStore = useBaseStore();
  const errorMsg = ref('');
  const data = ref<T>();

  errorMsg.value = '';
  if (!baseStore.isFetching) {
    baseStore.isFetching = true;
    useGetFetchAPI(endpoint, baseStore.token)
      .then(res => {
        baseStore.isFetching = false;
        data.value = extractData(res);
      })
      .catch((error: unknown) => {
        errorMsg.value = getErrorMessage(error);
        if (errorMsg.value.toLowerCase().includes('networkerror')) {
          baseStore.isNetworkError = true;
        }
        baseStore.isFetching = false;
      });
  }

  return { data, errorMsg };
}
