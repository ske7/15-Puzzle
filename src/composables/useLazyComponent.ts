import { defineAsyncComponent, type Component } from 'vue';

const LAZY_LOAD_DELAY = 150;

export function useLazyComponent<T extends Component>(loader: () => Promise<{ default: T }>): T {
  return defineAsyncComponent({
    loader,
    delay: LAZY_LOAD_DELAY
  });
}
