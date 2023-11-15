import { defineStore, acceptHMRUpdate } from 'pinia';
import { useEventBus } from '@vueuse/core';
import {
  CORE_NUM, SPACE_BETWEEN_SQUARES,
  CAGES_PATH_ARR, Direction, ControlType, DirectionMap
} from '@/const';
import {
  type PreloadedImage, type Record, type Position,
  type AverageData, type AverageStats, type WasAvgRecord,
  type RepGame, type UserScrambleData
} from '@/types';
import {
  generateAndShuffle, generate, isSolvable, isSorted,
  getArrayKeyByValue, getElementCol, getElementRow,
  displayedTime, calculateTPS, randArrayItem, generateRand, convertToNumbersArray
} from '../utils';
import { useGetFetchAPI } from '../composables/useFetchAPI';

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
    cagePath: '',
    shownCages: new Set<string>(),
    cageCompleteImgLoaded: false,
    cageImageLoadedCount: 0,
    showInfo: false,
    enableCageMode: localStorage.getItem('enableCageMode') === 'true',
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
    proMode: localStorage.getItem('proMode') === 'true',
    marathonMode: localStorage.getItem('marathonMode') === 'true',
    solvedPuzzlesInMarathon: 0,
    startTime: 0,
    savedTime: 0,
    darkMode: localStorage.getItem('darkMode') === 'true',
    boardPos: {} as unknown as Position,
    token: localStorage.getItem('token') as (string | undefined),
    userName: undefined as (undefined | string),
    isMoving: false,
    moveDoneBy: ControlType.Mouse,
    isNetworkError: false,
    isFetching: false,
    showRegModal: false,
    showUserAccount: false,
    showLeaderBoard: false,
    hoverOnControl: localStorage.getItem('hoverOnControl') === 'true',
    currentAverages: [] as AverageData[],
    prevAverages: [] as AverageData[],
    hideCurrentAverages: localStorage.getItem('hideCurrentAverages') === 'true',
    wasAvgRecords: [] as WasAvgRecord[],
    consecutiveSolves: 0,
    sortAveragesByProValues: localStorage.getItem('sortAveragesByProValues') === 'true',
    solvePath: [] as string[],
    replayMode: false,
    repGame: null as unknown as RepGame,
    puzzleLoaded: false,
    inReplay: false,
    replaySpeed: 0,
    lastGameID: 0,
    playgroundMode: false,
    savedOrders: [] as number[],
    showAddScramble: false,
    playgroundBestTime: 0,
    playgroundBestTimeMoves: 0,
    playgroundBestMoves: 0,
    playgroundSolvePath: [] as string[],
    newPlaygroundMovesRecord: false,
    newPlaygroundTimeRecord: false,
    userScrambleId: 0,
    checkUserScrambleInDB: false,
    publicId: '',
    otherUserName: '',
    wasReplay: false,
    showScrambleList: false,
    marathonScrambles: '',
    marathonSolves: '',
    marathonReplay: false,
    t3p3Mode: false,
    t3p3Path: [] as string[]
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
      this.newPlaygroundTimeRecord = false;
      this.newPlaygroundMovesRecord = false;
      this.setRecords();
      this.afterDoneCount = 0;
      this.solvePath = [];
      this.lastGameID = 0;
      this.clearMarathonData();
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
      if (this.playgroundMode) {
        this.playgroundModeRenew();
      }
      this.freeElementIndex = this.mixedOrders.findIndex((x) => x === 0);
      this.freeElement = this.actualOrders[this.freeElementIndex];
    },
    playgroundModeRenew() {
      this.savedOrders = this.mixedOrders;
      if (this.checkUserScrambleInDB) {
        if (this.token != null) {
          void useGetFetchAPI(`user_scramble?scramble=${this.mixedOrders.join(',')}`, this.token)
            .then((res) => {
              if (res.stats != null) {
                const stats = res.stats as unknown as UserScrambleData;
                if (stats.id != null) {
                  this.userScrambleId = stats.id;
                }
                this.playgroundBestTime = stats.best_time!;
                this.playgroundBestTimeMoves = stats.best_time_moves!;
                this.playgroundBestMoves = stats.best_moves!;
                this.playgroundSolvePath = stats.solve_path!.split('');
                this.publicId = stats.public_id ?? '';
              } else {
                this.playgroundBestTime = 0;
                this.playgroundBestTimeMoves = 0;
                this.playgroundBestMoves = 0;
                this.playgroundSolvePath = [];
                this.publicId = '';
                this.userScrambleId = 0;
              }
            })
            .catch(error => {
              console.log(error as string);
            });
        }
        this.checkUserScrambleInDB = false;
      }
    },
    mixAndCheckSolvable() {
      if (this.replayMode) {
        let scramble = this.repGame.scramble;
        if (this.marathonReplay) {
          scramble = this.repGame.scramble.split(';')[0];
        }
        this.mixedOrders = scramble.split(',').map(x => +x);
      } else if (this.playgroundMode && this.savedOrders.length > 0) {
        this.mixedOrders = this.savedOrders;
      } else if (this.t3p3Mode && this.marathonMode && this.numLines === 3) {
        this.mixedOrders = convertToNumbersArray(this.t3p3Path[this.solvedPuzzlesInMarathon]);
      } else if (this.playgroundMode && this.savedOrders.length === 0) {
        this.userScrambleId = 0;
        this.publicId = '';
        this.playgroundBestTime = 0;
        this.playgroundBestTimeMoves = 0;
        this.playgroundBestMoves = 0;
        this.playgroundSolvePath = [];
        this.checkUserScrambleInDB = true;
        this.mixedOrders = generateAndShuffle(this.arrayLength);
      } else {
        this.mixedOrders = generateAndShuffle(this.arrayLength);
      }
      if (isSorted(this.mixedOrders.slice(0, -1))) {
        return false;
      }
      return isSolvable(this.mixedOrders);
    },
    clearMarathonData() {
      this.marathonScrambles = '';
      this.marathonSolves = '';
    },
    setSpaceBetween() {
      if (this.cageMode) {
        this.spaceBetween = 0;
      } else if (this.proMode) {
        this.spaceBetween = 0;
      } else {
        this.spaceBetween = SPACE_BETWEEN_SQUARES;
      }
    },
    incMoves() {
      this.movesCount += 1;
    },
    reset(configMode: boolean) {
      if (!this.isDone && this.proMode) {
        this.resetConsecutiveSolves();
      }
      this.stopInterval();
      if (this.proMode || this.showConfig || configMode) {
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
      this.interval = window.setInterval(() => {
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
    moveLeft(control: ControlType) {
      if ((this.freeElement + 1) % this.numLines !== 0) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement + 1),
          Direction.Left,
          control
        );
      }
    },
    moveRight(control: ControlType) {
      if (this.freeElement % this.numLines !== 0) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement - 1),
          Direction.Right,
          control
        );
      }
    },
    moveUp(control: ControlType) {
      if (this.freeElementRow < this.numLines) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement + this.numLines),
          Direction.Up,
          control
        );
      }
    },
    moveDown(control: ControlType) {
      if (this.freeElementRow > 1) {
        this.saveActualOrder(
          getArrayKeyByValue(this.actualOrders, this.freeElement - this.numLines),
          Direction.Down,
          control
        );
      }
    },
    saveActualOrder(order: number, moveDirection: Direction, control: ControlType) {
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
      this.moveDoneBy = control;
      this.solvePath.push(DirectionMap.get(moveDirection) ?? '');
    },
    boardSize(squareSize: number): string {
      return `${this.numLines * squareSize + this.spaceBetween * (this.numLines + 1)}px`;
    },
    setUnlockedCages() {
      if (this.cagePath !== '') {
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
    doPrepareCageMode() {
      this.cageMode = true;
      if (this.unlockedCages.size === this.cagesCount) {
        if (this.shownCages.size === CAGES_PATH_ARR.length) {
          this.shownCages.clear();
        }
        this.cagePath = randArrayItem(CAGES_PATH_ARR, Array.from(this.shownCages));
        this.shownCages.add(this.cagePath);
      } else {
        this.cagePath = randArrayItem(CAGES_PATH_ARR, this.unlockedCagesValues);
      }
    },
    getnLPart(puzzleSize: number): string {
      return puzzleSize === CORE_NUM ? '' : puzzleSize.toString();
    },
    setTimeRecord(timeRecord: number, moves: number, puzzleSize: number,
      marathonMode: boolean, onlySetToStorage = false) {
      if (timeRecord === this.timeRecord && moves >= this.timeRecordMoves) {
        return;
      }
      const nLPart = this.getnLPart(puzzleSize);
      this.timeRecord = timeRecord;
      this.timeRecordMoves = moves;
      const headerPart = generateRand().toString().slice(-4);
      const timePart = timeRecord.toString().padStart(6, '0');
      const movesPart = moves.toString().padStart(6, '0');
      const xt = btoa(`${headerPart}${timePart}${movesPart}heh7`);
      localStorage.setItem(marathonMode ? `timeMRecord${nLPart}` : `timeRecord${nLPart}`, xt);
      if (!onlySetToStorage) {
        this.newTimeRecord = true;
      }
    },
    setMovesRecord(movesRecord: number, time: number, puzzleSize: number,
      marathonMode: boolean, onlySetToStorage = false) {
      if (movesRecord === this.movesRecord && time >= this.movesRecordTime) {
        return;
      }
      const nLPart = this.getnLPart(puzzleSize);
      this.movesRecord = movesRecord;
      this.movesRecordTime = time;
      const headerPart = generateRand().toString().slice(-4);
      const movesPart = movesRecord.toString().padStart(6, '0');
      const timePart = time.toString().padStart(6, '0');
      const xm = btoa(`${headerPart}${movesPart}${timePart}heh9`);
      localStorage.setItem(marathonMode ? `movesMRecord${nLPart}` : `movesRecord${nLPart}`, xm);
      if (!onlySetToStorage) {
        this.newMovesRecord = true;
      }
    },
    loadRecordFromLocalStorage(recordName: string, puzzleSize: number,
      marathonMode: boolean, codeWord: string): Record {
      const lsItem = localStorage.getItem(recordName);
      if (lsItem !== null) {
        const decoded = atob(lsItem);
        const lastPart = decoded.slice(-4);
        if (lastPart !== codeWord && lastPart.replace('y', 'h') !== codeWord.replace('y', 'h')) {
          if (recordName.includes('time')) {
            this.setTimeRecord(0, 0, puzzleSize, marathonMode, true);
          } else {
            this.setMovesRecord(0, 0, puzzleSize, marathonMode, true);
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
    loadTimeRecord(marathonMode: boolean, puzzleSize: number): Record {
      const nLPart = this.getnLPart(puzzleSize);
      try {
        return this.loadRecordFromLocalStorage(marathonMode
          ? `timeMRecord${nLPart}`
          : `timeRecord${nLPart}`, puzzleSize, marathonMode, 'heh7');
      } catch {
        return { record: 0, adding: 0 };
      }
    },
    loadMovesRecord(marathonMode: boolean, puzzleSize: number): Record {
      const nLPart = this.getnLPart(puzzleSize);
      try {
        return this.loadRecordFromLocalStorage(marathonMode
          ? `movesMRecord${nLPart}`
          : `movesRecord${nLPart}`, puzzleSize, marathonMode, 'heh9');
      } catch {
        return { record: 0, adding: 0 };
      }
    },
    setRecords() {
      if (localStorage.getItem('recordVer') === null) {
        if (localStorage.getItem('timeRecord') !== null || localStorage.getItem('timeMRecord') !== null) {
          // fix for previous format (first load and resave standard records, then the same for marathon)
          if (localStorage.getItem('timeRecord') !== null) {
            this.timeRecord = this.loadTimeRecord(false, this.numLines).record;
            this.movesRecord = this.loadMovesRecord(false, this.numLines).record;
            this.timeRecordMoves = this.movesRecord;
            this.movesRecordTime = this.timeRecord;
            this.setTimeRecord(this.timeRecord, this.movesRecord, this.numLines, false, true);
            this.setMovesRecord(this.movesRecord, this.timeRecord, this.numLines, false, true);
          }
          if (localStorage.getItem('timeMRecord') !== null) {
            this.timeRecord = this.loadTimeRecord(true, this.numLines).record;
            this.movesRecord = this.loadMovesRecord(true, this.numLines).record;
            this.timeRecordMoves = this.movesRecord;
            this.movesRecordTime = this.timeRecord;
            this.setTimeRecord(this.timeRecord, this.movesRecord, this.numLines, true, true);
            this.setMovesRecord(this.movesRecord, this.timeRecord, this.numLines, true, true);
          }
        }
        localStorage.setItem('recordVer', '1');
      }
      const { record, adding } = this.loadTimeRecord(this.marathonMode, this.numLines);
      this.timeRecord = record;
      this.timeRecordMoves = adding;
      const { record: recordM, adding: addingM } =
        this.loadMovesRecord(this.marathonMode, this.numLines);
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
    },
    setCurrentAverages(stats?: AverageStats, clearPrev = false): void {
      if (clearPrev) {
        this.prevAverages = [];
      } else {
        this.prevAverages = this.currentAverages;
      }
      this.currentAverages = [];
      this.currentAverages.push({
        code: 5,
        puzzle_size: this.numLines,
        time: stats?.ao5t,
        moves: stats?.ao5m,
        tps: stats?.ao5tps
      });
      this.currentAverages.push({
        code: 12,
        puzzle_size: this.numLines,
        time: stats?.ao12t,
        moves: stats?.ao12m,
        tps: stats?.ao12tps
      });
      this.currentAverages.push({
        code: 50,
        puzzle_size: this.numLines,
        time: stats?.ao50t,
        moves: stats?.ao50m,
        tps: stats?.ao50tps
      });
      this.currentAverages.push({
        code: 100,
        puzzle_size: this.numLines,
        time: stats?.ao100t,
        moves: stats?.ao100m,
        tps: stats?.ao100tps
      });
    },
    setWasAvgRecords(wasAvgRecords?: WasAvgRecord[]): void {
      if (wasAvgRecords == null) {
        this.wasAvgRecords = [];
      } else {
        this.wasAvgRecords = wasAvgRecords;
      }
    },
    incConsecutiveSolves(): void {
      this.consecutiveSolves += 1;
    },
    resetConsecutiveSolves(): void {
      this.consecutiveSolves = 0;
    },
    loadAverages(): void {
      if (this.proMode) {
        const puzzleType = this.marathonMode ? 'marathon' : 'standard';
        void useGetFetchAPI(`user_averages?puzzle_size=${this.numLines}&puzzle_type=${puzzleType}`,
          this.token)
          .then((res) => {
            this.setCurrentAverages(res.stats as unknown as AverageStats);
          });
      }
    },
    updateCurrentAverages() {
      if (this.proMode && this.token != null) {
        const puzzleType = this.marathonMode ? 'marathon' : 'standard';
        void useGetFetchAPI(`user_averages?puzzle_size=${this.numLines}&puzzle_type=${puzzleType}`,
          this.token)
          .then((res) => {
            this.setCurrentAverages(res.stats as unknown as AverageStats, true);
            this.setWasAvgRecords([]);
          });
      }
    },
    initAfterNewPuzzleSize() {
      const eventBus = useEventBus<string>('event-bus');
      localStorage.setItem('numLines', this.numLines.toString());
      if (!this.playgroundMode) {
        this.updateCurrentAverages();
      }
      this.resetConsecutiveSolves();
      this.savedOrders = [];
      eventBus.emit('restart', 'fromConfig');
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
      return this.showConfig || this.showInfo || this.showWinModal ||
        this.showImageGallery || this.showRegModal || this.showUserAccount ||
        this.showLeaderBoard || this.showAddScramble || this.showScrambleList;
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
    registered(): boolean {
      return this.token != null;
    },
    tps(): string {
      return calculateTPS(this.movesCount, this.time);
    },
    getControlTypeStr(): string {
      let controlType;
      switch (this.moveDoneBy) {
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
    },
    sharedPlaygroundMode(): boolean {
      return this.playgroundMode &&
        this.publicId !== '' &&
        this.userName != null &&
        this.otherUserName !== '' &&
        this.userName !== this.otherUserName;
    },
    getTime(): number {
      let time = 0;
      if (this.time === 0) {
        time = 1;
      } else {
        time = this.time;
      }
      return time;
    }
  }
});

if (import.meta.hot != null) {
  import.meta.hot.accept(acceptHMRUpdate(useBaseStore, import.meta.hot));
}
