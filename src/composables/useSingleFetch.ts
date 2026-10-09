import { ref, type Ref } from 'vue';
import { useBaseStore } from '../stores/base';
import { getErrorMessage, useGetFetchAPI } from './useFetchAPI';
import { type Response } from '@/types';

interface SingleFetchResult<T> {
  data: Ref<T | undefined>;
  errorMsg: Ref<string>;
}

// Uses the store's isFetching, not a local ref: BottomInfoPanel also hides while it is set.
// A public fetch opens over another modal, which must not hide, and needs no token.
export function useSingleFetch<T>(endpoint: string, extractData: (res: Response) => T, isPublic = false): SingleFetchResult<T> {
  const baseStore = useBaseStore();
  const errorMsg = ref('');
  const data = ref<T>();

  const setFetching = (value: boolean): void => {
    if (!isPublic) {
      baseStore.isFetching = value;
    }
  };

  if (isPublic || !baseStore.isFetching) {
    setFetching(true);
    useGetFetchAPI(endpoint, isPublic ? undefined : baseStore.token)
      .then(res => {
        setFetching(false);
        data.value = extractData(res);
      })
      .catch((error: unknown) => {
        errorMsg.value = getErrorMessage(error);
        if (errorMsg.value.toLowerCase().includes('networkerror')) {
          baseStore.isNetworkError = true;
        }
        setFetching(false);
      });
  }

  return { data, errorMsg };
}
