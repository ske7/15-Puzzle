import { onClickOutside, type MaybeComputedElementRef } from '@vueuse/core';

export function useCloseOnClickOutside(
  el: MaybeComputedElementRef,
  onClose: () => void,
  guard?: () => boolean
): void {
  onClickOutside(el, (event) => {
    if (guard?.()) {
      return;
    }
    event.stopPropagation();
    onClose();
  });
}
