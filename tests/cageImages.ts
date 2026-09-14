import type { useBaseStore } from '../src/stores/base';

export function loadCageImages(store: ReturnType<typeof useBaseStore>, count = store.arrayLength): void {
  for (let tile = 0; tile < count; tile += 1) {
    store.markCageImageLoaded(store.cageImageUrl(tile));
  }
}
