import { onMounted, onBeforeUnmount } from 'vue';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';
import { ControlType, cores } from '@/const';

export const useKeyDown = (): void => {
  const baseStore = useBaseStore();
  const eventBus = useEventBus<string>('event-bus');

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!baseStore.showModal) {
      event.preventDefault();
    }
    if (event.code === 'Space' && !baseStore.paused) {
      eventBus.emit('restart', baseStore.showWinModal ? 'fromKeyboard' : '');
      return;
    }
    if (!baseStore.showModal && !baseStore.cageMode && !baseStore.replayMode) {
      if (event.code === 'PageUp') {
        if (baseStore.numLines === cores.slice(-1)[0]) {
          return;
        }
        baseStore.numLines += 1;
        baseStore.initAfterNewPuzzleSize();
        return;
      }
      if (event.code === 'PageDown') {
        if (baseStore.numLines === cores[0]) {
          return;
        }
        baseStore.numLines -= 1;
        baseStore.initAfterNewPuzzleSize();
        return;
      }
    }

    if (baseStore.isDone || baseStore.paused || baseStore.inReplay) {
      return;
    }
    if (['ArrowLeft', 'KeyA', 'KeyJ'].includes(event.code)) {
      baseStore.moveLeft(ControlType.Keyboard);
    } else if (['ArrowRight', 'KeyD', 'KeyL'].includes(event.code)) {
      baseStore.moveRight(ControlType.Keyboard);
    } else if (['ArrowUp', 'KeyW', 'KeyI'].includes(event.code)) {
      baseStore.moveUp(ControlType.Keyboard);
    } else if (['ArrowDown', 'KeyS', 'KeyK'].includes(event.code)) {
      baseStore.moveDown(ControlType.Keyboard);
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
};
