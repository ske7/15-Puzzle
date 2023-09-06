import { onMounted, computed, type ComputedRef } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useKeyDown } from '../composables/useKeyDown';
import { CORE_NUM, CAGES_PATH_ARR, isPuzzleCore, type puzzleCores, type AverageStats } from '../stores/const';
import { useGetFetchAPI } from '../composables/useFetchAPI';

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

  if (baseStore.token != null) {
    useGetFetchAPI('get_current_user', baseStore.token)
      .then((res) => {
        baseStore.token = res.token;
        localStorage.setItem('token', String(baseStore.token));
        baseStore.userName = res.name;
        if (baseStore.proMode) {
          const puzzleType = baseStore.marathonMode ? 'marathon' : 'standard';
          void useGetFetchAPI(`user_averages?puzzle_size=${baseStore.numLines}&puzzle_type=${puzzleType}`,
            baseStore.token)
            .then((res) => {
              baseStore.setCurrentAverages(res.stats as unknown as AverageStats);
            });
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
  const numLines = localStorage.getItem('numLines');
  if (numLines === null || isNaN(Number(numLines)) || !isPuzzleCore(Number(numLines))) {
    baseStore.numLines = CORE_NUM;
  } else {
    baseStore.numLines = Number(numLines) as puzzleCores;
  }

  onMounted(() => {
    if (baseStore.enableCageMode) {
      baseStore.loadUnlockedCagesFromLocalStorage();
      baseStore.doPrepareCageMode();
    }
    baseStore.initStore();

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
