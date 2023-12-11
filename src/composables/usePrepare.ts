import { onMounted, computed, type ComputedRef } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useKeyDown } from '../composables/useKeyDown';
import { CORE_NUM, CAGES_PATH_ARR, cores, baseUrl } from '@/const';
import { type RepGame, type UserScrambleData, type Response } from '@/types';
import { useGetFetchAPI } from '../composables/useFetchAPI';

function getNumLinesFromLocalStorage(): number {
  let numLines: number;
  const storageNumLines = localStorage.getItem('numLines');
  if (storageNumLines === null || isNaN(Number(storageNumLines)) || !cores.includes(Number(storageNumLines))) {
    localStorage.setItem('numLines', CORE_NUM.toString());
    numLines = CORE_NUM;
  } else {
    numLines = Number(storageNumLines);
  }
  return numLines;
}

function setStartParams(locationStr: string): void {
  const baseStore = useBaseStore();
  if (locationStr.includes('dark')) {
    baseStore.darkMode = true;
    localStorage.setItem('darkMode', 'true');
  }
  document.documentElement.setAttribute('data-theme', baseStore.darkMode ? 'dark' : 'light');
  if (locationStr.includes('pro') || locationStr.includes('playground')) {
    baseStore.proMode = true;
    if (localStorage.getItem('proMode') === null) {
      baseStore.hoverOnControl = true;
      localStorage.setItem('hoverOnControl', 'true');
    }
    localStorage.setItem('proMode', 'true');
    baseStore.enableCageMode = false;
    localStorage.setItem('enableCageMode', 'false');
  }
}

const initStore = (numLines: number): void => {
  const baseStore = useBaseStore();

  baseStore.numLines = numLines;
  baseStore.initStore();
  baseStore.puzzleLoaded = true;
};

const checkCurrentUser = (gameId: string): void => {
  const baseStore = useBaseStore();

  if (baseStore.token != null) {
    useGetFetchAPI('get_current_user', baseStore.token)
      .then((res) => {
        baseStore.token = res.token;
        localStorage.setItem('token', String(baseStore.token));
        baseStore.userName = res.name;
        if (gameId === '0' && !baseStore.playgroundMode) {
          baseStore.loadAverages();
        }
      })
      .catch(error => {
        console.log(error as string);
      });
  } else {
    void useGetFetchAPI('version');
  }
};

const initPlayground = (res: Response, publicId: string): void => {
  const baseStore = useBaseStore();

  if (res.stats != null) {
    const stats = res.stats as unknown as UserScrambleData;
    baseStore.savedOrders = stats.scramble!.split(',').map(x => +x);
    baseStore.playgroundBestTime = stats.best_time!;
    baseStore.playgroundBestTimeMoves = stats.best_time_moves!;
    baseStore.playgroundBestMoves = stats.best_moves!;
    if (stats.solve_path != null) {
      baseStore.playgroundSolvePath = stats.solve_path.split('');
    }
    baseStore.userScrambleId = stats.id!;
    baseStore.otherUserName = stats.name!;
    baseStore.publicId = publicId;
  }
};

const checkPublicID = (initNumLines: number): void => {
  const baseStore = useBaseStore();

  let numLines = initNumLines;
  if (location.href.toLowerCase().includes('public_id')) {
    const searchParams = new URLSearchParams(location.search);
    const publicId = searchParams.get('public_id');
    if (publicId != null) {
      if (baseStore.token != null) {
        void useGetFetchAPI(`user_scramble?public_id=${publicId}`, baseStore.token)
          .then((res) => {
            if (res.stats != null) {
              initPlayground(res, publicId);
              numLines = Math.sqrt(baseStore.savedOrders.length);
            }
            initStore(numLines);
          })
          .catch(error => {
            console.log(error as string);
          });
      } else {
        initStore(numLines);
      }
    }
  } else {
    initStore(numLines);
  }
};

const checkPlaygroundMode = (locationStr: string, initNumLines: number): void => {
  const baseStore = useBaseStore();

  let numLines = initNumLines;
  if (locationStr.includes('playground')) {
    baseStore.playgroundMode = true;
    checkCurrentUser('0');
    baseStore.g1000Mode = false;
    baseStore.marathonMode = false;
    localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
    const sharedPlaygroundScramble = localStorage.getItem('sharedPlaygroundScramble');
    if (sharedPlaygroundScramble !== null) {
      baseStore.savedOrders = sharedPlaygroundScramble.split(',').map(x => +x);
      baseStore.checkUserScrambleInDB = true;
      numLines = Math.sqrt(baseStore.savedOrders.length);
      localStorage.removeItem('sharedPlaygroundScramble');
    }
    checkPublicID(numLines);
  }
};

