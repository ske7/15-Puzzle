import { onMounted, onBeforeUnmount } from 'vue';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';
import { ControlType, cores } from '@/const';
import { convertToNumbersArray } from '@/utils';

export const useKeyDown = (): void => {
  const baseStore = useBaseStore();
  const eventBus = useEventBus<string>('event-bus');

  const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (!baseStore.showModal) {
      event.preventDefault();
    }
    const ctrlDown = event.ctrlKey || event.metaKey;
    if (event.code === 'Space' && !baseStore.paused) {
      if (ctrlDown) {
        baseStore.savedOrders = [];
      }
      eventBus.emit('restart', baseStore.showWinModal ? 'fromKeyboard' : '');
      return;
    }
    if (baseStore.playgroundMode && !baseStore.showAddScramble && ctrlDown && event.code === 'KeyV') {
      // not working in Firefox until dom.events.asyncClipboard.readText = true
      await navigator.clipboard.readText().then((text) => {
        const scramble = convertToNumbersArray(text);
        if (scramble.length > 0 && cores.includes(Math.sqrt(scramble.length))) {
          baseStore.numLines = Math.sqrt(scramble.length);
          baseStore.savedOrders = scramble;
          baseStore.checkUserScrambleInDB = true;
          baseStore.renewPuzzle();
        }
      });
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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.removeEventListener('keydown', onKeyDown);
  });
};
