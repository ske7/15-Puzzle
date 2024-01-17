import { defineStore, acceptHMRUpdate } from 'pinia';
import { useEventBus } from '@vueuse/core';
import {
  CORE_NUM, SPACE_BETWEEN_SQUARES, FMC_BLITZ_TIME,
  CAGES_PATH_ARR, Direction, ControlType, DirectionMap
} from '@/const';
import {
  type PreloadedImage, type Record, type Position,
  type AverageData, type AverageStats, type WasAvgRecord,
  type RepGame, type UserScrambleData, type Response
} from '@/types';
import {
  generateAndShuffle, isSolvable, isSorted, getElementCol, getElementRow,
  displayedTime, calculateTPS, randArrayItem, generateRand,
  swapArrayElements, calculateMD
} from '../utils';
import { useGetFetchAPI } from '../composables/useFetchAPI';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: CORE_NUM,
    spaceBetween: SPACE_BETWEEN_SQUARES,
    time: 0,
    movesCount: 0,
    afterDoneCount: 0,
    mixedOrders: [] as number[],
    currentOrders: [] as number[],
    freeElementIndex: 0,
    doResetList: false,
    interval: 0,
    paused: false,
    timeRecord: 0,
    movesRecord: 0,
    fmcBlitzMovesRecord: 0,
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
    newFMCBlitzMovesRecord: false,
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
    solvePath: [] as string[],
    replayMode: false,
    repGame: null as unknown as RepGame,
    puzzleLoaded: false,
    inReplay: false,
    replaySpeed: 0,
    lastGameID: '0',
    playgroundMode: false,
    savedOrders: [] as number[],
    showAddScramble: false,
    playgroundBestTime: 0,
    playgroundBestTimeMoves: 0,
    playgroundBestMoves: 0,
    playgroundSolvePath: [] as string[],
    playgroundCreatedAt: undefined as (undefined | string),
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
    inPlaceCount: 0,
    opt_m: 0,
    resetUnsolvedPuzzleWithEsc: localStorage.getItem('resetUnsolvedPuzzleWithEsc') === 'true',
    g1000Mode: false,
    sessionId: undefined as (undefined | string),
    keepSession: localStorage.getItem('keepSession') === 'true',
    fmcBlitz: localStorage.getItem('fmcBlitz') === 'true',
    blitzTime: 0,
    blitzInterval: 0,
    blitzScrambleCount: 0,
    blitzMovesCount: 0
  }),
  actions: {
    initStore() {
      this.setSpaceBetween();
      this.freeElementIndex = 0;
      this.time = 0;
      this.savedTime = 0;
      this.movesCount = 0;
      this.solvedPuzzlesInMarathon = 0;
      this.newMovesRecord = false;
      this.newFMCBlitzMovesRecord = false;
      this.newTimeRecord = false;
      this.newPlaygroundTimeRecord = false;
      this.newPlaygroundMovesRecord = false;
      this.setRecords();
      this.afterDoneCount = 0;
      this.solvePath = [];
      this.lastGameID = '0';
      this.clearMarathonData();
      this.renewPuzzle();
      this.doResetList = false;
      this.doneFirstMove = false;
      this.cageImageLoadedCount = 0;
      if (this.fmcBlitz) {
        this.blitzScrambleCount = this.numLines === 3 ? 50 : 12;
        this.stopBlitzInterval();
        this.blitzTime = 0;
        this.blitzMovesCount = 0;
      }
    },
    setPuzzleData() {
      this.freeElementIndex = this.mixedOrders.findIndex((x) => x === 0);
      this.currentOrders = this.mixedOrders.slice();
      this.inPlaceCount = this.startOrderedCount;
      this.doneFirstMove = false;
      if (!this.g1000Mode && this.keepSession) {
        const cs = localStorage.getItem('_xcs');
        const sessionId = localStorage.getItem('_xss');
        if (cs !== null && sessionId !== null) {
          this.consecutiveSolves = Number(atob(cs));
          this.sessionId = atob(sessionId);
        }
        localStorage.removeItem('_xss');
        localStorage.removeItem('_xcs');
      }
    },
    renewPuzzle() {
      if (this.fmcBlitz) {
        this.doneFirstMove = false;
      }
      if (this.g1000Mode) {
        this.getNextG1000().then(() => {
          this.setPuzzleData();
          this.opt_m = 0;
        })
          .catch(error => {
            console.log(error as string);
          });
        return true;
      }
      let solvable = this.mixAndCheckSolvable();
      while (!solvable) {
        solvable = this.mixAndCheckSolvable();
      }
      if (this.playgroundMode) {
        this.playgroundModeRenew();
      } else {
        this.opt_m = 0;
      }
      this.setPuzzleData();
    },
    updatePlaygroundStats(res: Response) {
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
    },
    playgroundModeRenew() {
      this.savedOrders = this.mixedOrders;
      if (this.checkUserScrambleInDB) {
        this.opt_m = 0;
        if (this.token != null) {
          void useGetFetchAPI(`user_scramble?scramble=${this.mixedOrders.join(',')}`, this.token)
            .then((res) => {
              this.updatePlaygroundStats(res);
              if (res.opt_m != null) {
                this.opt_m = res.opt_m;
              }
            })
            .catch(error => {
              console.log(error as string);
            });
        }
        this.checkUserScrambleInDB = false;
      }
    },
    async getNextG1000() {
      await useGetFetchAPI('next_gt', this.token)
        .then((res) => {
          if (res.id === 1000) {
            location.href = import.meta.env.VITE_BASE_URL;
            return false;
          }
          this.mixedOrders = res.scramble!.split(',').map(x => +x);
          this.consecutiveSolves = res.id!;
          return true;
        })
        .catch(error => {
          console.log(error as string);
          return false;
        });
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
      if (!(this.replayMode || this.playgroundMode) && calculateMD(this.mixedOrders) < this.numLines) {
        return false;
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
        localStorage.removeItem('_xss');
        localStorage.removeItem('_xcs');
        this.resetConsecutiveSolves();
      }
      this.stopInterval();
      this.stopBlitzInterval();
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
    stopBlitzInterval() {
      clearInterval(this.blitzInterval);
      this.blitzInterval = 0;
    },
    restartInterval() {
      this.startTime = Date.now();
      this.interval = window.setInterval(() => {
        this.time = Date.now() - this.startTime + this.savedTime;
      }, 5);
      if (this.fmcBlitz && this.solvedPuzzlesInMarathon === 0) {
        this.blitzTime = FMC_BLITZ_TIME * 1000;
        this.blitzInterval = window.setInterval(() => {
          this.blitzTime -= 5;
        }, 5);
      }
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
      if ((this.freeElementIndex + 1) % this.numLines !== 0) {
        this.saveState(this.freeElementIndex + 1, Direction.Left, control);
      }
    },
    moveRight(control: ControlType) {
      if (this.freeElementIndex % this.numLines !== 0) {
        this.saveState(this.freeElementIndex - 1, Direction.Right, control);
      }
    },
    moveUp(control: ControlType) {
      if (this.freeElementRow < this.numLines) {
        this.saveState(this.freeElementIndex + this.numLines, Direction.Up, control);
      }
    },
    moveDown(control: ControlType) {
      if (this.freeElementRow > 1) {
        this.saveState(this.freeElementIndex - this.numLines, Direction.Down, control);
      }
    },
    checkDiffBetweenElementsAndMove(currentElementIndex: number, moveDirection: Direction, control: ControlType) {
      let diff = Math.abs(this.freeElementIndex + 1 - currentElementIndex);
      if ([Direction.Up, Direction.Down].includes(moveDirection)) {
        diff = diff / this.numLines;
      }
      if (diff > 1) {
        for (let i = 0; i < diff; i++) {
          switch (moveDirection) {
            case Direction.Left:
              this.moveLeft(control);
              break;
            case Direction.Right:
              this.moveRight(control);
              break;
            case Direction.Up:
              this.moveUp(control);
              break;
            case Direction.Down:
              this.moveDown(control);
              break;
            default:
          }
        }
        return true;
      }
      return false;
    },
    saveState(currentElementIndex: number, moveDirection: Direction, control: ControlType) {
      if (!this.doneFirstMove) {
        this.doneFirstMove = true;
        if (this.fmcBlitz) {
          this.opt_m = 0;
          this.time = 0;
          this.movesCount = 0;
          this.solvePath = [];
          this.lastGameID = '0';
          this.doResetList = false;
        }
      }
      if (this.interval === 0) {
        this.restartInterval();
      }
      switch (moveDirection) {
        case Direction.Right:
          swapArrayElements(this.currentOrders, currentElementIndex, currentElementIndex + 1);
          break;
        case Direction.Left:
          swapArrayElements(this.currentOrders, currentElementIndex, currentElementIndex - 1);
          break;
        case Direction.Down:
          swapArrayElements(this.currentOrders, currentElementIndex, currentElementIndex + this.numLines);
          break;
        case Direction.Up:
          swapArrayElements(this.currentOrders, currentElementIndex, currentElementIndex - this.numLines);
          break;
        default:
      }
      this.freeElementIndex = currentElementIndex;
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
    setFMCBlitzRecord(fmcBlitzMovesRecord: number, time: number, puzzleSize: number, onlySetToStorage = false) {
      if (fmcBlitzMovesRecord === this.fmcBlitzMovesRecord) {
        return;
      }
      const nLPart = this.getnLPart(puzzleSize);
      this.fmcBlitzMovesRecord = fmcBlitzMovesRecord;
      const headerPart = generateRand().toString().slice(-4);
      const movesPart = fmcBlitzMovesRecord.toString().padStart(6, '0');
      const timePart = time.toString().padStart(6, '0');
      const xm = btoa(`${headerPart}${movesPart}${timePart}heh8`);
      localStorage.setItem(`fmcBlitzMovesRecord${nLPart}`, xm);
      if (!onlySetToStorage) {
        this.newFMCBlitzMovesRecord = true;
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
          } else if (recordName.includes('fmcBlitz')) {
            this.setFMCBlitzRecord(0, 0, puzzleSize, true);
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
          return { record: 0, adding: 0 };
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
    loadFMCBlitzMovesRecord(puzzleSize: number): Record {
      const nLPart = this.getnLPart(puzzleSize);
      try {
        return this.loadRecordFromLocalStorage(`fmcBlitzMovesRecord${nLPart}`, puzzleSize, false, 'heh8');
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
      const { record: recordM, adding: addingM } = this.loadMovesRecord(this.marathonMode, this.numLines);
      this.movesRecord = recordM;
      this.movesRecordTime = addingM;
      const { record: recordF } = this.loadFMCBlitzMovesRecord(this.numLines);
      this.fmcBlitzMovesRecord = recordF;
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
      if (this.token == null) {
        return;
      }
      this.currentAverages.push({
        code: -1,
        puzzle_size: this.numLines,
        time: stats?.aoSt,
        moves: stats?.aoSm,
        tps: stats?.aoStps
      });
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
      if (this.g1000Mode) {
        this.currentAverages.push({
          code: 1000,
          puzzle_size: this.numLines,
          time: stats?.ao1000t,
          moves: stats?.ao1000m,
          tps: stats?.ao1000tps
        });
      }
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
      this.setCurrentAverages({} satisfies AverageStats, true);
      this.setWasAvgRecords([]);
    },
    setSessionId(): void {
      if (this.token == null || this.userName === undefined) {
        return;
      }
      if (this.consecutiveSolves === 1) {
        const rand = generateRand().toString().slice(-4);
        this.sessionId = `${this.userName.slice(0, 2)}${rand}_${btoa(new Date().getTime().toString())}`.toLowerCase().replace(/=/g, '');
      }
      if (!this.g1000Mode && this.keepSession) {
        localStorage.setItem('_xss', btoa(this.sessionId!));
        localStorage.setItem('_xcs', btoa(this.consecutiveSolves.toString()));
      }
    },
    loadAverages(): void {
      if (this.proMode) {
        if (!this.g1000Mode && this.keepSession) {
          const cs = localStorage.getItem('_xcs');
          const sessionId = localStorage.getItem('_xss');
          if (cs !== null && sessionId !== null) {
            this.consecutiveSolves = Number(atob(cs));
            this.sessionId = atob(sessionId);
          }
        }
        const puzzleType = this.marathonMode ? 'marathon' : 'standard';
        // eslint-disable-next-line vue/max-len
        void useGetFetchAPI(`user_averages?puzzle_size=${this.numLines}&puzzle_type=${puzzleType}&cs_param=${this.consecutiveSolves}&gt1000mode=${this.g1000Mode}&session_id=${this.sessionId}`,
          this.token)
          .then((res) => {
            this.setCurrentAverages(res.stats as unknown as AverageStats);
          });
      }
    },
    updateCurrentAverages() {
      if (this.proMode && this.token != null) {
        const puzzleType = this.marathonMode ? 'marathon' : 'standard';
        void useGetFetchAPI(`user_averages?puzzle_size=${this.numLines}&puzzle_type=${puzzleType}&cs_param=0`,
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
      localStorage.removeItem('_xss');
      localStorage.removeItem('_xcs');
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
    startOrderedCount(): number {
      let count = 0;
      this.mixedOrders.forEach((value, i) => {
        if (value === i + 1) {
          count += 1;
        }
      });
      return count;
    },
    isDone(): boolean {
      return this.inPlaceCount === this.arrayLength - 1;
    },
    afterDoneAnimationEnd(): boolean {
      if (!this.isDone || this.proMode) {
        if (this.proMode) {
          this.afterDoneCount = this.arrayLength - 1;
        }
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
    blitzTimeStr(): string {
      const longMode = !(this.solvedPuzzlesInMarathon === 0 && this.blitzTime === 0);
      return this.solvedPuzzlesInMarathon === 0 && this.blitzTime === 0
        ? FMC_BLITZ_TIME.toString()
        : displayedTime(this.blitzTime, longMode);
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
      return getElementCol(this.freeElementIndex + 1, this.numLines);
    },
    freeElementRow(): number {
      return getElementRow(this.freeElementIndex + 1, this.numLines);
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
