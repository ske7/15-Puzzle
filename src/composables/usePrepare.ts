import { onMounted, computed, type ComputedRef } from 'vue';
import { useBaseStore } from '../stores/base';
import { useKeyDown } from './useKeyDown';
import { CORE_NUM, CAGES_PATH_ARR, cores, fmcBlitzCores, baseUrl } from '@/const';
import { type RepGame, type UserScrambleData } from '@/types';
import { useGetFetchAPI } from './useFetchAPI';
import { useWindowWidth } from './useWindowWidth';
import { redirectTo } from '@/utils';

function getNumLinesFromLocalStorage(): number {
  let numLines: number;
  const storageNumLines = localStorage.getItem('numLines');
  if (storageNumLines === null || Number.isNaN(Number(storageNumLines)) || !cores.includes(Number(storageNumLines))) {
    localStorage.setItem('numLines', CORE_NUM.toString());
    numLines = CORE_NUM;
  } else {
    numLines = Number(storageNumLines);
  }
  return numLines;
}

function checkModeSize(initNumLines: number): number {
  const baseStore = useBaseStore();

  if (baseStore.enableCageMode) {
    return CORE_NUM;
  }
  if (baseStore.fmcBlitz && !fmcBlitzCores.includes(initNumLines)) {
    localStorage.setItem('numLines', CORE_NUM.toString());
    return CORE_NUM;
  }
  return initNumLines;
}

function setStartParams(locationStr: string): void {
  const baseStore = useBaseStore();
  if (locationStr.includes('dark')) {
    baseStore.darkMode = true;
    localStorage.setItem('darkMode', 'true');
  }
  document.documentElement.dataset['theme'] = baseStore.darkMode ? 'dark' : 'light';
  if (locationStr.includes('pro') || locationStr.includes('playground')) {
    baseStore.proMode = true;
    if (localStorage.getItem('proMode') === null) {
      baseStore.hoverOnControl = true;
      localStorage.setItem('hoverOnControl', 'true');
    }
    localStorage.setItem('proMode', 'true');
    baseStore.enableCageMode = false;
    if (locationStr.includes('pro')) {
      localStorage.setItem('enableCageMode', 'false');
    }
  } else if (localStorage.getItem('proMode') === null) {
    baseStore.proMode = true;
    localStorage.setItem('proMode', 'true');
    baseStore.hoverOnControl = true;
    localStorage.setItem('hoverOnControl', 'true');
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

  if (baseStore.token == null) {
    void useGetFetchAPI('version');
    if (baseStore.fmcBlitz) {
      baseStore.fmcBlitz = false;
    }
  } else {
    useGetFetchAPI('get_current_user', baseStore.token)
      .then((res) => {
        baseStore.token = res.token;
        localStorage.setItem('token', String(baseStore.token));
        baseStore.userName = res.name;
        if (gameId === '0' && !baseStore.playgroundMode && !baseStore.g1000Mode) {
          baseStore.loadAverages();
        }
      })
      .catch((error: unknown) => {
        baseStore.fmcBlitz = false;
        baseStore.lastError = 'Could not load your account';
        console.log(error);
      });
  }
};

const initPlayground = (stats: UserScrambleData, publicId: string): void => {
  const baseStore = useBaseStore();

  if (stats.scramble !== undefined) {
    baseStore.savedOrders = stats.scramble.split(',').map(Number);
  }
  baseStore.playgroundBestTime = stats.best_time ?? 0;
  baseStore.playgroundBestTimeMoves = stats.best_time_moves ?? 0;
  baseStore.playgroundBestMoves = stats.best_moves ?? 0;
  baseStore.playgroundCreatedAt = stats.created_at;
  if (stats.solve_path != null) {
    baseStore.playgroundSolvePath = stats.solve_path.split('');
  }
  baseStore.userScrambleId = stats.id ?? 0;
  baseStore.otherUserName = stats.name ?? '';
  baseStore.publicId = publicId;
};

const checkPublicID = (initNumLines: number): void => {
  const baseStore = useBaseStore();

  let numLines = initNumLines;
  if (location.href.toLowerCase().includes('public_id')) {
    const searchParams = new URLSearchParams(location.search);
    const publicId = searchParams.get('public_id');
    if (publicId != null) {
      if (baseStore.token == null) {
        initStore(numLines);
      } else {
        void useGetFetchAPI<UserScrambleData>(`user_scramble?public_id=${publicId}`, baseStore.token)
          .then((res) => {
            if (res.stats != null) {
              initPlayground(res.stats, publicId);
              numLines = Math.sqrt(baseStore.savedOrders.length);
            }
            initStore(numLines);
          })
          .catch((error: unknown) => {
            baseStore.lastError = 'Could not load the shared scramble';
            console.log(error);
            initStore(numLines);
          });
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
    baseStore.fmcBlitz = false;
    const sharedPlaygroundScramble = localStorage.getItem('sharedPlaygroundScramble');
    if (sharedPlaygroundScramble !== null) {
      baseStore.savedOrders = sharedPlaygroundScramble.split(',').map(Number);
      baseStore.checkUserScrambleInDB = true;
      numLines = Math.sqrt(baseStore.savedOrders.length);
      localStorage.removeItem('sharedPlaygroundScramble');
    }
    checkPublicID(numLines);
  }
};

const checkCageMode = (locationStr: string): void => {
  const baseStore = useBaseStore();

  if (!baseStore.playgroundMode && locationStr.includes('?cage') || baseStore.enableCageMode) {
    baseStore.marathonMode = false;
    baseStore.g1000Mode = false;
    localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
    baseStore.fmcBlitz = false;
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
    baseStore.fmcBlitz = false;
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
    useGetFetchAPI<RepGame>(`game?game_id=${gameId}`, baseStore.token)
      .then((res) => {
        if (res.stats == null) {
          redirectTo(baseUrl);
        } else {
          if (!baseStore.proMode) {
            baseStore.proMode = true;
            baseStore.hoverOnControl = true;
            baseStore.enableCageMode = false;
            baseStore.cageMode = false;
          }
          baseStore.replayMode = true;
          baseStore.repGame = res.stats;
          baseStore.marathonReplay = res.stats.puzzle_type === 'marathon';
          baseStore.fmcBlitz = false;
          initStore(baseStore.repGame.puzzle_size);
        }
      })
      .catch((error: unknown) => {
        baseStore.lastError = 'Could not load the game replay';
        console.log(error);
        initStore(baseStore.numLines);
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

  if (!baseStore.playgroundMode) {
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
        initStore(checkModeSize(numLines));
      }
    });
  }
};

const CAGE_ADD_PRO: Record<number, number> = { 3: 56, 4: 22, 5: 1, 6: -12, 7: -20, 8: -28 };
const CAGE_ADD_DEFAULT: Record<number, number> = { 3: 45, 4: 12, 5: -8, 6: -21, 7: -31, 8: -38 };

export const getSquareSize = (): { squareSize: ComputedRef<number> } => {
  const baseStore = useBaseStore();

  const windowWidth = useWindowWidth();

  const squareSize = computed(() => {
    const spaces = baseStore.spaceBetween * 5;
    const cageAdd = baseStore.proMode
      ? CAGE_ADD_PRO[baseStore.numLines]
      : CAGE_ADD_DEFAULT[baseStore.numLines];
    let value: number;
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
