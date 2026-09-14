import { inject, provide, type InjectionKey, type Ref } from 'vue';
import { useWindowSize } from '@vueuse/core';

const windowWidthKey: InjectionKey<Ref<number>> = Symbol('windowWidth');

export function provideWindowWidth(): Ref<number> {
  const { width } = useWindowSize();
  provide(windowWidthKey, width);
  return width;
}

export function useWindowWidth(): Ref<number> {
  return inject(windowWidthKey, () => useWindowSize().width, true);
}
