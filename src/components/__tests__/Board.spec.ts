import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board from '../Board.vue';
import { useBaseStore } from '../../stores/base';
import { canMoveStatic } from '../../composables/useCanMoveStatic';
import { loadCageImages } from '../../../tests/cageImages';
import { ControlType } from '@/const';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
}

// A real, solved 3x3 board.
function setup3x3Solved() {
  const store = useBaseStore();
  store.numLines = 3;
  store.spaceBetween = 8;
  store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  store.boardPos = { left: 0, top: 0, right: 2000, bottom: 2000 };
  return store;
}

let currentWrapper: ReturnType<typeof mount> | undefined;

function mountBoard() {
  currentWrapper = mount(Board);
  return currentWrapper;
}

interface BoardInternals {
  squareSize: number;
  boxShadow: string;
  hideWhenCageShowCageCompleteImg: boolean;
  showProBoard: boolean;
  boardSize: string;
  borderRadiusVar: string;
  position: { left: number };
}

function internals(wrapper: ReturnType<typeof mountBoard>): BoardInternals {
  return wrapper.vm as unknown as BoardInternals;
}

describe('Board', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setWidth(1024);
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
  });

  describe('boxShadow', () => {
    it('is none in pro mode', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      const wrapper = mountBoard();
      expect(internals(wrapper).boxShadow).toBe('none');
    });

    it('uses the dark-mode shadow outside pro mode in dark mode', () => {
      const store = setup3x3Solved();
      store.proMode = false;
      store.darkMode = true;
      const wrapper = mountBoard();
      expect(internals(wrapper).boxShadow).toContain('board-shadow-color');
    });

    it('uses the light-mode shadow outside pro mode and dark mode', () => {
      const store = setup3x3Solved();
      store.proMode = false;
      store.darkMode = false;
      const wrapper = mountBoard();
      expect(internals(wrapper).boxShadow).toBe('0px 3px 10px var(--board-shadow-color)');
    });
  });

  describe('board geometry', () => {
    it('sizes the board from the real square size, spacing, and puzzle size', () => {
      const store = setup3x3Solved();
      const wrapper = mountBoard();
      const squareSize = internals(wrapper).squareSize;
      expect(internals(wrapper).boardSize).toBe(store.boardSize(squareSize));
    });

    it('has an 8px border radius', () => {
      setup3x3Solved();
      const wrapper = mountBoard();
      expect(internals(wrapper).borderRadiusVar).toBe('8px');
    });

    it('records the board position once its measured bounds change', async () => {
      setup3x3Solved();
      const wrapper = mountBoard();
      // useElementBounding never fires a real change in jsdom (no real layout) - drive
      // its own reactive position object directly, the same way a real resize would.
      Object.assign(internals(wrapper).position, { left: 10, top: 20, right: 410, bottom: 420 });
      await vi.waitFor(() => {
        expect(useBaseStore().boardPos).toEqual({ left: 10, top: 20, right: 410, bottom: 420 });
      });
    });
  });

  describe('square rendering', () => {
    it('renders a real Square per tile outside pro mode', () => {
      setup3x3Solved();
      const wrapper = mountBoard();
      // The blank tile itself renders nothing outside cage mode, so 8 of the 9 slots
      // produce a visible .square.
      expect(wrapper.findAll('.square')).toHaveLength(8);
      expect(wrapper.findAll('.p-container')).toHaveLength(1);
    });

    it('switches to the single pro board canvas in pro mode outside replay/playground', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      const wrapper = mountBoard();
      expect(internals(wrapper).showProBoard).toBe(true);
      // One canvas for the whole board, not one per tile.
      expect(wrapper.findAll('canvas')).toHaveLength(1);
      expect(wrapper.findAll('.square')).toHaveLength(0);
    });

    it('renders plain Square tiles even in pro mode during replay', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      store.replayMode = true;
      const wrapper = mountBoard();
      expect(internals(wrapper).showProBoard).toBe(false);
      expect(wrapper.findAll('canvas')).toHaveLength(0);
    });
  });

  describe('paused veil', () => {
    it('shows a paused message when paused and not done', () => {
      const store = setup3x3Solved();
      store.paused = true;
      const wrapper = mountBoard();
      expect(wrapper.find('.paused-veil').text()).toContain('Paused');
      expect(wrapper.find('.paused-veil').text()).toContain('Click to resume');
    });

    it('resumes on clicking the veil', async () => {
      const store = setup3x3Solved();
      store.paused = true;
      const wrapper = mountBoard();
      await wrapper.find('.paused-veil').trigger('click');
      expect(store.paused).toBe(false);
    });

    it('hides the veil once the puzzle is done, even while paused', () => {
      const store = setup3x3Solved();
      store.paused = true;
      store.inPlaceCount = 8;
      const wrapper = mountBoard();
      expect(wrapper.find('.paused-veil').exists()).toBe(false);
    });

    it('shows a loading message in cage mode before all cage images finish loading', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      const wrapper = mountBoard();
      expect(wrapper.find('.paused-veil').text()).toContain('Loading...');
      expect(wrapper.find('.paused-veil').text()).not.toContain('Paused');
    });

    it('unpauses automatically once all cage images finish loading', async () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.paused = true;
      loadCageImages(store, 8);
      mountBoard();
      // The watcher only reacts to a change, not the initial value - the last of the
      // 9 (numLines ** 2) tile images finishing loading is what should unpause it.
      loadCageImages(store);
      await vi.waitFor(() => {
        expect(store.paused).toBe(false);
      });
    });

    it('leaves paused untouched when a new cage picture starts loading', async () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.cagePath = '01-joe';
      loadCageImages(store);
      mountBoard();
      store.paused = true;
      store.cagePath = '02-primal';
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.paused).toBe(true);
    });
  });

  describe('puzzle-size selector', () => {
    it('lists the standard puzzle sizes and highlights the current one', () => {
      setup3x3Solved();
      const wrapper = mountBoard();
      const spans = wrapper.findAll('.puzzle-sizes span');
      expect(spans.map((s) => s.text())).toEqual(['3', '4', '5', '6', '7', '8']);
      expect(spans[0].classes()).toContain('selected');
    });

    it('lists only the fmc-blitz puzzle sizes in fmc blitz mode', () => {
      const store = setup3x3Solved();
      store.fmcBlitz = true;
      const wrapper = mountBoard();
      const spans = wrapper.findAll('.puzzle-sizes span');
      expect(spans.map((s) => s.text())).toEqual(['3', '4', '5']);
    });

    it('changes the puzzle size and reinitializes on click', async () => {
      const store = setup3x3Solved();
      const initSpy = vi.spyOn(store, 'initAfterNewPuzzleSize').mockImplementation(() => undefined);
      const wrapper = mountBoard();
      const spans = wrapper.findAll('.puzzle-sizes span');
      await spans[2].trigger('click'); // '5'
      expect(store.numLines).toBe(5);
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('hides the selector during replay', () => {
      const store = setup3x3Solved();
      store.replayMode = true;
      const wrapper = mountBoard();
      expect(wrapper.find('.puzzle-sizes').exists()).toBe(false);
    });

    it('hides the selector in cage mode', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      const wrapper = mountBoard();
      expect(wrapper.find('.puzzle-sizes').exists()).toBe(false);
    });
  });

  describe('cage completion image', () => {
    it('shows the completion image once done in cage mode, after the animation and image load', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.inPlaceCount = 8;
      store.afterDoneCount = 8;
      store.proMode = false;
      store.cageCompleteImgLoaded = true;
      const wrapper = mountBoard();
      expect(internals(wrapper).hideWhenCageShowCageCompleteImg).toBe(true);
      const img = wrapper.find('.complete-cage');
      expect(img.exists()).toBe(true);
      expect(img.isVisible()).toBe(true);
    });

    it('marks the completion image loaded once it fires the load event', async () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.inPlaceCount = 8;
      const wrapper = mountBoard();
      await wrapper.find('.complete-cage').trigger('load');
      expect(store.cageCompleteImgLoaded).toBe(true);
    });
  });

  describe('pro-mode pointer drag', () => {
    // Hit-testing is coordinate math now, so a drag is expressed as real client
    // coordinates instead of stubbing elementFromPoint onto a tile element.
    function centreOf(sid: number, squareSize: number) {
      const move = canMoveStatic(sid, squareSize);
      return { x: move.calculatedLeft + squareSize / 2, y: move.calculatedTop + squareSize / 2 };
    }

    function drag(wrapper: ReturnType<typeof mountBoard>, from: { x: number; y: number },
      ...through: { x: number; y: number }[]): void {
      const el = wrapper.find('.p-container').element;
      const send = (type: string, p: { x: number; y: number }) => {
        el.dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }),
          { clientX: p.x, clientY: p.y, pointerId: 1, pointerType: 'touch' }));
      };
      send('pointerdown', from);
      for (const point of through) {
        send('pointermove', point);
      }
    }

    function proBoard(orders?: number[]) {
      const store = setup3x3Solved();
      store.proMode = true;
      store.hoverOnControl = true;
      if (orders) {
        store.currentOrders = orders;
      }
      return store;
    }

    it.each([
      { name: 'right', orders: undefined, target: 8, expected: [1, 2, 3, 4, 5, 6, 7, 0, 8] },
      { name: 'left', orders: [1, 2, 3, 4, 5, 6, 0, 7, 8], target: 8, expected: [1, 2, 3, 4, 5, 6, 7, 0, 8] },
      { name: 'up', orders: undefined, target: 6, expected: [1, 2, 3, 4, 5, 0, 7, 8, 6] },
      { name: 'down', orders: [1, 2, 0, 4, 5, 6, 7, 8, 3], target: 6, expected: [1, 2, 6, 4, 5, 0, 7, 8, 3] }
    ])('slides an adjacent tile $name into the blank', ({ orders, target, expected }) => {
      const store = proBoard(orders);
      const wrapper = mountBoard();
      const squareSize = internals(wrapper).squareSize;

      drag(wrapper, centreOf(9, squareSize), centreOf(target, squareSize));

      expect(store.movesCount).toBe(1);
      expect(store.currentOrders).toEqual(expected);
      expect(store.moveDoneBy).toBe(ControlType.Touch);
    });

    it('slides a whole run when the drag crosses several slots at once', () => {
      const store = proBoard();
      const wrapper = mountBoard();
      const squareSize = internals(wrapper).squareSize;

      // blank at sid 9; pointing at sid 7 slides the two tiles between them
      drag(wrapper, centreOf(9, squareSize), centreOf(7, squareSize));

      expect(store.movesCount).toBe(2);
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
    });

    // Replaces a test that pinned the old rAF throttle ("ignores a second touchmove while a
    // previous frame is still pending"). Dropping samples was the defect, so the behaviour
    // it protected is exactly what had to change: every sample is now applied.
    it('applies every sample in a gesture, including a change of direction', () => {
      const store = proBoard();
      const wrapper = mountBoard();
      const squareSize = internals(wrapper).squareSize;

      // along the bottom row to sid 7, then up column 1 to sid 1
      drag(wrapper, centreOf(9, squareSize), centreOf(7, squareSize), centreOf(1, squareSize));

      expect(store.movesCount).toBe(4);
      expect(store.currentOrders).toEqual([0, 2, 3, 1, 5, 6, 4, 7, 8]);
    });

    it('forgets the path when the pointer lifts or is cancelled', () => {
      const store = proBoard();
      const wrapper = mountBoard();
      const el = wrapper.find('.p-container').element;

      for (const type of ['pointerup', 'pointercancel']) {
        el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
      }
      expect(store.movesCount).toBe(0);
    });

    // The tap path: how pro mode plays without hover control, and how it always plays on
    // touch. One canvas has no per-tile listeners, so these share the board's hit-testing.
    function tap(wrapper: ReturnType<typeof mountBoard>, type: string,
      point: { x: number; y: number }): void {
      const event = type === 'mousedown'
        ? new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: point.x, clientY: point.y })
        : Object.assign(new Event(type, { bubbles: true, cancelable: true }),
            { touches: [{ clientX: point.x, clientY: point.y }] });
      wrapper.find('.p-container').element.dispatchEvent(event);
    }

    it('slides a run on a click when hover control is off', () => {
      const store = proBoard();
      store.hoverOnControl = false;
      const wrapper = mountBoard();

      tap(wrapper, 'mousedown', centreOf(7, internals(wrapper).squareSize));

      expect(store.movesCount).toBe(2);
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
      expect(store.moveDoneBy).toBe(ControlType.Mouse);
    });

    it('ignores a click while hover control is on, so the sweep is not doubled', () => {
      const store = proBoard();
      const wrapper = mountBoard();

      tap(wrapper, 'mousedown', centreOf(7, internals(wrapper).squareSize));

      expect(store.movesCount).toBe(0);
    });

    it('slides a run on a touch tap even with hover control on', () => {
      const store = proBoard();
      const wrapper = mountBoard();

      tap(wrapper, 'touchstart', centreOf(7, internals(wrapper).squareSize));

      expect(store.movesCount).toBe(2);
      expect(store.moveDoneBy).toBe(ControlType.Touch);
    });

    it('veils the pro board while paused', () => {
      const store = proBoard();
      store.paused = true;
      const wrapper = mountBoard();
      expect(wrapper.find('.board-canvas.board-veil').exists()).toBe(true);
    });

    it('ignores a drag that starts outside the board', () => {
      const store = proBoard();
      const wrapper = mountBoard();
      const squareSize = internals(wrapper).squareSize;

      drag(wrapper, { x: -50, y: -50 }, centreOf(8, squareSize));
      expect(store.movesCount).toBe(1); // the sample inside the board still counts
      store.stopInterval();
    });
  });
});
