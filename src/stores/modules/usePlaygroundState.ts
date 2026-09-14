import { usePuzzleState } from './usePuzzleState';
import { ref, computed, type Ref } from 'vue';
import { type UserScrambleData, type Response } from '@/types';
import { useGetFetchAPI } from '../../composables/useFetchAPI';

export function usePlaygroundState(
  token: Ref<string | undefined>,
  userName: Ref<string | undefined>,
  puzzle: ReturnType<typeof usePuzzleState>
) {
  const playgroundMode = ref(false);
  const savedOrders = ref<number[]>([]);
  const playgroundBestTime = ref(0);
  const playgroundBestTimeMoves = ref(0);
  const playgroundBestMoves = ref(0);
  const playgroundSolvePath = ref<string[]>([]);
  const playgroundCreatedAt = ref<string | undefined>(undefined);
  const userScrambleId = ref(0);
  const checkUserScrambleInDB = ref(false);
  const publicId = ref('');
  const otherUserName = ref('');

  function updatePlaygroundStats(res: Response<UserScrambleData>) {
    if (res.stats == null) {
      playgroundBestTime.value = 0;
      playgroundBestTimeMoves.value = 0;
      playgroundBestMoves.value = 0;
      playgroundSolvePath.value = [];
      publicId.value = '';
      userScrambleId.value = 0;
    } else {
      const stats = res.stats;
      if (stats.id != null) {
        userScrambleId.value = stats.id;
      }
      playgroundBestTime.value = stats.best_time ?? 0;
      playgroundBestTimeMoves.value = stats.best_time_moves ?? 0;
      playgroundBestMoves.value = stats.best_moves ?? 0;
      if (stats.solve_path !== undefined) {
        playgroundSolvePath.value = stats.solve_path.split('');
      }
      publicId.value = stats.public_id ?? '';
    }
  }

  function playgroundModeRenew() {
    savedOrders.value = puzzle.mixedOrders.value;
    if (checkUserScrambleInDB.value) {
      puzzle.opt_m.value = 0;
      if (token.value != null) {
        void useGetFetchAPI<UserScrambleData>(`user_scramble?scramble=${puzzle.mixedOrders.value.join(',')}`, token.value)
          .then((res) => {
            updatePlaygroundStats(res);
            if (res.opt_m != null) {
              puzzle.opt_m.value = res.opt_m;
            }
          })
          .catch((error: unknown) => {
            console.log(error);
          });
      }
      checkUserScrambleInDB.value = false;
    }
  }

  const sharedPlaygroundMode = computed((): boolean => {
    return playgroundMode.value &&
      publicId.value !== '' &&
      userName.value != null &&
      otherUserName.value !== '' &&
      userName.value !== otherUserName.value;
  });

  return {
    playgroundMode,
    savedOrders,
    playgroundBestTime,
    playgroundBestTimeMoves,
    playgroundBestMoves,
    playgroundSolvePath,
    playgroundCreatedAt,
    userScrambleId,
    checkUserScrambleInDB,
    publicId,
    otherUserName,
    updatePlaygroundStats,
    playgroundModeRenew,
    sharedPlaygroundMode
  };
}
