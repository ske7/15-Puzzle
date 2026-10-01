import { createPinia, setActivePinia } from 'pinia';
import { ref, type Ref } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { useBoardPointer } from '../useBoardPointer';
import { ControlType } from '@/const';

const CELL = 50;

// A solved 4x4 with the blank in the bottom-right corner (cell 16). Pointing at a cell
// slides the run between it and the blank, so the blank ends up under the pointer.
function setupBoard() {
  const store = useBaseStore();
  store.proMode = true;
  store.hoverOnControl = true;
  store.numLines = 4;
  store.spaceBetween = 0;
  store.mixedOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
  store.currentOrders = [...store.mixedOrders];
  store.doneFirstMove = true;
  return store;
}

// The origin every sample is measured against. jsdom does no layout, so its
// getBoundingClientRect reports the origin as (0, 0) - which is what the coordinates in
// these tests are expressed in.
let boardEl: Ref<HTMLElement | undefined>;

// centre of a 1-based (col, row) cell
const at = (col: number, row: number) => ({ x: (col - 1) * CELL + CELL / 2, y: (row - 1) * CELL + CELL / 2 });

describe('useBoardPointer', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    boardEl = ref(document.createElement('div'));
  });

  describe('a drag registers every sample it is given', () => {
    it('slides a whole run from a single sample', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);

      expect(store.movesCount).toBe(3);
      expect(store.freeElementIndex + 1).toBe(13); // blank arrived under the pointer
      store.stopInterval();
    });

    // The defect measured in step 1: the old rAF throttle kept one sample per frame, so a
    // path that turned a corner lost its second leg entirely - 3 of 6 moves.
    it('registers both legs of an L, which the throttled path used to halve', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y); // along row 4: 3 moves, blank to cell 13
      pointer.moveTo(at(1, 1).x, at(1, 1).y); // up column 1: 3 moves, blank to cell 1

      expect(store.movesCount).toBe(6);
      expect(store.freeElementIndex + 1).toBe(1);
      store.stopInterval();
    });

    // A corner cannot be recovered from a single sample - the path between two points is
    // not observable. At 1000Hz polling a 10ms flick delivers many samples, so this is a
    // statement about the worst case rather than a limitation that bites in practice.
    it('cannot turn a corner within one sample, and does nothing rather than guessing', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 1).x, at(1, 1).y); // neither the blank's row nor its column

      expect(store.movesCount).toBe(0);
    });

    // Hover control has no button press, so nothing calls beginAt at all: the player
    // sweeps the board and only pointermove ever arrives. Geometry anchored on pointerdown
    // left a session with no cell size until the player happened to click once.
    it('moves on a bare hover, with no pointer ever going down', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.onPointerMove({ clientX: at(1, 4).x, clientY: at(1, 4).y,
        pointerType: 'mouse' } as unknown as PointerEvent);

      expect(store.movesCount).toBe(3);
      store.stopInterval();
    });

    // The board is re-laid out under a pointer that never lifts. A cell size read once maps
    // the same point to the wrong row of the new board, and the error grows with distance
    // from the origin - which is why this bit hardest on big boards and after a resize.
    it('follows a puzzle-size change rather than a cell size read once', () => {
      const store = setupBoard();
      const size = ref(CELL);
      const pointer = useBoardPointer(size, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);

      store.numLines = 5;
      store.mixedOrders = [...Array.from({ length: 24 }, (_, i) => i + 1), 0];
      store.currentOrders = [...store.mixedOrders];
      size.value = 40;

      pointer.moveTo(20, 180); // centre of column 1, row 5 at the new cell size

      expect(store.movesCount).toBe(4);
      expect(store.freeElementIndex + 1).toBe(21);
      store.stopInterval();
    });

    // The board moves on screen with no size change whenever the page reflows above it,
    // and nothing reports that - so the origin has to be measured again per event rather
    // than remembered from an earlier one.
    it('measures each sample against where the board is now, not where it was', () => {
      const store = setupBoard();
      const element = document.createElement('div');
      let shift = 0;
      element.getBoundingClientRect = () => ({ left: shift, top: shift }) as DOMRect;
      boardEl.value = element;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      shift = CELL; // the page reflows and the whole board slides down and across
      pointer.moveTo(at(1, 4).x + CELL, at(1, 4).y + CELL);

      expect(store.movesCount).toBe(3);
      expect(store.freeElementIndex + 1).toBe(13);
      store.stopInterval();
    });

    // The board changes under a cursor that has not left its cell - the next marathon
    // scramble arriving, or a keyboard move. The cell the cursor is already sitting on has
    // to move on the next sample; waiting for the cursor to leave and come back is what
    // players hit as "it will not move the tile the cursor is already on".
    it('moves again in the same cell once the board has changed under the cursor', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      // Comes to rest on a cell in neither the blank's row nor its column, so nothing moves.
      pointer.moveTo(at(1, 1).x, at(1, 1).y);
      expect(store.movesCount).toBe(0);

      // The blank is now in row 1, three cells to the right of where the cursor sits.
      store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 4];

      pointer.moveTo(at(1, 1).x + 3, at(1, 1).y + 3); // same cell, the cursor barely twitched

      expect(store.movesCount).toBe(3);
      expect(store.freeElementIndex + 1).toBe(1);
      store.stopInterval();
    });

    it('ignores repeat samples inside the same cell', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);
      pointer.moveTo(at(1, 4).x + 5, at(1, 4).y + 5);

      expect(store.movesCount).toBe(3);
      store.stopInterval();
    });
  });

  // Before the first move of each marathon or blitz scramble, a tile moves only when the
  // cursor enters it. A new scramble appears under a resting cursor, and a twitch inside the
  // cell it already sits on must not spend a move.
  describe('marathon and blitz', () => {
    it.each(['marathonMode', 'fmcBlitz'] as const)('in %s, waits for the cursor to enter a tile before the first move', (mode) => {
      const store = setupBoard();
      store[mode] = true;
      store.marathonFirstMove = false;
      const pointer = useBoardPointer(CELL, boardEl);
      pointer.moveTo(at(1, 1).x, at(1, 1).y);

      // The next scramble arrives with the blank in the cursor's row.
      store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 4];
      pointer.moveTo(at(1, 1).x + 3, at(1, 1).y + 3);
      expect(store.movesCount).toBe(0);

      pointer.moveTo(at(2, 1).x, at(2, 1).y);
      expect(store.movesCount).toBe(2);
      store.stopInterval();
      store.stopBlitzInterval();
    });

    it.each([
      ['leaves the board element', (pointer: ReturnType<typeof useBoardPointer>) => {
        pointer.onPointerLeave({} as PointerEvent);
      }],
      ['is sampled off the grid', (pointer: ReturnType<typeof useBoardPointer>) => {
        pointer.moveTo(-40, at(1, 1).y);
      }]
    ])('counts coming back onto the same tile as entering it after the cursor %s', (_how, leave) => {
      const store = setupBoard();
      store.marathonMode = true;
      store.marathonFirstMove = false;
      const pointer = useBoardPointer(CELL, boardEl);
      pointer.moveTo(at(1, 1).x, at(1, 1).y);

      store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 4];
      pointer.moveTo(at(1, 1).x + 3, at(1, 1).y + 3);
      expect(store.movesCount).toBe(0);

      leave(pointer);
      pointer.moveTo(at(1, 1).x, at(1, 1).y);

      expect(store.movesCount).toBe(3);
      expect(store.freeElementIndex + 1).toBe(1);
      store.stopInterval();
    });

    it.each(['marathonMode', 'fmcBlitz'] as const)('in %s, moves the cell under a resting cursor once the scramble is under way', (mode) => {
      const store = setupBoard();
      store[mode] = true;
      store.marathonFirstMove = true;
      const pointer = useBoardPointer(CELL, boardEl);
      pointer.moveTo(at(1, 1).x, at(1, 1).y);

      store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 4];
      pointer.moveTo(at(1, 1).x + 3, at(1, 1).y + 3);

      expect(store.movesCount).toBe(3);
      store.stopInterval();
      store.stopBlitzInterval();
    });

    it('moves on entering a new cell before the first move of a marathon', () => {
      const store = setupBoard();
      store.marathonMode = true;
      store.marathonFirstMove = false;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);

      expect(store.movesCount).toBe(3);
      store.stopInterval();
    });

    it('keeps moving once the first marathon move has been made', () => {
      const store = setupBoard();
      store.marathonMode = true;
      store.marathonFirstMove = true;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);

      expect(store.movesCount).toBe(3);
      store.stopInterval();
    });
  });

  describe('guards', () => {
    it('does nothing while the puzzle is paused', () => {
      const store = setupBoard();
      store.paused = true;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);

      expect(store.movesCount).toBe(0);
    });

    it('does nothing outside pro hover mode', () => {
      const store = setupBoard();
      store.hoverOnControl = false;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);

      expect(store.movesCount).toBe(0);
    });

    it('ignores points outside the board', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(-40, at(4, 4).y);

      expect(store.movesCount).toBe(0);
    });

    // The ref is empty until Board mounts. With no board to measure against, a point
    // cannot be placed on the grid at all.
    it('does nothing before the board element exists', () => {
      const store = setupBoard();
      boardEl.value = undefined;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.moveTo(at(1, 4).x, at(1, 4).y);
      pointer.tapAt(at(1, 4).x, at(1, 4).y, ControlType.Mouse);
      pointer.onPointerMove({ clientX: at(1, 4).x, clientY: at(1, 4).y,
        pointerType: 'mouse' } as unknown as PointerEvent);

      expect(store.movesCount).toBe(0);
    });

    it('starts a fresh path after the pointer lifts', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.endDrag();
      pointer.moveTo(at(1, 4).x, at(1, 4).y);

      // no anchor, so the sample still applies - endDrag only clears the cell memory
      expect(store.movesCount).toBe(3);
      store.stopInterval();
    });
  });

  // A press on a cell, which is how pro mode plays without hover control and how it always
  // plays on touch. Unlike a sweep it does not require hoverOnControl.
  describe('tapAt', () => {
    it('slides the run under the press', () => {
      const store = setupBoard();
      store.hoverOnControl = false;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.tapAt(at(1, 4).x, at(1, 4).y, ControlType.Mouse);

      expect(store.movesCount).toBe(3);
      expect(store.moveDoneBy).toBe(ControlType.Mouse);
      store.stopInterval();
    });

    it('does nothing while the puzzle is paused', () => {
      const store = setupBoard();
      store.paused = true;
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.tapAt(at(1, 4).x, at(1, 4).y, ControlType.Mouse);

      expect(store.movesCount).toBe(0);
    });

    it('ignores a press outside the board', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.tapAt(-40, at(4, 4).y, ControlType.Mouse);

      expect(store.movesCount).toBe(0);
    });

    // The press becomes the path's anchor, so a hover sample that has not left the cell
    // yet cannot move it a second time.
    it('anchors the path so hovering on in the same cell does not re-fire', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.tapAt(at(1, 4).x, at(1, 4).y, ControlType.Touch);
      pointer.moveTo(at(1, 4).x + 3, at(1, 4).y + 3);

      expect(store.movesCount).toBe(3);
      store.stopInterval();
    });
  });

  describe('DOM adapters', () => {
    it('threads the pointer type through as the control type', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);
      const target = { setPointerCapture: () => undefined };

      pointer.onPointerDown({ clientX: at(4, 4).x, clientY: at(4, 4).y,
        pointerId: 1, pointerType: 'mouse', target } as unknown as PointerEvent);
      pointer.onPointerMove({ clientX: at(1, 4).x, clientY: at(1, 4).y,
        pointerType: 'mouse' } as unknown as PointerEvent);

      expect(store.movesCount).toBe(3);
      expect(store.moveDoneBy).toBe(ControlType.Mouse);
      store.stopInterval();
    });

    // At 1000Hz polling against a 144Hz frame the browser hands us one pointermove holding
    // roughly seven samples; taking only the latest would drop the corner between them.
    it('replays every coalesced sample rather than only the latest', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);
      const path = [at(1, 4), at(1, 1)];

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.onPointerMove({
        clientX: path[1].x, clientY: path[1].y, pointerType: 'touch',
        getCoalescedEvents: () => path.map((p) => ({ clientX: p.x, clientY: p.y }))
      } as unknown as PointerEvent);

      expect(store.movesCount).toBe(6);
      store.stopInterval();
    });

    it('does not move while ctrl is held', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);

      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.onPointerMove({ clientX: at(1, 4).x, clientY: at(1, 4).y,
        pointerType: 'mouse', ctrlKey: true } as unknown as PointerEvent);

      expect(store.movesCount).toBe(0);
    });

    it('clears the path on pointer up', () => {
      const store = setupBoard();
      const pointer = useBoardPointer(CELL, boardEl);
      pointer.beginAt(at(4, 4).x, at(4, 4).y);
      pointer.onPointerUp({} as unknown as PointerEvent);
      expect(store.movesCount).toBe(0);
    });
  });
});
