import { onMounted } from 'vue';
import { useBaseStore } from '../stores/base';
import { setSetting } from '../stores/persistedSettings';
import { CORE_NUM, CAGES_PATH_ARR, cores, fmcBlitzCores, baseUrl } from '@/const';
import { type RepGame, type UserScrambleData } from '@/types';
import { ServerError, useGetFetchAPI } from './useFetchAPI';
import { redirectTo } from '@/utils';

interface StartLink {
  playground: boolean;
  g1000: boolean;
  cage: boolean;
  gameId: string;
  publicId: string | null;
}

export function usePrepare(): void {
  const baseStore = useBaseStore();

  const numLines = getNumLinesFromLocalStorage();
  const link = readStartLink();
  setStartParams(link);

  checkG1000(link);

  checkPlaygroundMode(link, numLines);

  if (!baseStore.playgroundMode) {
    checkCageMode(link);

    checkGameLink(link.gameId, numLines);

    checkCurrentUser(link.gameId === '0');

    onMounted(() => {
      if (link.gameId === '0' && !baseStore.playgroundMode && !baseStore.g1000Mode) {
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
        startPuzzle(checkModeSize(numLines));
      }
    });
  }
}

function getNumLinesFromLocalStorage(): number {
  let numLines: number;
  const storageNumLines = localStorage.getItem('numLines');
  if (storageNumLines === null || !cores.includes(Number(storageNumLines))) {
    localStorage.setItem('numLines', CORE_NUM.toString());
    numLines = CORE_NUM;
  } else {
    numLines = Number(storageNumLines);
  }
  return numLines;
}

function readStartLink(): StartLink {
  const href = location.href.toLowerCase();
  const params = new URLSearchParams(location.search);
  return {
    playground: href.includes('playground'),
    g1000: href.includes('g1000'),
    cage: href.includes('?cage'),
    gameId: href.includes('game_id') ? params.get('game_id') ?? '0' : '0',
    publicId: params.get('public_id')
  };
}

function setStartParams(link: StartLink): void {
  const baseStore = useBaseStore();
  if (link.playground) {
    if (localStorage.getItem('proMode') === null) {
      setSetting('hoverOnControl', true);
    }
    setSetting('proMode', true);
    baseStore.enableCageMode = false;
  } else if (localStorage.getItem('proMode') === null) {
    setSetting('proMode', true);
    setSetting('hoverOnControl', true);
  }
}

function checkG1000(link: StartLink): void {
  const baseStore = useBaseStore();

  if (baseStore.token != null && link.g1000) {
    setSetting('proMode', true);
    setSetting('marathonMode', false);
    baseStore.fmcBlitz = false;
    baseStore.enableCageMode = false;
    baseStore.g1000Mode = true;
    baseStore.numLines = 3;
    localStorage.setItem('numLines', baseStore.numLines.toString());
    startPuzzle(baseStore.numLines);
  }
}

function checkPlaygroundMode(link: StartLink, initNumLines: number): void {
  const baseStore = useBaseStore();

  let numLines = initNumLines;
  if (link.playground) {
    baseStore.playgroundMode = true;
    checkCurrentUser(false);
    baseStore.g1000Mode = false;
    setSetting('marathonMode', false);
    baseStore.fmcBlitz = false;
    const sharedPlaygroundScramble = localStorage.getItem('sharedPlaygroundScramble');
    if (sharedPlaygroundScramble !== null) {
      baseStore.savedOrders = sharedPlaygroundScramble.split(',').map(Number);
      baseStore.checkUserScrambleInDB = true;
      numLines = Math.sqrt(baseStore.savedOrders.length);
      localStorage.removeItem('sharedPlaygroundScramble');
    }
    checkPublicID(numLines, link.publicId);
  }
}

function checkPublicID(initNumLines: number, publicId: string | null): void {
  const baseStore = useBaseStore();

  let numLines = initNumLines;
  if (publicId === null || baseStore.token == null) {
    startPuzzle(numLines);
    return;
  }
  void useGetFetchAPI<UserScrambleData>(`user_scramble?public_id=${encodeURIComponent(publicId)}`, baseStore.token)
    .then((res) => {
      if (res.stats != null) {
        initPlayground(res.stats, publicId);
        numLines = Math.sqrt(baseStore.savedOrders.length);
      }
      startPuzzle(numLines);
    })
    .catch((error: unknown) => {
      baseStore.linkError = error instanceof ServerError ? error.message : 'Could not load the shared scramble';
      console.log(error);
      startPuzzle(numLines);
    });
}

function initPlayground(stats: UserScrambleData, publicId: string): void {
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
}

function checkCageMode(link: StartLink): void {
  const baseStore = useBaseStore();

  if (link.cage || baseStore.enableCageMode) {
    setSetting('marathonMode', false);
    baseStore.g1000Mode = false;
    baseStore.fmcBlitz = false;
    setSetting('proMode', false);
    baseStore.numLines = CORE_NUM;
    baseStore.initAfterNewPuzzleSize();
    setSetting('enableCageMode', true);
  }
}

function checkGameLink(gameId: string, numLines: number): void {
  const baseStore = useBaseStore();

  if (gameId !== '0') {
    baseStore.g1000Mode = false;
    useGetFetchAPI<RepGame>(`game?game_id=${encodeURIComponent(gameId)}`, baseStore.token)
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
          startPuzzle(baseStore.repGame.puzzle_size);
        }
      })
      .catch((error: unknown) => {
        baseStore.lastError = 'Could not load the game replay';
        console.log(error);
        startPuzzle(checkModeSize(numLines));
      });
  }
}

function checkCurrentUser(loadAveragesAfter: boolean): void {
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
        if (loadAveragesAfter && !baseStore.g1000Mode) {
          baseStore.loadAverages();
        }
      })
      .catch((error: unknown) => {
        baseStore.fmcBlitz = false;
        baseStore.lastError = 'Could not load your account';
        console.log(error);
      });
  }
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

function startPuzzle(numLines: number): void {
  const baseStore = useBaseStore();

  baseStore.numLines = numLines;
  baseStore.initStore();
  baseStore.puzzleLoaded = true;
}
