import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventBus } from '@vueuse/core';
import Square from '../Square.vue';
import { useBaseStore } from '../../stores/base';
import { loadCageImages } from '../../../tests/cageImages';
import { getTileColor } from '@/colors';
import { ControlType, Direction } from '@/const';

// A real, solved 3x3 board - mixedOrder mirrors the "order + 1" identity a fresh
// scramble would assign (0 for the blank), so component instances line up the
// same way Board.vue actually wires them.
function setup3x3Solved() {
  const store = useBaseStore();
  store.numLines = 3;
  store.spaceBetween = 8;
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  return store;
}

function solvedMixedOrder(order: number): number {
  return order === 8 ? 0 : order + 1;
}

let currentWrapper: VueWrapper | undefined;
function mountSquare(order: number, mixedOrder = solvedMixedOrder(order), squareSize = 50) {
  currentWrapper = mount(Square, { props: { order, mixedOrder, squareSize } });
  return currentWrapper;
}

interface SquareInternals {
  sizeVar: string;
  bgColor: string;
  borderRadiusVar: string;
  blockTransition: string;
  fontSizeM: string;
  fontSizeD: string;
  inPlaceColor: string;
  getCursor: string;
  cannotMove: boolean;
  moveDirection: Direction;
  calculatedTopBind: string;
  calculatedLeftBind: string;
  isCaptured: boolean;
  isNoBorder: boolean;
  loadedImg: string;
}

function internals(wrapper: VueWrapper): SquareInternals {
  return wrapper.vm as unknown as SquareInternals;
}

