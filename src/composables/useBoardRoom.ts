import { inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue';
import { useEventListener, useMutationObserver, useResizeObserver } from '@vueuse/core';

export const boardRoomKey: InjectionKey<Ref<number>> = Symbol('boardRoom');
const PAGE_PADDING = 5;

// The height the rest of the page leaves for the board. It holds still while isFrozen() is true,
// so the board never resizes in the middle of a solve.
export function provideBoardRoom(wrapper: Ref<HTMLElement | undefined>, isFrozen: () => boolean): Ref<number> {
  const room = ref(Infinity);
  provide(boardRoomKey, room);
  const children = ref<HTMLElement[]>([]);
  let measured = Infinity;

  const apply = (): void => {
    if (!isFrozen()) {
      room.value = measured;
    }
  };
  const measure = (): void => {
    if (wrapper.value != null) {
      measured = boardRoom(wrapper.value);
      apply();
    }
  };
  const collectChildren = (): void => {
    children.value = wrapper.value == null ? [] : [...wrapper.value.children] as HTMLElement[];
  };

  watch(wrapper, collectChildren, { flush: 'post' });
  useMutationObserver(wrapper, collectChildren, { childList: true });
  useResizeObserver(children, measure);
  useEventListener('resize', measure);
  watch(isFrozen, apply);
  return room;
}

export function useBoardRoom(): Ref<number> {
  return inject(boardRoomKey, () => ref(Infinity), true);
}

export function boardRoom(wrapper: HTMLElement): number {
  let top = Infinity;
  let bottom = -Infinity;
  let board = 0;
  for (const child of wrapper.children) {
    const style = getComputedStyle(child);
    if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') {
      continue;
    }
    const rect = child.getBoundingClientRect();
    top = Math.min(top, rect.top - Number.parseFloat(style.marginTop));
    bottom = Math.max(bottom, rect.bottom + Number.parseFloat(style.marginBottom));
    if (child.classList.contains('board')) {
      board = rect.height;
    }
  }
  return Math.floor(innerHeight - PAGE_PADDING - (bottom - top - board));
}
