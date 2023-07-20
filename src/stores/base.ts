import { defineStore, acceptHMRUpdate } from 'pinia';
import { generateAndShuffle, generate, isSolvable } from '../utils';
import { CORE_NUM, SPACE_BETWEEN_SQUARES, CAGES_PATH_ARR, Direction } from './const';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: CORE_NUM,
    spaceBetween: SPACE_BETWEEN_SQUARES,
    freeElement: 0,
    time: 0,
    movesCount: 0,
    afterDoneCount: 0,
    actualOrders: [] as number[],
    mixedOrders: [] as number[],
    doResetList: false,
    interval: 0,
    paused: false,
    movesRecord: 0,
    timeRecord: 0,
    doneFirstMove: false,
    showConfirm: false,
    showSquareNum: false,
    cageMode: false,
    eligibleForCageMode: false,
    cagePath: '',
    shownCages: new Set<string>(),
    cageImageLoadedCount: 0,
    showInfo: false,
    disableCageMode: localStorage.getItem('disableCageMode') === 'true',
    cageHardcoreMode: localStorage.getItem('cageHardcoreMode') === 'true',
    unlockedCages: new Set<number>(),
    showWinModal: false,
    processingReInit: false,
    disableWinMessage: localStorage.getItem('disableWinMessage') === 'true'
  }),
  actions: {
    initStore() {
      if (this.cageMode) {
        this.spaceBetween = 0;
      } else {
        this.spaceBetween = SPACE_BETWEEN_SQUARES;
      }
      this.freeElement = 0;
      this.time = 0;
      this.movesCount = 0;
      this.afterDoneCount = 0;
      this.actualOrders = generate(this.arrayLength);
      this.mixedOrders = generateAndShuffle(this.arrayLength);
      let solvable = isSolvable(this.mixedOrders);
      while (!solvable) {
        this.mixedOrders = generateAndShuffle(this.arrayLength);
        solvable = isSolvable(this.mixedOrders);
      }
      this.freeElement = this.actualOrders[this.mixedOrders.findIndex((x) => x === 0)];
      this.actualOrders[this.mixedOrders.findIndex((x) => x === 0)] = -1;
      this.doResetList = false;
      this.doneFirstMove = false;
      this.cageImageLoadedCount = 0;
    },
    incMoves() {
      this.movesCount++;
    },
    reset() {
      this.doResetList = true;
    },
    stopInterval() {
      clearInterval(this.interval);
    },
    restartInterval() {
      if (this.interval) {
        this.stopInterval();
      }
      this.interval = setInterval(() => {
        if (this.paused || !this.doneFirstMove) {
          return;
        }
        this.time++;
      }, 1000);
    },
    invertPaused() {
      if (this.showConfirm || this.showInfo || this.showWinModal ||
        this.cageMode && !this.finishLoadingAllCageImages) {
        return;
      }
      this.paused = !this.paused;
    },
    saveActualOrder(order: number, moveDirection: Direction) {
      if (!this.doneFirstMove) {
        this.doneFirstMove = true;
      }
      const prevOrder = this.actualOrders[order];
      switch (moveDirection) {
        case Direction.Right:
          this.actualOrders[order] = prevOrder + 1;
          break;
        case Direction.Left:
          this.actualOrders[order] = prevOrder - 1;
          break;
        case Direction.Down:
          this.actualOrders[order] = prevOrder + this.numLines;
          break;
        case Direction.Up:
          this.actualOrders[order] = prevOrder - this.numLines;
          break;
        default:
      }
      this.incMoves();
      this.freeElement = prevOrder;
    },
    boardSize(squareSize: number) {
      return `${this.numLines * squareSize + this.spaceBetween * (this.numLines + 1)}px`;
    },
    setUnlockedCages() {
      if (this.cagePath) {
        this.unlockedCages.add(CAGES_PATH_ARR.indexOf(this.cagePath.toString()));
        localStorage.setItem('_xcu', btoa([...this.unlockedCages].sort((a, b) => a - b).join(',')));
      }
    },
    loadUnlockedCagesFromLocalStorage() {
      const xcu = localStorage.getItem('_xcu');
      if (xcu !== null) {
        const arr = atob(xcu).split(',');
        for (const item of arr) {
          this.unlockedCages.add(Number(item));
        }
      }
    }
  },
  getters: {
    cagesCount(): number {
      return CAGES_PATH_ARR.length;
    },
    arrayLength(): number {
      return this.numLines ** 2;
    },
    orderedCount(): number {
      let count = 0;
      this.actualOrders.forEach((value, i) => {
        if (value !== -1 && value + 1 === this.mixedOrders[i]) {
          count += 1;
        }
      });
      return count;
    },
    isDone(): boolean {
      return this.orderedCount === this.arrayLength - 1;
    },
    afterDoneAnimationEnd(): boolean {
      if (!this.isDone) {
        return true;
      }
      return this.afterDoneCount === this.arrayLength - 1;
    },
    finishLoadingAllCageImages(): boolean {
      return this.cageImageLoadedCount === this.arrayLength - 1;
    },
    seconds(): number {
      return this.time;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBaseStore, import.meta.hot));
}
