import { ref } from 'vue';
import { useBaseStore } from '../stores/base';

export function useModalPause() {
  const baseStore = useBaseStore();
  const wasPausedBeforeOpen = ref(false);

  const open = (): void => {
    wasPausedBeforeOpen.value = baseStore.paused;
    if (!baseStore.paused && !baseStore.isDone) {
      baseStore.invertPaused();
    }
  };
  const close = (): void => {
    if (baseStore.paused && !wasPausedBeforeOpen.value) {
      baseStore.invertPaused();
    }
  };

  return { open, close };
}