describe('Square', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing for the blank tile outside cage mode', () => {
      setup3x3Solved();
      const wrapper = mountSquare(8);
      expect(wrapper.find('.square').exists()).toBe(false);
    });

    it('renders the blank tile in cage mode, with the free class', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      const wrapper = mountSquare(8);
      expect(wrapper.find('.square').classes()).toContain('free');
    });

    it('renders a non-blank tile outside cage mode', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0);
      expect(wrapper.find('.square').exists()).toBe(true);
    });
  });

  describe('bgColor', () => {
    it('uses the real per-size tile color in pro mode', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      const wrapper = mountSquare(0);
      expect(internals(wrapper).bgColor).toBe(getTileColor(3, 1));
    });

    it('uses the background color variable in cage mode', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      const wrapper = mountSquare(0);
      expect(internals(wrapper).bgColor).toBe('var(--background-color)');
    });

    it('uses the square background variable otherwise', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0);
      expect(internals(wrapper).bgColor).toBe('var(--square-bg-color)');
    });
  });

  describe('borderRadiusVar', () => {
    it.each([
      { order: 0, expected: '8px 0px 0px 0px' },
      { order: 2, expected: '0px 8px 0px 0px' },
      { order: 8, expected: '0px 0px 8px 0px' },
      { order: 6, expected: '0px 0px 0px 8px' },
      { order: 4, expected: '0px 0px 0px 0px' }
    ])('rounds the right corner(s) in pro mode for order $order', ({ order, expected }) => {
      const store = setup3x3Solved();
      store.proMode = true;
      // order 8's own default mixedOrder is 0 (the blank), which is exactly the tile
      // that actually occupies the bottom-right slot on a solved board.
      const wrapper = mountSquare(order, order === 8 ? 0 : order + 1);
      expect(internals(wrapper).borderRadiusVar).toBe(expected);
    });

    it('rounds corners in cage mode once all images finish loading', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      loadCageImages(store);
      const wrapper = mountSquare(0);
      expect(internals(wrapper).borderRadiusVar).toBe('8px 0px 0px 0px');
    });

    it('stays a flat 8px in cage mode while images are still loading', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      loadCageImages(store, 3);
      const wrapper = mountSquare(0);
      expect(internals(wrapper).borderRadiusVar).toBe('8px');
    });

    it('stays a flat 8px outside pro/cage mode', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0);
      expect(internals(wrapper).borderRadiusVar).toBe('8px');
    });
  });

  describe('blockTransition', () => {
    it('uses the real replay speed while replaying', () => {
      const store = setup3x3Solved();
      store.inReplay = true;
      store.replaySpeed = 400;
      const wrapper = mountSquare(0);
      expect(internals(wrapper).blockTransition).toBe('all 0.4s ease 0s');
    });

    it('has no transition in pro mode outside replay', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      const wrapper = mountSquare(0);
      expect(internals(wrapper).blockTransition).toBe('none');
    });

    it('uses the default ease transition otherwise', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0);
      expect(internals(wrapper).blockTransition).toBe('all 0.2s ease 0s');
    });
  });

  describe('inPlaceColor', () => {
    it('is the pro-mode accent color in pro mode', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      const wrapper = mountSquare(0);
      expect(internals(wrapper).inPlaceColor).toBe('#40d9ff');
    });

    it('is the themed variable otherwise', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0);
      expect(internals(wrapper).inPlaceColor).toBe('var(--square-in-place-color)');
    });
  });

  describe('font sizing', () => {
    it.each([
      { numLines: 6, small: '29px', wide: '39px' },
      { numLines: 7, small: '25px', wide: '35px' },
      { numLines: 8, small: '24px', wide: '33px' },
      { numLines: 3, small: '33px', wide: '45px' }
    ])('sizes text for a $numLines-wide board in pro mode', ({ numLines, small, wide }) => {
      const store = useBaseStore();
      store.proMode = true;
      store.numLines = numLines;
      store.currentOrders = Array.from({ length: numLines * numLines }, (_, i) => i);
      const wrapper = mountSquare(1, 1);
      expect(internals(wrapper).fontSizeM).toBe(small);
      expect(internals(wrapper).fontSizeD).toBe(wide);
    });

    it.each([
      { numLines: 7, small: '21px' },
      { numLines: 8, small: '18px' },
      { numLines: 3, small: '25px' }
    ])('sizes text for a $numLines-wide board outside pro mode', ({ numLines, small }) => {
      const store = useBaseStore();
      store.numLines = numLines;
      store.currentOrders = Array.from({ length: numLines * numLines }, (_, i) => i);
      const wrapper = mountSquare(1, 1);
      expect(internals(wrapper).fontSizeM).toBe(small);
      expect(internals(wrapper).fontSizeD).toBe('25px');
    });
  });

  describe('geometry', () => {
    it('sizes itself from the real square size prop', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0, 1, 62);
      expect(internals(wrapper).sizeVar).toBe('62px');
    });

    it('positions a tile from where its identity currently sits on the board', () => {
      setup3x3Solved();
      // order 6's identity (mixedOrder 7) sits at index 6: col 1, row 3 on a 3x3 board.
      // left = (1-1)*8 + 8 + 50*(1-1) = 8; top = (3-1)*8 + 8 + 50*(3-1) = 124
      const wrapper = mountSquare(6);
      expect(internals(wrapper).calculatedLeftBind).toBe('8px');
      expect(internals(wrapper).calculatedTopBind).toBe('124px');
    });

    it('repositions when the square size changes under it', async () => {
      // Board reuses Square instances (v-for keyed by index, no container key), so a
      // playground scramble load or puzzle-size change hands the same component a new
      // squareSize. The position has to follow it.
      setup3x3Solved();
      const wrapper = mountSquare(6); // col 1, row 3
      expect(internals(wrapper).calculatedLeftBind).toBe('8px');
      expect(internals(wrapper).calculatedTopBind).toBe('124px');
      await wrapper.setProps({ squareSize: 30 });
      // left = (1-1)*8 + 8 + 30*(1-1) = 8; top = (3-1)*8 + 8 + 30*(3-1) = 84
      expect(internals(wrapper).calculatedLeftBind).toBe('8px');
      expect(internals(wrapper).calculatedTopBind).toBe('84px');
    });

    it('follows its identity to a new position once the board changes', async () => {
      const store = setup3x3Solved();
      const wrapper = mountSquare(6); // mixedOrder 7
      store.currentOrders = [1, 2, 3, 4, 5, 6, 0, 7, 8]; // 7 slides to index 7: col 2, row 3
      await nextTick();
      expect(internals(wrapper).calculatedLeftBind).toBe('66px');
      expect(internals(wrapper).calculatedTopBind).toBe('124px');
    });
  });

  describe('getCursor', () => {
    it('is auto while pro-mode hover control is enabled, even when the tile can move', () => {
      const store = setup3x3Solved();
      store.hoverOnControl = true;
      store.proMode = true;
      const wrapper = mountSquare(7); // adjacent to the blank
      expect(internals(wrapper).getCursor).toBe('auto');
    });

    it('is pointer for a movable tile outside hover-control mode', () => {
      const store = setup3x3Solved();
      store.hoverOnControl = false;
      const wrapper = mountSquare(7);
      expect(internals(wrapper).getCursor).toBe('pointer');
    });

    it('is auto for a tile that cannot move', () => {
      const store = setup3x3Solved();
      store.hoverOnControl = false;
      const wrapper = mountSquare(0);
      expect(internals(wrapper).getCursor).toBe('auto');
    });
  });

  describe('moveDirection / cannotMove', () => {
    it('is Right when the blank is later in the same row', () => {
      setup3x3Solved();
      const wrapper = mountSquare(7);
      expect(internals(wrapper).moveDirection).toBe(Direction.Right);
      expect(internals(wrapper).cannotMove).toBe(false);
    });

    it('is Left when the blank is earlier in the same row', () => {
      const store = setup3x3Solved();
      store.currentOrders = [1, 2, 3, 4, 5, 6, 0, 7, 8];
      const wrapper = mountSquare(7, 8);
      expect(internals(wrapper).moveDirection).toBe(Direction.Left);
    });

    it('is Up when the blank is earlier in the same column', () => {
      const store = setup3x3Solved();
      store.currentOrders = [0, 2, 3, 1, 5, 6, 7, 8, 4];
      const wrapper = mountSquare(3, 1);
      expect(internals(wrapper).moveDirection).toBe(Direction.Up);
    });

    it('is Down when the blank is later in the same column', () => {
      setup3x3Solved();
      const wrapper = mountSquare(5);
      expect(internals(wrapper).moveDirection).toBe(Direction.Down);
    });

    it('is None when the tile shares neither the blank\'s row nor its column', () => {
      setup3x3Solved();
      const wrapper = mountSquare(0);
      expect(internals(wrapper).moveDirection).toBe(Direction.None);
    });

    it('is true while paused, even for an otherwise-movable tile', () => {
      const store = setup3x3Solved();
      store.paused = true;
      const wrapper = mountSquare(7);
      expect(internals(wrapper).cannotMove).toBe(true);
    });

    it('is true once the puzzle is done', () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(7);
      expect(internals(wrapper).cannotMove).toBe(true);
    });
  });

  describe('clicking and touching a movable tile', () => {
    // Hover control sweeps the board; a click there would add a move on top of the sweep.
    it('ignores a click while hover control is on', async () => {
      const store = setup3x3Solved();
      store.hoverOnControl = true;
      store.proMode = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(0);
    });

    it('moves the tile and records the move on a left click', async () => {
      const store = setup3x3Solved();
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(1);
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
      expect(store.moveDoneBy).toBe(ControlType.Mouse);
    });

    it('moves the tile and records the move on touchstart', async () => {
      const store = setup3x3Solved();
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('touchstart');
      expect(store.movesCount).toBe(1);
      expect(store.moveDoneBy).toBe(ControlType.Touch);
    });

    it('slides every tile between it and the blank when clicked from further away', async () => {
      const store = setup3x3Solved();
      const wrapper = mountSquare(6); // mixedOrder 7, two slots from the blank
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(2);
      expect(store.currentOrders).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
    });

    it('does nothing while replaying', async () => {
      const store = setup3x3Solved();
      store.inReplay = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(0);
    });

    it('does nothing during a shared playground session', async () => {
      const store = setup3x3Solved();
      store.playgroundMode = true;
      store.publicId = 'abc123';
      store.userName = 'me';
      store.otherUserName = 'someone-else';
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(0);
    });

    it('does nothing during a marathon replay', async () => {
      const store = setup3x3Solved();
      store.marathonReplay = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(0);
    });

    it('does nothing while a move is already in flight', async () => {
      const store = setup3x3Solved();
      store.isMoving = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousedown', { button: 0 });
      expect(store.movesCount).toBe(0);
    });
  });

  describe('moveByMouse', () => {
    it('moves when hover control and pro mode are both on', async () => {
      const store = setup3x3Solved();
      store.hoverOnControl = true;
      store.proMode = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousemove');
      expect(store.movesCount).toBe(1);
    });

    it('ignores mousemove outside hover-control pro mode', async () => {
      const store = setup3x3Solved();
      store.hoverOnControl = false;
      store.proMode = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousemove');
      expect(store.movesCount).toBe(0);
    });

    it('ignores a ctrl-held mousemove', async () => {
      const store = setup3x3Solved();
      store.hoverOnControl = true;
      store.proMode = true;
      const wrapper = mountSquare(7);
      await wrapper.find('.square').trigger('mousemove', { ctrlKey: true });
      expect(store.movesCount).toBe(0);
    });
  });

  describe('isDoneAll capture/border animation', () => {
    it('increments afterDoneCount immediately in pro mode, with no delay', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      store.inPlaceCount = store.arrayLength - 1;
      mountSquare(0);
      expect(store.afterDoneCount).toBe(1);
    });

    it('captures the tile in gold after a delay proportional to its position, outside cage mode', () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2); // currentElementIndex 3 -> delay 210ms
      expect(internals(wrapper).isCaptured).toBe(false);
      vi.advanceTimersByTime(210);
      expect(internals(wrapper).isCaptured).toBe(true);
      expect(store.afterDoneCount).toBe(1);
    });

    // The reveal is staggered up to ~12s on an 8x8 cage board, so a restart can easily
    // land while tiles are still pending. The timer used to survive it and both re-capture
    // the tile and bump afterDoneCount, which initStore had just reset to 0.
    it('cancels a pending capture when the puzzle restarts before it fires', async () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2); // currentElementIndex 3 -> delay 210ms

      useEventBus<string>('event-bus').emit('restart', 'fromConfig');
      await nextTick();
      const countAfterRestart = store.afterDoneCount;

      vi.advanceTimersByTime(1000);
      expect(internals(wrapper).isCaptured).toBe(false);
      expect(store.afterDoneCount).toBe(countAfterRestart);
    });

    it('cancels a pending capture when the tile unmounts', () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2);
      const countBefore = store.afterDoneCount;

      wrapper.unmount();
      currentWrapper = undefined;
      vi.advanceTimersByTime(1000);
      expect(store.afterDoneCount).toBe(countBefore);
    });

    it('removes the border after a delay proportional to its position, in cage mode', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2); // currentElementIndex 3 -> delay 600ms
      expect(internals(wrapper).isNoBorder).toBe(false);
      vi.advanceTimersByTime(600);
      expect(internals(wrapper).isNoBorder).toBe(true);
      expect(store.afterDoneCount).toBe(1);
    });

    it('does not animate the blank tile itself', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.inPlaceCount = store.arrayLength - 1;
      mountSquare(8);
      vi.advanceTimersByTime(5000);
      expect(store.afterDoneCount).toBe(0);
    });
  });

  describe('resetting capture/border state', () => {
    it('resets when doResetList becomes true', async () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2);
      vi.advanceTimersByTime(210);
      expect(internals(wrapper).isCaptured).toBe(true);
      store.doResetList = true;
      await nextTick();
      expect(internals(wrapper).isCaptured).toBe(false);
    });

    it.each(['fromConfig', 'fromKeyboard'])('resets on a %s restart event', async (payload) => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2);
      vi.advanceTimersByTime(210);
      expect(internals(wrapper).isCaptured).toBe(true);
      useEventBus<string>('event-bus').emit('restart', payload);
      await nextTick();
      expect(internals(wrapper).isCaptured).toBe(false);
    });

    it('ignores an unrelated restart payload', async () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2);
      vi.advanceTimersByTime(210);
      expect(internals(wrapper).isCaptured).toBe(true);
      useEventBus<string>('event-bus').emit('restart', 'fromReplay');
      await nextTick();
      expect(internals(wrapper).isCaptured).toBe(true);
    });

    it('ignores an unrelated event', async () => {
      const store = setup3x3Solved();
      store.inPlaceCount = store.arrayLength - 1;
      const wrapper = mountSquare(2);
      vi.advanceTimersByTime(210);
      useEventBus<string>('event-bus').emit('other-event', 'fromConfig');
      await nextTick();
      expect(internals(wrapper).isCaptured).toBe(true);
    });
  });

  describe('inPlaceCount tracking', () => {
    it('increments inPlaceCount once the tracked slot value settles into its home slot', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.spaceBetween = 8;
      store.doneFirstMove = true;
      store.currentOrders = [2, 1, 3, 4, 5, 6, 7, 8, 0];
      mountSquare(0, 2);
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      await nextTick();
      expect(store.inPlaceCount).toBe(1);
    });

    it('decrements inPlaceCount once the tracked slot value leaves its home slot', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.spaceBetween = 8;
      store.doneFirstMove = true;
      store.inPlaceCount = 1;
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      mountSquare(0, 1);
      store.currentOrders = [2, 1, 3, 4, 5, 6, 7, 8, 0];
      await nextTick();
      expect(store.inPlaceCount).toBe(0);
    });

    it('leaves inPlaceCount unchanged when the slot value moves between two non-home values', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.spaceBetween = 8;
      store.doneFirstMove = true;
      store.currentOrders = [2, 1, 3, 4, 5, 6, 7, 8, 0];
      mountSquare(0, 2);
      store.currentOrders = [3, 1, 2, 4, 5, 6, 7, 8, 0];
      await nextTick();
      expect(store.inPlaceCount).toBe(0);
    });

    it('ignores changes before the first move has been made', async () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.spaceBetween = 8;
      store.doneFirstMove = false;
      store.currentOrders = [2, 1, 3, 4, 5, 6, 7, 8, 0];
      mountSquare(0, 2);
      store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      await nextTick();
      expect(store.inPlaceCount).toBe(0);
    });
  });

  describe('cage mode template', () => {
    it('renders the tile image using the padded mixed-order number', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.cagePath = 'castle';
      const wrapper = mountSquare(2); // mixedOrder 3
      expect(wrapper.find('img.item-img').attributes('src')).toBe('/cages/castle/03.jpg');
    });

    it('renders the blank tile image using the array length', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.cagePath = 'castle';
      const wrapper = mountSquare(8);
      expect(wrapper.find('img.item-img').attributes('src')).toBe('/cages/castle/9.jpg');
    });

    it('records its own image as loaded when the image finishes loading', async () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      store.cagePath = 'castle';
      const wrapper = mountSquare(2);
      await wrapper.find('img.item-img').trigger('load');
      expect([...store.loadedCageImages]).toEqual(['/cages/castle/03.jpg']);
    });

    it('shows the number span once all cage images have finished loading', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      loadCageImages(store);
      const wrapper = mountSquare(2);
      expect(wrapper.find('.item-img-span').exists()).toBe(true);
      expect(wrapper.find('.item-img-span').text()).toBe('3');
    });

    it('does not show the number span until every cage image has loaded', () => {
      const store = setup3x3Solved();
      store.cageMode = true;
      loadCageImages(store, 3);
      const wrapper = mountSquare(2);
      expect(wrapper.find('.item-img-span').exists()).toBe(false);
    });
  });

  describe('plain mode template', () => {
    it('shows the mixed-order number for a non-blank tile', () => {
      setup3x3Solved();
      const wrapper = mountSquare(2);
      expect(wrapper.find('.square').text()).toBe('3');
    });

    it('shows nothing while re-initializing', () => {
      const store = setup3x3Solved();
      store.processingReInit = true;
      const wrapper = mountSquare(2);
      expect(wrapper.find('.square').text()).toBe('');
    });
  });

  describe('pro mode template', () => {
    it('shows the mixed-order number, blank as empty', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      const wrapper = mountSquare(2);
      expect(wrapper.find('.square').text()).toBe('3');
    });

    it('shows the blank tile as empty when cage mode renders it', () => {
      const store = setup3x3Solved();
      store.proMode = true;
      store.cageMode = true;
      const wrapper = mountSquare(8);
      expect(wrapper.find('.square').text()).toBe('');
    });
  });
});
