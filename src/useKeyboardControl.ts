import { onMounted, onBeforeUnmount } from 'vue';
import { useBaseStore } from './stores/base';
import { Direction } from './stores/const';
import { getArrayKeyByValue } from './utils';
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
    let newFreeElement: number | null = null;
    if (['ArrowRight', 'KeyD', 'KeyL'].includes(event.code)) {
      newFreeElement = baseStore.freeElement - 1;
      if (newFreeElement >= 0 && (newFreeElement + 1) % baseStore.numLines !== 0) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Right
        );
      }
    } else if (['ArrowLeft', 'KeyA', 'KeyJ'].includes(event.code)) {
      newFreeElement = baseStore.freeElement + 1;
      if (
        newFreeElement < baseStore.arrayLength &&
        (baseStore.freeElement + 1) % baseStore.numLines !== 0
      ) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Left
        );
      }
    } else if (['ArrowUp', 'KeyW', 'KeyI'].includes(event.code)) {
      newFreeElement = baseStore.freeElement + baseStore.numLines;
      if (newFreeElement < baseStore.arrayLength) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Up
        );
      }
    } else if (['ArrowDown', 'KeyS', 'KeyK'].includes(event.code)) {
      newFreeElement = baseStore.freeElement - baseStore.numLines;
      if (newFreeElement >= 0) {
        baseStore.saveActualOrder(
          getArrayKeyByValue(baseStore.actualOrders, newFreeElement),
          Direction.Down
        );
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
};
