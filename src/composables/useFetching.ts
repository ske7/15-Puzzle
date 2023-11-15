import { ref, type Ref } from 'vue';
import { useBaseStore } from '../stores/base';
import { type GameData, type AverageStats, type WasAvgRecord, type UserScrambleData } from '@/types';
import { usePostFetchAPI, usePatchFetchAPI } from '../composables/useFetchAPI';

const prepare = (): Record<string, Ref<string | boolean>> => {
  const errorMsg = ref('');
  const isFetching = ref(false);

  return { errorMsg, isFetching };
};

export const postGame = (game: GameData, keyH: string): void => {
  const baseStore = useBaseStore();
  const { errorMsg, isFetching } = prepare();
  errorMsg.value = '';
  if (isFetching.value as boolean) {
    return;
  }
  isFetching.value = true;
  usePostFetchAPI('game', JSON.stringify({ game }) as BodyInit, baseStore.token, keyH)
    .then((res) => {
      baseStore.lastGameID = res.game_id ?? 0;
      if (baseStore.proMode) {
        baseStore.setCurrentAverages(res.stats as unknown as AverageStats);
        baseStore.setWasAvgRecords(res.was_avg_records as unknown as WasAvgRecord[]);
      }
      isFetching.value = false;
    })
    .catch(error => {
      errorMsg.value = error as string;
      isFetching.value = false;
    });
};

export const postUserScramble = async (user_scramble: UserScrambleData): Promise<void> => {
  const baseStore = useBaseStore();
  const { errorMsg, isFetching } = prepare();
  errorMsg.value = '';
  if (isFetching.value as boolean) {
    return;
  }
  isFetching.value = true;
  await usePostFetchAPI('user_scramble', JSON.stringify({ user_scramble }) as BodyInit, baseStore.token)
    .then((res) => {
      baseStore.userScrambleId = res.user_scramble_id!;
      isFetching.value = false;
    })
    .catch(error => {
      errorMsg.value = error as string;
      isFetching.value = false;
    });
};

export const patchUserScramble = (user_scramble: UserScrambleData): void => {
  const baseStore = useBaseStore();
  const { errorMsg, isFetching } = prepare();
  errorMsg.value = '';
  if (isFetching.value as boolean) {
    return;
  }
  isFetching.value = true;
  usePatchFetchAPI('user_scramble', JSON.stringify({ user_scramble }) as BodyInit, baseStore.token)
    .then((_res) => {
      isFetching.value = false;
    })
    .catch(error => {
      errorMsg.value = error as string;
      isFetching.value = false;
    });
};
