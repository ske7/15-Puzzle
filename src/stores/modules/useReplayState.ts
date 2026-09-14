import { ref, computed } from 'vue';
import { type RepGame } from '@/types';

export function useReplayState() {
  const replayMode = ref(false);
  const repGame = ref(null as unknown as RepGame);
  const inReplay = ref(false);
  const replaySpeed = ref(0);
  const wasReplay = ref(false);
  const marathonReplay = ref(false);
  const fastWalkMode = ref(localStorage.getItem('fastWalkMode') === 'true');

  const walkSpeed = computed((): number => {
    return fastWalkMode.value ? 50 : 200;
  });

  return {
    replayMode,
    repGame,
    inReplay,
    wasReplay,
    replaySpeed,
    marathonReplay,
    fastWalkMode,
    walkSpeed
  };
}
