import { useTimerState } from './useTimerState';
import { useMarathonState } from './useMarathonState';
import { ref, computed, type Ref } from 'vue';
import { CORE_NUM, SPACE_BETWEEN_SQUARES, FMC_BLITZ_TIME, Direction, ControlType, DirectionMap } from '@/const';
import {
  calculateTPS,
  getElementCol,
  getElementRow,
  swapArrayElements
} from '../../utils';

export function usePuzzleState(
  marathon: ReturnType<typeof useMarathonState>,
  lastGameID: Ref<string>,
  timer: ReturnType<typeof useTimerState>,
  noPlayMode: Ref<boolean>,
  proMode: Ref<boolean>
) {
  const numLines = ref(CORE_NUM);
  const spaceBetween = ref(SPACE_BETWEEN_SQUARES);
  const movesCount = ref(0);
  const afterDoneCount = ref(0);
  const mixedOrders = ref<number[]>([]);
  const currentOrders = ref<number[]>([]);
  const doResetList = ref(false);
  const doneFirstMove = ref(false);
  const isMoving = ref(false);
  const moveDoneBy = ref(ControlType.Mouse);
  const solvePath = ref<string[]>([]);
  const inPlaceCount = ref(0);
  const optM = ref(0);

  function incMoves() {
    movesCount.value += 1;
  }

  function moveLeft(control: ControlType) {
    if ((freeElementIndex.value + 1) % numLines.value !== 0) {
      saveState(freeElementIndex.value + 1, Direction.Left, control);
    }
  }

  function moveRight(control: ControlType) {
    if (freeElementIndex.value % numLines.value !== 0) {
      saveState(freeElementIndex.value - 1, Direction.Right, control);
    }
  }

  function moveUp(control: ControlType) {
    if (freeElementRow.value < numLines.value) {
      saveState(freeElementIndex.value + numLines.value, Direction.Up, control);
    }
  }

  function moveDown(control: ControlType) {
    if (freeElementRow.value > 1) {
      saveState(freeElementIndex.value - numLines.value, Direction.Down, control);
    }
  }

  function checkDiffBetweenElementsAndMove(currentElementIndex: number, moveDirection: Direction, control: ControlType) {
    let diff = Math.abs(freeElementIndex.value + 1 - currentElementIndex);
    if ([Direction.Up, Direction.Down].includes(moveDirection)) {
      diff = diff / numLines.value;
    }
    if (diff > 1) {
      for (let i = 0; i < diff; i++) {
        switch (moveDirection) {
          case Direction.Left:
            moveLeft(control);
            break;
          case Direction.Right:
            moveRight(control);
            break;
          case Direction.Up:
            moveUp(control);
            break;
          case Direction.Down:
            moveDown(control);
            break;
          default:
        }
      }
      return true;
    }
    return false;
  }

  function beforeMove() {
    if (!doneFirstMove.value) {
      doneFirstMove.value = true;
      if (marathon.fmcBlitz.value) {
        optM.value = 0;
        timer.time.value = 0;
        movesCount.value = 0;
        solvePath.value = [];
        lastGameID.value = '0';
        doResetList.value = false;
      }
    }
    if (marathon.marathonFirstMove.value !== true) {
      marathon.marathonFirstMove.value = true;
    }
    if (timer.interval.value === 0) {
      timer.restartInterval();
    }
    if (marathon.fmcBlitz.value && marathon.blitzInterval.value === 0 && marathon.solvedPuzzlesInMarathon.value === 0) {
      marathon.startBlitzTime.value = Date.now();
      marathon.blitzInterval.value = setInterval(() => {
        marathon.blitzTime.value = FMC_BLITZ_TIME * 1000 - (Date.now() - marathon.startBlitzTime.value);
      }, 5);
    }
  }

  function saveState(currentElementIndex: number, moveDirection: Direction, control: ControlType) {
    beforeMove();
    switch (moveDirection) {
      case Direction.Right:
        swapArrayElements(currentOrders.value, currentElementIndex, currentElementIndex + 1);
        break;
      case Direction.Left:
        swapArrayElements(currentOrders.value, currentElementIndex, currentElementIndex - 1);
        break;
      case Direction.Down:
        swapArrayElements(currentOrders.value, currentElementIndex, currentElementIndex + numLines.value);
        break;
      case Direction.Up:
        swapArrayElements(currentOrders.value, currentElementIndex, currentElementIndex - numLines.value);
        break;
      default:
    }
    incMoves();
    moveDoneBy.value = control;
    solvePath.value.push(DirectionMap.get(moveDirection) ?? '');
  }

  function boardSize(squareSize: number): string {
    return `${numLines.value * squareSize + spaceBetween.value * (numLines.value + 1)}px`;
  }

  const freeElementIndex = computed((): number => {
    return currentOrders.value.indexOf(0);
  });

  const arrayLength = computed((): number => {
    return numLines.value ** 2;
  });

  const startOrderedCount = computed((): number => {
    let count = 0;
    mixedOrders.value.forEach((value, i) => {
      if (value === i + 1) {
        count += 1;
      }
    });
    return count;
  });

  const freeElementCol = computed((): number => {
    return getElementCol(freeElementIndex.value + 1, numLines.value);
  });

  const freeElementRow = computed((): number => {
    return getElementRow(freeElementIndex.value + 1, numLines.value);
  });

  const isDone = computed((): boolean => {
    if (noPlayMode.value) {
      return false;
    }
    return inPlaceCount.value === arrayLength.value - 1;
  });

  const afterDoneAnimationEnd = computed((): boolean => {
    if (!isDone.value || proMode.value) {
      if (proMode.value) {
        afterDoneCount.value = arrayLength.value - 1;
      }
      return true;
    }
    return afterDoneCount.value === arrayLength.value - 1;
  });

  const getControlTypeStr = computed((): string => {
    let controlType;
    switch (moveDoneBy.value) {
      case ControlType.Touch:
        controlType = 'touch';
        break;
      case ControlType.Keyboard:
        controlType = 'keyboard';
        break;
      default:
        controlType = 'mouse';
    }
    return controlType;
  });

  const tps = computed((): string => {
    return calculateTPS(movesCount.value, timer.time.value);
  });

  return {
    currentOrders,
    mixedOrders,
    numLines,
    spaceBetween,
    doResetList,
    doneFirstMove,
    isMoving,
    moveDoneBy,
    movesCount,
    solvePath,
    inPlaceCount,
    afterDoneCount,
    opt_m: optM,
    freeElementIndex,
    arrayLength,
    startOrderedCount,
    freeElementCol,
    freeElementRow,
    moveLeft,
    moveRight,
    moveUp,
    moveDown,
    checkDiffBetweenElementsAndMove,
    beforeMove,
    saveState,
    incMoves,
    boardSize,
    isDone,
    afterDoneAnimationEnd,
    getControlTypeStr,
    tps
  };
}
