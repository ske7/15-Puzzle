import { onMounted, computed, type ComputedRef } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useKeyDown } from '../composables/useKeyDown';
import { CORE_NUM, CAGES_PATH_ARR, cores, baseUrl } from '@/const';
import { type RepGame } from '@/types';
import { useGetFetchAPI } from '../composables/useFetchAPI';

// eslint-disable-next-line max-statements
export const usePrepare = (): void => {
  const baseStore = useBaseStore();

  useKeyDown();

  const checkCurrentUser = (gameId: number): void => {
    if (baseStore.token != null) {
      useGetFetchAPI('get_current_user', baseStore.token)
        .then((res) => {
          baseStore.token = res.token;
          localStorage.setItem('token', String(baseStore.token));
          baseStore.userName = res.name;
          if (gameId === 0 && !baseStore.playgroundMode) {
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
  let gameId = 0;
  const locationStr = location.href.toLowerCase();
  if (locationStr.includes('dark')) {
    baseStore.darkMode = true;
    localStorage.setItem('darkMode', 'true');
  }
  document.documentElement.setAttribute('data-theme', baseStore.darkMode ? 'dark' : 'light');

  if (locationStr.includes('pro') || locationStr.includes('playground')) {
    baseStore.proMode = true;
    localStorage.setItem('proMode', 'true');
    baseStore.enableCageMode = false;
    localStorage.setItem('enableCageMode', 'false');
    baseStore.hoverOnControl = true;
    localStorage.setItem('hoverOnControl', 'true');
  }
  if (locationStr.includes('playground')) {
    baseStore.marathonMode = false;
    localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
    baseStore.playgroundMode = true;
    baseStore.numLines = CORE_NUM;
    checkCurrentUser(gameId);
    baseStore.initStore();
    baseStore.puzzleLoaded = true;
    return;
  }
  if (!baseStore.playgroundMode && locationStr.includes('cage')) {
    baseStore.marathonMode = false;
    localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
    baseStore.proMode = false;
    localStorage.setItem('proMode', baseStore.proMode.toString());
    baseStore.numLines = CORE_NUM;
    baseStore.initAfterNewPuzzleSize();
    baseStore.enableCageMode = true;
    localStorage.setItem('enableCageMode', 'true');
  }
  if (location.href.toLowerCase().includes('game_id')) {
    const searchParams = new URLSearchParams(location.search);
    const gameIdParam = Number(searchParams.get('game_id'));
    if (!isNaN(gameIdParam)) {
      gameId = gameIdParam;
    }
  } else {
    const numLines = localStorage.getItem('numLines');
    if (numLines === null || isNaN(Number(numLines)) || !cores.includes(Number(numLines))) {
      localStorage.setItem('numLines', CORE_NUM.toString());
      baseStore.numLines = CORE_NUM;
    } else {
      baseStore.numLines = Number(numLines);
    }
  }
  if (gameId !== 0) {
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
          baseStore.numLines = baseStore.repGame.puzzle_size;
          baseStore.initStore();
          baseStore.puzzleLoaded = true;
        } else {
          location.href = baseUrl;
        }
      })
      .catch(error => {
        console.log(error as string);
      });
  }
  checkCurrentUser(gameId);

  onMounted(() => {
    if (gameId === 0 && !baseStore.playgroundMode) {
      if (baseStore.enableCageMode) {
        baseStore.loadUnlockedCagesFromLocalStorage();
        baseStore.doPrepareCageMode();
      }
      baseStore.initStore();
      baseStore.resetConsecutiveSolves();
      baseStore.puzzleLoaded = true;
      setTimeout(() => {
        if (baseStore.unlockedCages.size > 0) {
          const first = [...baseStore.unlockedCages][0];
          baseStore.preloadImage(CAGES_PATH_ARR[first]);
        }
      }, 1000);
    }
  });
};

export const getSquareSize = (): Record<string, ComputedRef<number>> => {
  const baseStore = useBaseStore();

  const { width: windowWidth } = useWindowSize();

  const squareSize = computed(() => {
    const spaces = baseStore.spaceBetween * 5;
    let cageAdd = 0;
    if (baseStore.cageMode) {
      cageAdd = 10;
    }
    if (baseStore.proMode) {
      cageAdd = 22;
      if (baseStore.numLines === 3) {
        cageAdd += 34;
      }
      if (baseStore.numLines === 5) {
        cageAdd -= 20.4;
      }
      if (baseStore.numLines === 6) {
        cageAdd -= 34;
      }
      if (baseStore.numLines === 7) {
        cageAdd -= 42;
      }
      if (baseStore.numLines === 8) {
        cageAdd -= 49.5;
      }
    } else {
      cageAdd = 12;
      if (baseStore.numLines === 3) {
        cageAdd += 33.33333;
      }
      if (baseStore.numLines === 5) {
        cageAdd -= 20;
      }
      if (baseStore.numLines === 6) {
        cageAdd -= 33.33333;
      }
      if (baseStore.numLines === 7) {
        cageAdd -= 42.857;
      }
      if (baseStore.numLines === 8) {
        cageAdd -= 50;
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