const checkCageMode = (locationStr: string): void => {
  const baseStore = useBaseStore();

  if (!baseStore.playgroundMode && locationStr.includes('cage')) {
    baseStore.marathonMode = false;
    baseStore.g1000Mode = false;
    localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
    baseStore.proMode = false;
    localStorage.setItem('proMode', baseStore.proMode.toString());
    baseStore.numLines = CORE_NUM;
    baseStore.initAfterNewPuzzleSize();
    baseStore.enableCageMode = true;
    localStorage.setItem('enableCageMode', 'true');
  }
};

const checkG1000 = (locationStr: string): void => {
  const baseStore = useBaseStore();

  if (baseStore.token != null && locationStr.includes('g1000')) {
    baseStore.proMode = true;
    localStorage.setItem('proMode', baseStore.proMode.toString());
    baseStore.marathonMode = false;
    localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
    baseStore.g1000Mode = true;
    baseStore.numLines = 3;
    localStorage.setItem('numLines', baseStore.numLines.toString());
    initStore(baseStore.numLines);
  }
};

const checkGameLink = (gameId: string): void => {
  const baseStore = useBaseStore();

  if (gameId !== '0') {
    baseStore.g1000Mode = false;
    useGetFetchAPI(`game?game_id=${gameId}`, baseStore.token)
      .then((res) => {
        if (res.stats != null) {
          if (!baseStore.proMode) {
            baseStore.proMode = true;
            baseStore.hoverOnControl = true;
            baseStore.enableCageMode = false;
            baseStore.cageMode = false;
          }
          baseStore.replayMode = true;
          baseStore.repGame = res.stats as unknown as RepGame;
          baseStore.marathonReplay = (res.stats as unknown as RepGame).puzzle_type === 'marathon';
          initStore(baseStore.repGame.puzzle_size);
        } else {
          location.href = baseUrl;
        }
      })
      .catch(error => {
        console.log(error as string);
      });
  }
};

export const usePrepare = (): void => {
  const baseStore = useBaseStore();

  useKeyDown();

  const numLines = getNumLinesFromLocalStorage();
  const locationStr = location.href.toLowerCase();
  setStartParams(locationStr);

  checkG1000(locationStr);

  checkPlaygroundMode(locationStr, numLines);

  checkCageMode(locationStr);

  let gameId = '0';
  if (location.href.toLowerCase().includes('game_id')) {
    const searchParams = new URLSearchParams(location.search);
    const gameIdParam = searchParams.get('game_id');
    if (gameIdParam !== null) {
      gameId = gameIdParam;
    }
  }
  checkGameLink(gameId);

  checkCurrentUser(gameId);

  onMounted(() => {
    if (gameId === '0' && !baseStore.playgroundMode && !baseStore.g1000Mode) {
      if (baseStore.enableCageMode) {
        baseStore.loadUnlockedCagesFromLocalStorage();
        baseStore.doPrepareCageMode();
        setTimeout(() => {
          if (baseStore.unlockedCages.size > 0) {
            const first = [...baseStore.unlockedCages][0];
            baseStore.preloadImage(CAGES_PATH_ARR[first]);
          }
        }, 1000);
      }
      initStore(numLines);
    }
  });
};

export const getSquareSize = (): Record<string, ComputedRef<number>> => {
  const baseStore = useBaseStore();

  const { width: windowWidth } = useWindowSize();

  const squareSize = computed(() => {
    const spaces = baseStore.spaceBetween * 5;
    let cageAdd = 0;
    if (baseStore.proMode) {
      cageAdd = 22;
      switch (baseStore.numLines) {
        case 3:
          cageAdd += 34;
          break;
        case 5:
          cageAdd -= 21;
          break;
        case 6:
          cageAdd -= 34;
          break;
        case 7:
          cageAdd -= 42;
          break;
        case 8:
          cageAdd -= 50;
          break;
        default:
      }
    } else {
      cageAdd = 12;
      switch (baseStore.numLines) {
        case 3:
          cageAdd += 33;
          break;
        case 5:
          cageAdd -= 20;
          break;
        case 6:
          cageAdd -= 33;
          break;
        case 7:
          cageAdd -= 43;
          break;
        case 8:
          cageAdd -= 50;
          break;
        default:
      }
    }
    let value = 0;
    if (windowWidth.value <= 370) {
      if (baseStore.proMode) {
        value = Math.floor((windowWidth.value - (spaces + 40)) / baseStore.numLines);
      } else {
        value = Math.floor((windowWidth.value - (spaces + 70)) / baseStore.numLines);
      }
    } else if (windowWidth.value <= 480) {
      value = Math.floor((windowWidth.value - (spaces + 50)) / baseStore.numLines);
    } else if (windowWidth.value <= 820 && windowWidth.value >= 600) {
      value = 100 + cageAdd;
    } else {
      value = 80 + cageAdd;
    }
    return value;
  });

  return { squareSize };
};
