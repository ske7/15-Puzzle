import { defineStore, acceptHMRUpdate } from 'pinia';
import {
  generateAndShuffle, generate, isSolvable, isSorted,
  getArrayKeyByValue, getElementCol, getElementRow,
  displayedTime
} from '../utils';
import {
  CORE_NUM, SPACE_BETWEEN_SQUARES,
  CAGES_PATH_ARR, Direction,
  type PreloadedImage, type Record, type Position
} from './const';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: CORE_NUM,
    spaceBetween: SPACE_BETWEEN_SQUARES,
    freeElement: 0,
    freeElementIndex: 0,
    time: 0,
    movesCount: 0,
    afterDoneCount: 0,
    actualOrders: [] as number[],
    mixedOrders: [] as number[],
    doResetList: false,
    interval: 0,
    paused: false,
    timeRecord: 0,
    movesRecord: 0,
    timeRecordMoves: 0,
    movesRecordTime: 0,
    doneFirstMove: false,
    cageMode: false,
    eligibleForCageMode: false,
    cagePath: '',
    shownCages: new Set<string>(),
    cageCompleteImgLoaded: false,
    cageImageLoadedCount: 0,
    showInfo: false,
    disableCageMode: localStorage.getItem('disableCageMode') === 'true',
    cageHardcoreMode: localStorage.getItem('cageHardcoreMode') === 'true',
    unlockedCages: new Set<number>(),
    showWinModal: false,
    processingReInit: false,
    disableWinMessage: localStorage.getItem('disableWinMessage') === 'true',
    newMovesRecord: false,
    newTimeRecord: false,
    showConfig: false,
    showImageGallery: false,
    showOnlyUnlockedItems: localStorage.getItem('showOnlyUnlockedItems') === 'true',
    preloadedImages: [] as PreloadedImage[],
    noBordersInCageMode: localStorage.getItem('noBordersInCageMode') === 'true',
    proMode: localStorage.getItem('fasterSliding') === 'true' || localStorage.getItem('proMode') === 'true',
    marathonMode: localStorage.getItem('marathonMode') === 'true',
    solvedPuzzlesInMarathon: 0,
    startTime: 0,
    savedTime: 0,
    proPalette: localStorage.getItem('proPalette') === 'true',
    darkMode: localStorage.getItem('darkMode') === 'true',
    boardPos: {} as Position
  }),
  actions: {
    initStore() {
      this.setSpaceBetween();
      this.freeElement = 0;
      this.freeElementIndex = 0;
      this.time = 0;
      this.savedTime = 0;
      this.movesCount = 0;
      this.solvedPuzzlesInMarathon = 0;
      this.newMovesRecord = false;
      this.newTimeRecord = false;
      this.setRecords();
      this.afterDoneCount = 0;
      this.renewPuzzle();
      this.doResetList = false;
      this.doneFirstMove = false;
      this.cageImageLoadedCount = 0;
    },
    renewPuzzle() {
      this.actualOrders = generate(this.arrayLength);
      let solvable = this.mixAndCheckSolvable();
      while (!solvable) {
        solvable = this.mixAndCheckSolvable();
      }
      this.freeElementIndex = this.mixedOrders.findIndex((x) => x === 0);
      this.freeElement = this.actualOrders[this.freeElementIndex];
    },
    mixAndCheckSolvable() {
      this.mixedOrders = generateAndShuffle(this.arrayLength);
      if (isSorted(this.mixedOrders.slice(0, -1))) {
        return false;
      }
      return isSolvable(this.mixedOrders);
    },
    setSpaceBetween() {
      if (this.cageMode) {
        this.spaceBetween = 0;
      } else if (this.proMode) {
        this.spaceBetween = 2;
        if (this.proPalette) {
          this.spaceBetween = 0;
        }
      } else {
        this.spaceBetween = SPACE_BETWEEN_SQUARES;
      }
    },
    incMoves() {
      this.movesCount++;
    },
    reset() {
      this.stopInterval();
      if (this.proMode || this.showConfig) {
        this.initStore();
        return;
      }
      this.doResetList = true;
    },
    stopInterval() {
      clearInterval(this.interval);
      this.interval = 0;
    },
    restartInterval() {
      this.startTime = Date.now();
      this.interval = setInterval(() => {
        this.time = Date.now() - this.startTime + this.savedTime;
      }, 5);
    },
    saveTime() {
      this.savedTime = this.time;
      this.stopInterval();
    },
    invertPaused() {
      if (this.showModal || this.cageMode && !this.finishLoadingAllCageImages) {
        return;
      }
      this.paused = !this.paused;
      if (this.paused) {
        this.saveTime();
      }
    },
    moveLeft() {
      if ((this.freeElement + 1) % this.numLines !== 0) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement + 1),
          Direction.Left
        );
      }
    },
    moveRight() {
      if (this.freeElement % this.numLines !== 0) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement - 1),
          Direction.Right
        );
      }
    },
    moveUp() {
      if (this.freeElementRow < this.numLines) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement + this.numLines),
          Direction.Up
        );
      }
    },
    moveDown() {
      if (this.freeElementRow > 1) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement - this.numLines),
          Direction.Down
        );
      }
    },
    saveActualOrder(order: number, moveDirection: Direction) {
      if (!this.doneFirstMove) {
        this.doneFirstMove = true;
      }
      if (this.interval === 0) {
        this.restartInterval();
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
      this.freeElement = prevOrder;
      this.actualOrders[this.freeElementIndex] = this.freeElement;
      this.incMoves();
    },
    boardSize(squareSize: number): string {
      return `${this.numLines * squareSize + this.spaceBetween * (this.numLines + 1)}px`;
    },
    setUnlockedCages() {
      if (this.cagePath) {
        this.unlockedCages.add(this.cageImgIndex);
        localStorage.setItem('_xcu', btoa(this.unlockedCagesSortedArr.join(',')));
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
    },
    setTimeRecord(timeRecord: number, moves: number, marathonMode: boolean, onlySetToStorage = false) {
      if (timeRecord === this.timeRecord && moves >= this.timeRecordMoves) {
        return;
      }
      this.timeRecord = timeRecord;
      this.timeRecordMoves = moves;
      const headerPart = Math.random().toString().slice(-4);
      const timePart = timeRecord.toString().padStart(6, '0');
      const movesPart = moves.toString().padStart(6, '0');
      const xt = btoa(`${headerPart}${timePart}${movesPart}heh7`);
      localStorage.setItem(marathonMode ? `timeMRecord${this.nLPart}` : `timeRecord${this.nLPart}`, xt);
      if (!onlySetToStorage) {
        this.newTimeRecord = true;
      }
    },
    setMovesRecord(movesRecord: number, time: number, marathonMode: boolean, onlySetToStorage = false) {
      if (movesRecord === this.movesRecord && time >= this.movesRecordTime) {
        return;
      }
      this.movesRecord = movesRecord;
      this.movesRecordTime = time;
      const headerPart = Math.random().toString().slice(-4);
      const movesPart = movesRecord.toString().padStart(6, '0');
      const timePart = time.toString().padStart(6, '0');
      const xm = btoa(`${headerPart}${movesPart}${timePart}heh9`);
      localStorage.setItem(marathonMode ? `movesMRecord${this.nLPart}` : `movesRecord${this.nLPart}`, xm);
      if (!onlySetToStorage) {
        this.newMovesRecord = true;
      }
    },
    loadRecordFromLocalStorage(recordName: string, codeWord: string): Record {
      const lsItem = localStorage.getItem(recordName);
      if (lsItem !== null) {
        const decoded = atob(lsItem);
        const lastPart = decoded.slice(-4);
        if (lastPart !== codeWord && lastPart.replace('y', 'h') !== codeWord.replace('y', 'h')) {
          if (recordName.includes('time')) {
            this.setTimeRecord(0, 0, false, true);
          } else {
            this.setMovesRecord(0, 0, false, true);
          }
          return { record: 0, adding: 0 };
        }
        if (lastPart.slice(2, -1) === 'h') {
          const record = Number(decoded.slice(4, 10));
          const adding = Number(decoded.slice(10, 16));
          return { record, adding };
        } else {
          // previous old variant
          let record = 0;
          if (recordName.includes('time')) {
            record = Number(decoded.slice(4, 8)) * 1000;
          } else {
            record = Number(decoded.slice(4, 8));
          }
          return { record, adding: 0 };
        }
      }
      return { record: 0, adding: 0 };
    },
    loadTimeRecord(marathonMode: boolean): Record {
      try {
        return this.loadRecordFromLocalStorage(marathonMode
          ? `timeMRecord${this.nLPart}`
          : `timeRecord${this.nLPart}`, 'heh7');
      } catch {
        return { record: 0, adding: 0 };
      }
    },
    loadMovesRecord(marathonMode: boolean): Record {
      try {
        return this.loadRecordFromLocalStorage(marathonMode
          ? `movesMRecord${this.nLPart}`
          : `movesRecord${this.nLPart}`, 'heh9');
      } catch {
        return { record: 0, adding: 0 };
      }
    },
    setRecords() {
      if (localStorage.getItem('recordVer') === null) {
        if (localStorage.getItem('timeRecord') !== null || localStorage.getItem('timeMRecord') !== null) {
          // fix for previous format (first load and resave standard records, then the same for marathon)
          if (localStorage.getItem('timeRecord') !== null) {
            this.timeRecord = this.loadTimeRecord(false).record;
            this.movesRecord = this.loadMovesRecord(false).record;
            this.timeRecordMoves = this.movesRecord;
            this.movesRecordTime = this.timeRecord;
            this.setTimeRecord(this.timeRecord, this.movesRecord, false, true);
            this.setMovesRecord(this.movesRecord, this.timeRecord, false, true);
          }
          if (localStorage.getItem('timeMRecord') !== null) {
            this.timeRecord = this.loadTimeRecord(true).record;
            this.movesRecord = this.loadMovesRecord(true).record;
            this.timeRecordMoves = this.movesRecord;
            this.movesRecordTime = this.timeRecord;
            this.setTimeRecord(this.timeRecord, this.movesRecord, true, true);
            this.setMovesRecord(this.movesRecord, this.timeRecord, true, true);
          }
        }
        localStorage.setItem('recordVer', '1');
      }
      const { record, adding } = this.loadTimeRecord(this.marathonMode);
      this.timeRecord = record;
      this.timeRecordMoves = adding;
      const { record: recordM, adding: addingM } = this.loadMovesRecord(this.marathonMode);
      this.movesRecord = recordM;
      this.movesRecordTime = addingM;
    },
    preloadImage(item: string, isPlaceholder = false) {
      const img = new Image();
      let url = '';
      if (isPlaceholder) {
        url = '/cages/placeholder.jpg';
      } else {
        url = `/cages/${item}/complete.jpg`;
      }
      img.src = url;
      const pi: PreloadedImage = { url, item };
      this.preloadedImages.push(pi);
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
        if (value + 1 === this.mixedOrders[i]) {
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
      return this.cageImageLoadedCount === this.arrayLength;
    },
    timeMRecord(): string {
      return displayedTime(this.timeRecord);
    },
    timeStr(): string {
      return displayedTime(this.time);
    },
    showModal(): boolean {
      return this.showConfig || this.showInfo || this.showWinModal || this.showImageGallery;
    },
    cageImgIndex(): number {
      return CAGES_PATH_ARR.indexOf(this.cagePath.toString());
    },
    unlockedCagesSortedArr(): number[] {
      return [...this.unlockedCages].sort((a, b) => a - b);
    },
    unlockedCagesValues(): string[] {
      return CAGES_PATH_ARR.filter((_item, index) => {
        return this.unlockedCages.has(index);
      });
    },
    freeElementCol(): number {
      return getElementCol(this.freeElement, this.numLines);
    },
    freeElementRow(): number {
      return getElementRow(this.freeElement, this.numLines);
    },
    nLPart(): string {
      return this.numLines === CORE_NUM ? '' : this.numLines.toString();
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBaseStore, import.meta.hot));
}
