import { watchEffect } from 'vue';
import { useBaseStore } from '../stores/base';

export const useTheme = (): void => {
  const baseStore = useBaseStore();

  watchEffect(() => {
    document.documentElement.dataset['theme'] = baseStore.darkMode ? 'dark' : 'light';
  });
};
