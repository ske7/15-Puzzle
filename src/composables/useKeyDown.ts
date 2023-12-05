import { onMounted, onBeforeUnmount } from 'vue';
import { useBaseStore } from '../stores/base';
import { useEventBus } from '@vueuse/core';
import { ControlType, cores } from '@/const';
import { convertToNumbersArray } from '@/utils';

export const useKeyDown = (): void => {
  const baseStore = useBaseStore();
  const eventBus = useEventBus<string>('event-bus');

  const listenEscKey = (code: string): boolean => {
    if (baseStore.resetUnsolvedPuzzleWithEsc && code === 'Escape' && !baseStore.paused) {
      eventBus.emit('restart', baseStore.showWinModal ? 'fromKeyboard' : '');
      return true;
    }
    return false;
  };

  const listenSpaceKey = (ctrlDown: boolean, code: string): boolean => {
    if (code === 'Space' && !baseStore.paused) {
      if (ctrlDown) {
        baseStore.savedOrders = [];
      }
      if (!baseStore.resetUnsolvedPuzzleWithEsc || baseStore.isDone) {
        eventBus.emit('restart', baseStore.showWinModal ? 'fromKeyboard' : '');
      }
      return true;
    }
    return false;
  };

  const listenCtrlVKey = async (ctrlDown: boolean, code: string): Promise<boolean> => {
    if (baseStore.playgroundMode && !baseStore.sharedPlaygroundMode && !baseStore.showModal && ctrlDown && code === 'KeyV') {
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
      return true;
    }
    return false;
  };

  const listenChangePuzzleSize = (code: string): boolean => {
    if (!baseStore.showModal && !baseStore.cageMode && !baseStore.replayMode && !baseStore.sharedPlaygroundMode) {
      if (code === 'PageUp') {
        if (baseStore.numLines === cores.slice(-1)[0]) {
          return false;
        }
        baseStore.numLines += 1;
        baseStore.initAfterNewPuzzleSize();
        return true;
      } else if (code === 'PageDown') {
        if (baseStore.numLines === cores[0]) {
          return false;
        }
        baseStore.numLines -= 1;
        baseStore.initAfterNewPuzzleSize();
        return true;
      }
    }
    return false;
  };

  const listenMovementKeys = (code: string): void => {
    if (['ArrowLeft', 'KeyA', 'KeyJ'].includes(code)) {
      baseStore.moveLeft(ControlType.Keyboard);
    } else if (['ArrowRight', 'KeyD', 'KeyL'].includes(code)) {
      baseStore.moveRight(ControlType.Keyboard);
    } else if (['ArrowUp', 'KeyW', 'KeyI'].includes(code)) {
      baseStore.moveUp(ControlType.Keyboard);
    } else if (['ArrowDown', 'KeyS', 'KeyK'].includes(code)) {
      baseStore.moveDown(ControlType.Keyboard);
    }
  };

  const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (!baseStore.showModal) {
      event.preventDefault();
    }
    if (listenEscKey(event.code)) {
      return;
    }
    const ctrlDown = event.ctrlKey || event.metaKey;
    if (listenSpaceKey(ctrlDown, event.code)) {
      return;
    }
    if (await listenCtrlVKey(ctrlDown, event.code)) {
      return;
    }
    if (listenChangePuzzleSize(event.code)) {
      return;
    }
    if (baseStore.isDone || baseStore.paused || baseStore.inReplay ||
      baseStore.sharedPlaygroundMode || baseStore.marathonReplay) {
      return;
    }
    listenMovementKeys(event.code);
  };

  onMounted(() => {
    window.addEventListener('keydown', (event) => {
      void onKeyDown(event);
    });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', (event) => {
      void onKeyDown(event);
    });
  });
};
