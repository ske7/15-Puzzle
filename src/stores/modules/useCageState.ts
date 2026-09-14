import { ref, computed, type ComputedRef } from 'vue';
import { CAGES_PATH_ARR } from '@/const';
import { randArrayItem } from '../../utils';

export function useCageState(arrayLength: ComputedRef<number>) {
  const cageMode = ref(false);
  const cagePath = ref('');
  const shownCages = ref(new Set<string>());
  const cageCompleteImgLoaded = ref(false);
  const loadedCageImages = ref(new Set<string>());
  const enableCageMode = ref(localStorage.getItem('enableCageMode') === 'true');
  const cageHardcoreMode = ref(localStorage.getItem('cageHardcoreMode') === 'true');
  const unlockedCages = ref(new Set<number>());
  const showOnlyUnlockedItems = ref(localStorage.getItem('showOnlyUnlockedItems') === 'true');
  const noBordersInCageMode = ref(localStorage.getItem('noBordersInCageMode') === 'true');
  const proBeforeCage = ref(localStorage.getItem('proBeforeCage') === 'true');

  function setUnlockedCages() {
    if (cagePath.value !== '') {
      unlockedCages.value.add(cageImgIndex.value);
      localStorage.setItem('_xcu', btoa(unlockedCagesSortedArr.value.join(',')));
    }
  }

  function loadUnlockedCagesFromLocalStorage() {
    const xcu = localStorage.getItem('_xcu');
    if (xcu !== null) {
      const arr = atob(xcu).split(',');
      for (const item of arr) {
        unlockedCages.value.add(Number(item));
      }
    }
  }

  function doPrepareCageMode() {
    cageMode.value = true;
    if (unlockedCages.value.size === cagesCount.value) {
      if (shownCages.value.size === CAGES_PATH_ARR.length) {
        shownCages.value.clear();
      }
      cagePath.value = randArrayItem(CAGES_PATH_ARR, Array.from(shownCages.value));
      shownCages.value.add(cagePath.value);
    } else {
      cagePath.value = randArrayItem(CAGES_PATH_ARR, unlockedCagesValues.value);
    }
  }

  function cageImageUrl(tile: number): string {
    const name = tile === 0 ? arrayLength.value.toString() : tile.toString().padStart(2, '0');
    return `/cages/${cagePath.value}/${name}.jpg`;
  }

  function markCageImageLoaded(url: string) {
    loadedCageImages.value.add(url);
  }

  const cagesCount = computed((): number => {
    return CAGES_PATH_ARR.length;
  });

  const finishLoadingAllCageImages = computed((): boolean => {
    for (let tile = 0; tile < arrayLength.value; tile += 1) {
      if (!loadedCageImages.value.has(cageImageUrl(tile))) {
        return false;
      }
    }
    return true;
  });

  const cageImgIndex = computed((): number => {
    return CAGES_PATH_ARR.indexOf(cagePath.value);
  });

  const unlockedCagesSortedArr = computed((): number[] => {
    return [...unlockedCages.value].sort((a, b) => a - b);
  });

  const unlockedCagesValues = computed((): string[] => {
    return CAGES_PATH_ARR.filter((_item, index) => {
      return unlockedCages.value.has(index);
    });
  });

  return {
    cageMode,
    cagePath,
    shownCages,
    cageCompleteImgLoaded,
    loadedCageImages,
    enableCageMode,
    cageHardcoreMode,
    unlockedCages,
    noBordersInCageMode,
    showOnlyUnlockedItems,
    proBeforeCage,
    setUnlockedCages,
    loadUnlockedCagesFromLocalStorage,
    doPrepareCageMode,
    cageImageUrl,
    markCageImageLoaded,
    preloadImage,
    cagesCount,
    cageImgIndex,
    unlockedCagesSortedArr,
    unlockedCagesValues,
    finishLoadingAllCageImages
  };
}

function preloadImage(item: string, isPlaceholder = false) {
  const img = new Image();
  let url: string;
  if (isPlaceholder) {
    url = '/cages/placeholder.jpg';
  } else {
    url = `/cages/${item}/complete.jpg`;
  }
  img.src = url;
}
