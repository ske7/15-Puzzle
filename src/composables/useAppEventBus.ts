import { useEventBus, type UseEventBusReturn } from '@vueuse/core';

export type AppEvent = 'restart' | 'walk' | 'show-image-gallery';

export type RestartSource = 'fromConfig' | 'fromKeyboard' | '';

export function useAppEventBus(): UseEventBusReturn<AppEvent, RestartSource> {
  return useEventBus<AppEvent, RestartSource>('event-bus');
}
