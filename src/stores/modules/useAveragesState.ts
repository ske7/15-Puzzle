import { ref, type Ref } from 'vue';
import { type AverageData, type AverageStats, type AveragePrefix, type WasAvgRecord } from '@/types';

const AVERAGE_TYPES = [
  { code: -1, prefix: 'aoS', g1000Only: false },
  { code: 5, prefix: 'ao5', g1000Only: false },
  { code: 12, prefix: 'ao12', g1000Only: false },
  { code: 50, prefix: 'ao50', g1000Only: false },
  { code: 100, prefix: 'ao100', g1000Only: false },
  { code: 1000, prefix: 'ao1000', g1000Only: true }
] as const satisfies readonly { code: number; prefix: AveragePrefix; g1000Only: boolean }[];

export function useAveragesState(g1000Mode: Ref<boolean>, numLines: Ref<number>, token: Ref<string | undefined>,
  consecutiveSolves: Ref<number>) {
  const currentAverages = ref<AverageData[]>([]);
  const prevAverages = ref<AverageData[]>([]);
  const wasAvgRecords = ref<WasAvgRecord[]>([]);

  function setCurrentAverages(stats?: AverageStats, clearPrev = false): void {
    if (clearPrev) {
      prevAverages.value = [];
    } else {
      prevAverages.value = currentAverages.value;
    }
    currentAverages.value = [];
    if (token.value == null) {
      return;
    }
    for (const { code, prefix, g1000Only } of AVERAGE_TYPES) {
      if (g1000Only && !g1000Mode.value) {
        continue;
      }
      currentAverages.value.push({
        code,
        puzzle_size: numLines.value,
        time: stats?.[`${prefix}t`],
        moves: stats?.[`${prefix}m`],
        tps: stats?.[`${prefix}tps`]
      });
    }
  }

  function setWasAvgRecords(records?: WasAvgRecord[]): void {
    if (records == null) {
      wasAvgRecords.value = [];
    } else {
      wasAvgRecords.value = records;
    }
  }

  function incConsecutiveSolves(): void {
    consecutiveSolves.value += 1;
  }

  function resetConsecutiveSolves(): void {
    consecutiveSolves.value = 0;
    setCurrentAverages({} satisfies AverageStats, true);
    setWasAvgRecords([]);
  }

  return {
    currentAverages,
    prevAverages,
    wasAvgRecords,
    setCurrentAverages,
    setWasAvgRecords,
    incConsecutiveSolves,
    resetConsecutiveSolves
  };
}
