import { displayedTime } from '../../utils';
import { FMC_BLITZ_TIME } from '@/const';
import { ref, computed } from 'vue';

export function useMarathonState() {
  const marathonMode = ref(localStorage.getItem('marathonMode') === 'true');
  const solvedPuzzlesInMarathon = ref(0);
  const marathonScrambles = ref('');
  const marathonSolves = ref('');
  const fmcBlitz = ref(localStorage.getItem('fmcBlitz') === 'true');
  const blitzScrambleCount = ref(0);
  const blitzMovesCount = ref(0);
  const startBlitzTime = ref(0);
  const blitzTime = ref(0);
  const blitzInterval = ref(0);
  const isTimeFailed = ref(false);
  const marathonFirstMove = ref(false);

  function clearMarathonData() {
    marathonScrambles.value = '';
    marathonSolves.value = '';
  }

  function stopBlitzInterval() {
    clearInterval(blitzInterval.value);
    blitzInterval.value = 0;
    if (blitzTime.value < 0) {
      blitzTime.value = 0;
    }
  }

  const blitzTimeStr = computed((): string => {
    if (blitzTime.value < 0) {
      return '0';
    }
    const longMode = !(solvedPuzzlesInMarathon.value === 0 && blitzTime.value === 0);
    return solvedPuzzlesInMarathon.value === 0 && blitzTime.value === 0
      ? FMC_BLITZ_TIME.toString()
      : displayedTime(blitzTime.value, longMode);
  });

  return {
    marathonMode,
    solvedPuzzlesInMarathon,
    marathonScrambles,
    marathonSolves,
    marathonFirstMove,
    fmcBlitz,
    blitzScrambleCount,
    blitzMovesCount,
    isTimeFailed,
    clearMarathonData,
    getFMCBlitzScrambleCount,
    blitzTime,
    blitzInterval,
    startBlitzTime,
    stopBlitzInterval,
    blitzTimeStr
  };
}

function getFMCBlitzScrambleCount(numLines: number): number {
  let res: number;
  switch (numLines) {
    case 3:
      res = 50;
      break;
    case 5:
      res = 5;
      break;
    default:
      res = 12;
      break;
  }
  return res;
}
