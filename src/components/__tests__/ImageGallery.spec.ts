import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageGallery from '../ImageGallery.vue';
import { useBaseStore } from '../../stores/base';
import { CAGES_PATH_ARR } from '@/const';

// ImageGallery's entire template is a <Teleport to="body">, so its content is moved
// out of the component's own render tree into document.body - wrapper.find() never
// sees it, so DOM lookups/interactions here go through document directly.
interface ImageGalleryInternals {
  currentIndex: number;
  getRealIndex: number;
  maxIndex: number;
  isLocked: boolean;
  loadedCageImg: string;
  loadedNotLocked: boolean;
  showImg: boolean;
  loaded: boolean;
  time: number;
  boardSize: string;
  squareSize: number;
  disabledShowOnlyUnlockedItems: boolean;
  loadNext: () => Promise<void>;
  loadPrev: () => Promise<void>;
}

function internals(wrapper: VueWrapper): ImageGalleryInternals {
  return wrapper.vm as unknown as ImageGalleryInternals;
}

let currentWrapper: VueWrapper | undefined;
function mountGallery() {
  currentWrapper = mount(ImageGallery, { attachTo: document.body });
  return currentWrapper;
}

function cageImg(): HTMLImageElement {
  const el = document.querySelector<HTMLImageElement>('.cage-img');
  if (el === null) {
    throw new Error('.cage-img not found');
  }
  return el;
}

function dispatchTouch(type: string, clientXs: number[]): void {
  const touches = clientXs.map(clientX => ({ clientX }) as Touch);
  cageImg().dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches }));
}

