import { useBaseStore } from '../stores/base';
import {
  type GameData, type AverageStats, type UserScrambleData, type FMCBlitzData, type Response
} from '@/types';
import { getErrorMessage, usePostFetchAPI, usePatchFetchAPI } from './useFetchAPI';
import { FMC_BLITZ_TIME } from '@/const';

const reportFailure = (failureMessage: string, request: Promise<unknown>): Promise<void> => {
  return request
    .then(() => undefined)
    .catch((error: unknown) => {
      useBaseStore().lastError = failureMessage;
      console.log(getErrorMessage(error));
    });
};

export const postFMCBlitz = (data: FMCBlitzData): void => {
  const baseStore = useBaseStore();
  void reportFailure('Could not save your blitz result',
    usePostFetchAPI('fmc_blitz', JSON.stringify({ data }), baseStore.token));
};

export const postGame = (game: GameData, keyH: string): void => {
  const baseStore = useBaseStore();
  void reportFailure('Could not save your last solve',
    usePostFetchAPI('game', JSON.stringify({ game }), baseStore.token, keyH)
      .then((res: Response): void => {
        if (res.public_id != null) {
          baseStore.lastGameID = res.public_id;
        }
        if (!baseStore.proMode) {
          return;
        }
        if (baseStore.numLines === 3 && res.opt_m != null) {
          baseStore.opt_m = res.opt_m;
        }
        void usePostFetchAPI<AverageStats>('update_stats', JSON.stringify({ game_id: res.game_id }), baseStore.token, keyH)
          .then((statsRes) => {
            baseStore.setCurrentAverages(statsRes.stats);
            baseStore.setWasAvgRecords(statsRes.was_avg_records);
          })
          .catch((error: unknown) => {
            baseStore.lastError = 'Could not update your averages';
            console.log(getErrorMessage(error));
          });
        if (baseStore.fmcBlitz && baseStore.solvedPuzzlesInMarathon === baseStore.blitzScrambleCount) {
          postFMCBlitz({
            moves: baseStore.blitzMovesCount,
            time: FMC_BLITZ_TIME * 1000 - baseStore.blitzTime,
            session_id: String(game.session_id)
          });
        }
      }));
};

export const postUserScramble = async (user_scramble: UserScrambleData): Promise<void> => {
  const baseStore = useBaseStore();
  await reportFailure('Could not save the scramble',
    usePostFetchAPI('user_scramble', JSON.stringify({ user_scramble }), baseStore.token)
      .then((res: Response) => {
        baseStore.userScrambleId = res.user_scramble_id ?? 0;
      }));
};

export const patchUserScramble = (user_scramble: UserScrambleData): void => {
  const baseStore = useBaseStore();
  void reportFailure('Could not update the scramble',
    usePatchFetchAPI('user_scramble', JSON.stringify({ user_scramble }), baseStore.token));
};
