import { onMounted, onBeforeUnmount } from 'vue';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';

export const useKeyDown = () => {
  const baseStore = useBaseStore();
  const eventBus = useEventBus<string>('event-bus');

  const onKeyDown = (event: KeyboardEvent) => {
    event.preventDefault();
    if (event.code === 'Space' && !baseStore.paused) {
      eventBus.emit('restart', baseStore.showWinModal ? 'fromKeyboard' : '');
      return;
    }
    if (baseStore.isDone || baseStore.paused) {
      return;
    }
    if (['ArrowLeft', 'KeyA', 'KeyJ'].includes(event.code)) {
      baseStore.moveLeft();
    } else if (['ArrowRight', 'KeyD', 'KeyL'].includes(event.code)) {
      baseStore.moveRight();
    } else if (['ArrowUp', 'KeyW', 'KeyI'].includes(event.code)) {
      baseStore.moveUp();
    } else if (['ArrowDown', 'KeyS', 'KeyK'].includes(event.code)) {
      baseStore.moveDown();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
};