describe('ImageGallery', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the gallery into the teleported body', () => {
      mountGallery();
      expect(document.querySelector('.image-gallery')).not.toBeNull();
      expect(document.querySelector('h2')?.textContent).toBe('Cage Image Gallery');
    });

    it('shows the image once mounted, regardless of lock state', () => {
      const wrapper = mountGallery();
      expect(internals(wrapper).showImg).toBe(true);
    });
  });

  describe('getRealIndex / maxIndex / isLocked outside unlocked-only mode', () => {
    it('uses the plain currentIndex as the real index, with the full cage count as max', () => {
      const wrapper = mountGallery();
      expect(internals(wrapper).getRealIndex).toBe(0);
      expect(internals(wrapper).maxIndex).toBe(CAGES_PATH_ARR.length - 1);
    });

    it('is locked when the current cage is not in unlockedCages', () => {
      const wrapper = mountGallery();
      expect(internals(wrapper).isLocked).toBe(true);
    });

    it('is unlocked when the current cage is in unlockedCages', () => {
      const store = useBaseStore();
      store.unlockedCages.add(0);
      const wrapper = mountGallery();
      expect(internals(wrapper).isLocked).toBe(false);
    });
  });

  describe('getRealIndex / maxIndex / isLocked in unlocked-only mode', () => {
    it('maps currentIndex through the sorted unlocked list, with the unlocked count as max', () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([2, 5, 9]);
      store.showOnlyUnlockedItems = true;
      const wrapper = mountGallery();
      expect(internals(wrapper).getRealIndex).toBe(2);
      expect(internals(wrapper).maxIndex).toBe(2);
      expect(internals(wrapper).isLocked).toBe(false);
    });
  });

  describe('loadedCageImg', () => {
    it('shows the placeholder while locked', () => {
      const wrapper = mountGallery();
      expect(internals(wrapper).loadedCageImg).toBe('/cages/placeholder.jpg');
    });

    it('shows the real cage image once unlocked', () => {
      const store = useBaseStore();
      store.unlockedCages.add(0);
      const wrapper = mountGallery();
      expect(internals(wrapper).loadedCageImg).toBe(`/cages/${CAGES_PATH_ARR[0]}/complete.jpg`);
    });
  });

  describe('onCageImgLoad', () => {
    it('marks the image loaded and keeps it shown when unlocked', async () => {
      const store = useBaseStore();
      store.unlockedCages.add(0);
      const wrapper = mountGallery();
      await nextTick(); // showImg only becomes true (and the img renders) after onMounted flushes
      cageImg().dispatchEvent(new Event('load'));
      await nextTick();
      expect(internals(wrapper).loaded).toBe(true);
      expect(internals(wrapper).showImg).toBe(true);
    });

    it('marks the image loaded while locked, without forcing showImg off', async () => {
      const wrapper = mountGallery();
      cageImg().dispatchEvent(new Event('load'));
      await nextTick();
      expect(internals(wrapper).loaded).toBe(true);
      expect(internals(wrapper).showImg).toBe(true);
    });
  });

  describe('loading indicator timer', () => {
    it('shows "Loading" only once enough time has passed on the very first cage', async () => {
      const store = useBaseStore();
      store.unlockedCages.add(0);
      const wrapper = mountGallery();
      await nextTick();
      expect(internals(wrapper).loadedNotLocked).toBe(false);
      vi.advanceTimersByTime(200);
      expect(internals(wrapper).loadedNotLocked).toBe(false);
      vi.advanceTimersByTime(200);
      expect(internals(wrapper).loadedNotLocked).toBe(true);
    });

    it('never shows "Loading" once the image has loaded', async () => {
      const store = useBaseStore();
      store.unlockedCages.add(0);
      const wrapper = mountGallery();
      await nextTick();
      cageImg().dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(1000);
      expect(internals(wrapper).loadedNotLocked).toBe(false);
    });

    it('never shows "Loading" while locked', () => {
      const wrapper = mountGallery();
      vi.advanceTimersByTime(1000);
      expect(internals(wrapper).isLocked).toBe(true);
      expect(internals(wrapper).loadedNotLocked).toBe(false);
    });
  });

  describe('loadNext / loadPrev navigation', () => {
    it('does nothing while an unlocked image is still loading', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([0, 1]);
      const wrapper = mountGallery();
      await internals(wrapper).loadNext();
      expect(internals(wrapper).currentIndex).toBe(0);
    });

    it('navigates immediately while locked, without waiting for a load event', async () => {
      const wrapper = mountGallery();
      await internals(wrapper).loadNext();
      expect(internals(wrapper).currentIndex).toBe(1);
    });

    it('does nothing when only one unlocked cage exists in unlocked-only mode', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([0]);
      store.showOnlyUnlockedItems = true;
      const wrapper = mountGallery();
      await nextTick();
      cageImg().dispatchEvent(new Event('load')); // clear the "still loading" guard first
      await nextTick();
      await internals(wrapper).loadNext();
      expect(internals(wrapper).currentIndex).toBe(0);
    });

    it('wraps from the last cage to the first on next', async () => {
      const wrapper = mountGallery();
      const lastIndex = CAGES_PATH_ARR.length - 1;
      (wrapper.vm as unknown as { currentIndex: number }).currentIndex = lastIndex;
      await nextTick();
      await internals(wrapper).loadNext();
      expect(internals(wrapper).currentIndex).toBe(0);
    });

    it('wraps from the first cage to the last on prev', async () => {
      const wrapper = mountGallery();
      await internals(wrapper).loadPrev();
      expect(internals(wrapper).currentIndex).toBe(CAGES_PATH_ARR.length - 1);
    });

    it('steps back one cage on prev when not at the start', async () => {
      const wrapper = mountGallery();
      (wrapper.vm as unknown as { currentIndex: number }).currentIndex = 3;
      await nextTick();
      await internals(wrapper).loadPrev();
      expect(internals(wrapper).currentIndex).toBe(2);
    });

    it('resets the fade/loaded state when landing on an unlocked cage', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([0, 1]);
      const wrapper = mountGallery();
      await nextTick();
      cageImg().dispatchEvent(new Event('load'));
      await nextTick();
      expect(internals(wrapper).loaded).toBe(true);
      await internals(wrapper).loadNext();
      expect(internals(wrapper).showImg).toBe(true);
      expect(internals(wrapper).loaded).toBe(false);
    });

    it('does not reset the fade/loaded state when landing on a locked cage', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([0]);
      const wrapper = mountGallery();
      await nextTick();
      cageImg().dispatchEvent(new Event('load'));
      await nextTick();
      expect(internals(wrapper).loaded).toBe(true);
      await internals(wrapper).loadNext(); // cage 1 is locked
      expect(internals(wrapper).loaded).toBe(true);
    });
  });

  describe('touch gesture navigation', () => {
    it('advances to the next cage on a left swipe past the tolerance', async () => {
      const wrapper = mountGallery();
      dispatchTouch('touchstart', [200]);
      dispatchTouch('touchmove', [150]);
      cageImg().dispatchEvent(new Event('touchend'));
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(1);
    });

    it('goes to the previous cage on a right swipe past the tolerance', async () => {
      const wrapper = mountGallery();
      dispatchTouch('touchstart', [100]);
      dispatchTouch('touchmove', [150]);
      cageImg().dispatchEvent(new Event('touchend'));
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(CAGES_PATH_ARR.length - 1);
    });

    it('ignores a swipe that stays within the tolerance', async () => {
      const wrapper = mountGallery();
      dispatchTouch('touchstart', [100]);
      dispatchTouch('touchmove', [110]);
      cageImg().dispatchEvent(new Event('touchend'));
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(0);
    });
  });

  describe('wheel navigation', () => {
    it('goes to the previous cage on a positive deltaY', async () => {
      const wrapper = mountGallery();
      document.querySelector('.image-gallery')?.dispatchEvent(
        Object.assign(new Event('wheel', { bubbles: true, cancelable: true }), { deltaY: 100 })
      );
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(CAGES_PATH_ARR.length - 1);
    });

    it('advances to the next cage on a negative deltaY', async () => {
      const wrapper = mountGallery();
      document.querySelector('.image-gallery')?.dispatchEvent(
        Object.assign(new Event('wheel', { bubbles: true, cancelable: true }), { deltaY: -100 })
      );
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(1);
    });

    it('does nothing on a purely horizontal wheel gesture', async () => {
      const wrapper = mountGallery();
      document.querySelector('.image-gallery')?.dispatchEvent(
        Object.assign(new Event('wheel', { bubbles: true, cancelable: true }), { deltaY: 0 })
      );
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(0);
    });
  });

  describe('arrow button navigation', () => {
    it('advances on clicking the next arrow', async () => {
      const wrapper = mountGallery();
      const arrows = document.querySelectorAll('.arrow-button');
      arrows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(1);
    });

    it('goes back on clicking the prev arrow', async () => {
      const wrapper = mountGallery();
      const arrows = document.querySelectorAll('.arrow-button');
      arrows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(internals(wrapper).currentIndex).toBe(CAGES_PATH_ARR.length - 1);
    });
  });

  describe('disabledShowOnlyUnlockedItems', () => {
    it('is disabled with no unlocked cages', () => {
      const wrapper = mountGallery();
      expect(internals(wrapper).disabledShowOnlyUnlockedItems).toBe(true);
    });

    it('is disabled once every cage is unlocked', () => {
      const store = useBaseStore();
      store.unlockedCages = new Set(CAGES_PATH_ARR.map((_v, i) => i));
      const wrapper = mountGallery();
      expect(internals(wrapper).disabledShowOnlyUnlockedItems).toBe(true);
    });

    it('is enabled with some, but not all, cages unlocked', () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([0, 1]);
      const wrapper = mountGallery();
      expect(internals(wrapper).disabledShowOnlyUnlockedItems).toBe(false);
    });
  });

  describe('toggling show-only-unlocked-items', () => {
    function checkbox(): HTMLInputElement {
      const el = document.querySelector<HTMLInputElement>('#show-only-unlocked');
      if (el === null) {
        throw new Error('#show-only-unlocked not found');
      }
      return el;
    }

    it('remembers a real position and maps it into the unlocked list on enabling', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([2, 5, 9]);
      const wrapper = mountGallery();
      (wrapper.vm as unknown as { currentIndex: number }).currentIndex = 5;
      await nextTick();
      checkbox().dispatchEvent(new Event('change'));
      await nextTick();
      expect(store.showOnlyUnlockedItems).toBe(true);
      expect(localStorage.getItem('showOnlyUnlockedItems')).toBe('true');
      // real index 5 is position 1 in the sorted unlocked list [2, 5, 9]
      expect(internals(wrapper).currentIndex).toBe(1);
    });

    it('jumps to the first unlocked cage on enabling from a locked position, resetting the fade state', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([2, 5, 9]);
      const wrapper = mountGallery();
      cageImg().dispatchEvent(new Event('load'));
      // currentIndex 0 is locked (only 2, 5, 9 are unlocked)
      checkbox().dispatchEvent(new Event('change'));
      await nextTick();
      await nextTick(); // the watcher's own reset path awaits nextTick internally too
      // real index 2 is position 0 in the sorted unlocked list [2, 5, 9]
      expect(internals(wrapper).currentIndex).toBe(0);
      expect(internals(wrapper).loaded).toBe(false);
    });

    it('restores the real position on disabling', async () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([2, 5, 9]);
      const wrapper = mountGallery();
      (wrapper.vm as unknown as { currentIndex: number }).currentIndex = 5;
      await nextTick();
      checkbox().dispatchEvent(new Event('change')); // enable: real 5 -> position 1
      await nextTick();
      checkbox().dispatchEvent(new Event('change')); // disable: back to real 5
      await nextTick();
      expect(store.showOnlyUnlockedItems).toBe(false);
      expect(internals(wrapper).currentIndex).toBe(5);
    });
  });

  describe('boardSize', () => {
    it('delegates to the real store boardSize calculation for the real square size', () => {
      const store = useBaseStore();
      const wrapper = mountGallery();
      expect(internals(wrapper).boardSize).toBe(store.boardSize(internals(wrapper).squareSize));
    });
  });

  describe('closing', () => {
    it('emits close when clicking OK', async () => {
      const wrapper = mountGallery();
      document.querySelector('button.tool-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits close when clicking outside the gallery', async () => {
      const wrapper = mountGallery();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  // The loading-progress interval starts on mount and used to be cleared only when an
  // image finished loading - closing the gallery mid-load left it running for the life
  // of the page.
  describe('teardown', () => {
    it('stops the loading timer when the gallery closes before the image loads', () => {
      vi.useFakeTimers();
      const wrapper = mountGallery();
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      wrapper.unmount();
      expect(vi.getTimerCount()).toBe(0);
      vi.useRealTimers();
    });
  });
});
