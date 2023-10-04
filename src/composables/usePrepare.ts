import { onMounted, computed, type ComputedRef } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useKeyDown } from '../composables/useKeyDown';
import { CORE_NUM, CAGES_PATH_ARR, isPuzzleCore } from '@/const';
import { type puzzleCores, type RepGame } from '@/types';
import { useGetFetchAPI } from '../composables/useFetchAPI';

// eslint-disable-next-line max-statements
export const usePrepare = (): void => {
  const baseStore = useBaseStore();

  if (location.href.toLowerCase().includes('pro')) {
    baseStore.proMode = true;
    localStorage.setItem('proMode', 'true');
    baseStore.hoverOnControl = true;
    localStorage.setItem('hoverOnControl', 'true');
  }
  if (location.href.toLowerCase().includes('dark')) {
    baseStore.darkMode = true;
    localStorage.setItem('darkMode', 'true');
  }
  if (location.href.toLowerCase().includes('cage') &&
    !(baseStore.marathonMode || baseStore.proMode) && (baseStore.numLines === CORE_NUM)) {
    baseStore.enableCageMode = true;
    localStorage.setItem('enableCageMode', 'true');
  }
  let gameId = 0;
  if (location.href.toLowerCase().includes('game_id')) {
    const searchParams = new URLSearchParams(location.search);
    const gameIdParam = Number(searchParams.get('game_id'));
    if (!isNaN(gameIdParam)) {
      gameId = gameIdParam;
    }
  } else {
    const numLines = localStorage.getItem('numLines');
    if (numLines === null || isNaN(Number(numLines)) || !isPuzzleCore(Number(numLines))) {
      baseStore.numLines = CORE_NUM;
    } else {
      baseStore.numLines = Number(numLines) as puzzleCores;
    }
  }
  if (gameId !== 0) {
    useGetFetchAPI(`game?game_id=${gameId}`, baseStore.token)
      .then((res) => {
        if (res.stats != null) {
          baseStore.replayMode = true;
          baseStore.repGame = res.stats as unknown as RepGame;
          baseStore.numLines = baseStore.repGame.puzzle_size as puzzleCores;
          baseStore.initStore();
          baseStore.puzzleLoaded = true;
        }
      })
      .catch(error => {
        console.log(error as string);
      });
  }
  if (baseStore.token != null) {
    useGetFetchAPI('get_current_user', baseStore.token)
      .then((res) => {
        baseStore.token = res.token;
        localStorage.setItem('token', String(baseStore.token));
        baseStore.userName = res.name;
        if (gameId === 0) {
          baseStore.loadAverages();
        }
      })
      .catch(error => {
        console.log(error as string);
      });
  } else {
    void useGetFetchAPI('version');
  }

  useKeyDown();

  document.documentElement.setAttribute('data-theme', baseStore.darkMode ? 'dark' : 'light');

  onMounted(() => {
    if (baseStore.enableCageMode) {
      baseStore.loadUnlockedCagesFromLocalStorage();
      baseStore.doPrepareCageMode();
    }
    if (gameId === 0) {
      baseStore.initStore();
      baseStore.puzzleLoaded = true;
    }
    baseStore.resetConsecutiveSolves();

    setTimeout(() => {
      if (baseStore.unlockedCages.size > 0) {
        const first = [...baseStore.unlockedCages][0];
        baseStore.preloadImage(CAGES_PATH_ARR[first]);
      }
    }, 1000);
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
    }
    if (baseStore.numLines === 3) {
      cageAdd += 28;
    }
    if (baseStore.numLines === 5) {
      cageAdd -= 10;
    }
    let value = 0;
    if (windowWidth.value <= 370) {
      if (baseStore.cageMode) {
        value = Math.floor((windowWidth.value - (spaces + 60)) / baseStore.numLines);
      } else {
        value = Math.floor((windowWidth.value - (spaces + 40)) / baseStore.numLines);
      }
      value = Math.floor((windowWidth.value - (spaces + 40)) / baseStore.numLines);
    } else if (windowWidth.value <= 480) {
      value = Math.floor((windowWidth.value - (spaces + 60)) / baseStore.numLines);
    } else if (windowWidth.value <= 820 && windowWidth.value >= 600) {
      value = 100 + cageAdd;
    } else {
      value = 80 + cageAdd;
    }
    return value;
  });

  return { squareSize };
};
