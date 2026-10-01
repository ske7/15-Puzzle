import { toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useBaseStore } from '../stores/base';
import { canMoveStatic } from './useCanMoveStatic';
import { cellFromPoint } from '@/utils';
import { ControlType, Direction } from '@/const';

interface BoardOrigin {
  left: number;
  top: number;
}

export interface UseBoardPointerResult {
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
  onMouseDown: (event: MouseEvent) => void;
  onTouchStart: (event: TouchEvent) => void;
  beginAt: (clientX: number, clientY: number) => void;
  moveTo: (clientX: number, clientY: number, control?: ControlType) => void;
  tapAt: (clientX: number, clientY: number, control: ControlType) => void;
  endDrag: () => void;
}

export const useBoardPointer = (
  squareSize: MaybeRefOrGetter<number>,
  boardEl: MaybeRefOrGetter<HTMLElement | null | undefined>
): UseBoardPointerResult => {
  const baseStore = useBaseStore();

  let lastCell: number | null = null;
  let lastBlank = -1;

  const forgetLastSample = (): void => {
    lastCell = null;
    lastBlank = -1;
  };

  watch(() => baseStore.numLines, forgetLastSample, { flush: 'sync' });

  const moveByDirection: Record<Direction, (control: ControlType) => void> = {
    /* v8 ignore next -- guarded away: canMoveStatic never reports None alongside canMove */
    [Direction.None]: () => undefined,
    [Direction.Left]: (control) => { baseStore.moveLeft(control) },
    [Direction.Right]: (control) => { baseStore.moveRight(control) },
    [Direction.Up]: (control) => { baseStore.moveUp(control) },
    [Direction.Down]: (control) => { baseStore.moveDown(control) }
  };

  const canPlay = (): boolean => {
    return baseStore.hoverOnControl && (baseStore.proMode || baseStore.cageMode) &&
      !(baseStore.inReplay || baseStore.sharedPlaygroundMode || baseStore.marathonReplay ||
        baseStore.paused || baseStore.isDone || baseStore.isTimeFailed || baseStore.noPlayMode);
  };

  const canTap = (): boolean => {
    return !(baseStore.isMoving || baseStore.paused || baseStore.isDone ||
      baseStore.isTimeFailed || baseStore.noPlayMode);
  };

  const boardOrigin = (): BoardOrigin | null => {
    const element = toValue(boardEl);
    if (element === null || element === undefined) {
      return null;
    }
    const { left, top } = element.getBoundingClientRect();
    return { left, top };
  };

  const cellAt = (clientX: number, clientY: number, origin: BoardOrigin): number | null => {
    return cellFromPoint(clientX - origin.left, clientY - origin.top,
      baseStore.numLines, toValue(squareSize), baseStore.spaceBetween);
  };

  const applyCell = (cell: number, control: ControlType): void => {
    const moveData = canMoveStatic(cell, toValue(squareSize));
    if (!moveData.canMove || moveData.isFreeElement) {
      return;
    }
    if (!baseStore.checkDiffBetweenElementsAndMove(cell, moveData.moveDirection, control)) {
      moveByDirection[moveData.moveDirection](control);
    }
  };

  const sampleAt = (clientX: number, clientY: number, origin: BoardOrigin,
    control: ControlType): void => {
    if (!canPlay()) {
      return;
    }
    const cell = cellAt(clientX, clientY, origin);
    if (cell === null) {
      forgetLastSample();
      return;
    }
    const onlyOnEntry = (baseStore.marathonMode || baseStore.fmcBlitz) && !baseStore.marathonFirstMove;
    if (cell === lastCell && (onlyOnEntry || baseStore.freeElementIndex === lastBlank)) {
      return;
    }
    baseStore.isMoving = true;
    applyCell(cell, control);
    baseStore.isMoving = false;
    lastCell = cell;
    lastBlank = baseStore.freeElementIndex;
  };

  const beginAt = (clientX: number, clientY: number): void => {
    const origin = boardOrigin();
    if (origin === null) {
      return;
    }
    lastCell = cellAt(clientX, clientY, origin);
    lastBlank = baseStore.freeElementIndex;
  };

  const moveTo = (clientX: number, clientY: number, control = ControlType.Touch): void => {
    const origin = boardOrigin();
    if (origin === null) {
      return;
    }
    sampleAt(clientX, clientY, origin, control);
  };

  const tapAt = (clientX: number, clientY: number, control: ControlType): void => {
    const origin = boardOrigin();
    if (origin === null || !canTap()) {
      return;
    }
    const cell = cellAt(clientX, clientY, origin);
    if (cell === null) {
      return;
    }
    baseStore.isMoving = true;
    applyCell(cell, control);
    baseStore.isMoving = false;
    lastCell = cell;
    lastBlank = baseStore.freeElementIndex;
  };

  const endDrag = (): void => {
    forgetLastSample();
  };

  const controlOf = (event: PointerEvent): ControlType => {
    return event.pointerType === 'mouse' ? ControlType.Mouse : ControlType.Touch;
  };

  const onPointerDown = (event: PointerEvent): void => {
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
    beginAt(event.clientX, event.clientY);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.ctrlKey) {
      return;
    }
    const origin = boardOrigin();
    if (origin === null) {
      return;
    }
    const control = controlOf(event);
    const samples = typeof event.getCoalescedEvents === 'function'
      ? event.getCoalescedEvents()
      : [];
    if (samples.length === 0) {
      sampleAt(event.clientX, event.clientY, origin, control);
      return;
    }
    for (const sample of samples) {
      sampleAt(sample.clientX, sample.clientY, origin, control);
    }
  };

  const onPointerUp = (): void => {
    endDrag();
  };

  const onPointerLeave = (): void => {
    forgetLastSample();
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (baseStore.hoverOnControl && baseStore.proMode) {
      return;
    }
    tapAt(event.clientX, event.clientY, ControlType.Mouse);
  };

  const onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    tapAt(touch.clientX, touch.clientY, ControlType.Touch);
  };

  return {
    onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onMouseDown, onTouchStart,
    beginAt, moveTo, tapAt, endDrag
  };
};
