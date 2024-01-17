import { ref, type Ref } from 'vue';
import { useBaseStore } from '../stores/base';
import {
  type GameData, type AverageStats, type WasAvgRecord,
  type UserScrambleData, type FMCBlitzData, type Response
} from '@/types';
import { usePostFetchAPI, usePatchFetchAPI } from '../composables/useFetchAPI';
import { FMC_BLITZ_TIME } from '@/const';

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
    .then((res: Response): void => {
      baseStore.lastGameID = res.public_id!;
      if (baseStore.proMode) {
        if (baseStore.numLines === 3 && res.opt_m != null) {
          baseStore.opt_m = res.opt_m;
        }
        usePostFetchAPI('update_stats', JSON.stringify({ game_id: res.game_id }) as BodyInit, baseStore.token, keyH)
          .then((res) => {
            baseStore.setCurrentAverages(res.stats as unknown as AverageStats);
            baseStore.setWasAvgRecords(res.was_avg_records as unknown as WasAvgRecord[]);
          }).catch(error => {
            errorMsg.value = error as string;
            isFetching.value = false;
          });
        if (baseStore.fmcBlitz && baseStore.solvedPuzzlesInMarathon === baseStore.blitzScrambleCount) {
          postFMCBlitz({
            moves: baseStore.blitzMovesCount,
            time: FMC_BLITZ_TIME * 1000 - baseStore.blitzTime,
            session_id: String(game.session_id)
          });
        }
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

export const postFMCBlitz = (data: FMCBlitzData): void => {
  const baseStore = useBaseStore();
  const { errorMsg, isFetching } = prepare();
  errorMsg.value = '';
  if (isFetching.value as boolean) {
    return;
  }
  isFetching.value = true;
  usePostFetchAPI('fmc_blitz', JSON.stringify({ data }) as BodyInit, baseStore.token)
    .then((_res) => {
      isFetching.value = false;
    })
    .catch(error => {
      errorMsg.value = error as string;
      isFetching.value = false;
    });
};
