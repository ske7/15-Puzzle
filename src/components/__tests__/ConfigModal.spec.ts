import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventBus } from '@vueuse/core';
import ConfigModal from '../ConfigModal.vue';
import { useBaseStore } from '../../stores/base';
import { useAppEventBus } from '../../composables/useAppEventBus';
import type { Response } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, useGetFetchAPI: vi.fn() };
});

import { useGetFetchAPI } from '../../composables/useFetchAPI';

// ConfigModal's entire template is a <Teleport to="body">, so its content is moved
// out of the component's own render tree into document.body - wrapper.find() never
// sees it, so DOM lookups/interactions here go through document directly.
interface ConfigModalInternals {
  puzzleSize: number;
  disabledCageMode: boolean;
}

function internals(wrapper: VueWrapper): ConfigModalInternals {
  return wrapper.vm as unknown as ConfigModalInternals;
}

function getInput(id: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`#${id}`);
  if (el === null) {
    throw new Error(`#${id} not found`);
  }
  return el;
}

function exists(id: string): boolean {
  return document.querySelector(`#${id}`) !== null;
}

async function toggleCheckbox(id: string): Promise<void> {
  getInput(id).dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
}

async function clickSliderMark(value: string): Promise<void> {
  const marks = Array.from(document.querySelectorAll('.slider-marks span'));
  const mark = marks.find(el => el.textContent?.trim() === value);
  mark?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
}

let currentWrapper: VueWrapper | undefined;
function mountModal() {
  currentWrapper = mount(ConfigModal, { attachTo: document.body });
  return currentWrapper;
}

describe('ConfigModal', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.mocked(useGetFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0 } satisfies Response);
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
    document.documentElement.dataset['theme'] = '';
  });

  it('closes when clicking outside the modal', async () => {
    const wrapper = mountModal();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  describe('disabledCageMode', () => {
    it.each([
      ['enableCageMode is off', {}],
      ['marathon mode is on', { enableCageMode: true, marathonMode: true }],
      ['pro mode is on', { enableCageMode: true, proMode: true }],
      ['the puzzle size is not the standard core size', { enableCageMode: true, numLines: 5 }]
    ])('is true when %s', (_label, overrides) => {
      const store = useBaseStore();
      Object.assign(store, overrides);
      mountModal();
      expect(getInput('hardcore').disabled).toBe(true);
    });

    it('is false with cage mode enabled at the standard size outside marathon/pro', () => {
      const store = useBaseStore();
      store.enableCageMode = true;
      mountModal();
      expect(getInput('hardcore').disabled).toBe(false);
    });
  });

  describe('simple toggles', () => {
    it.each([
      ['hardcore', 'cageHardcoreMode', 'cageHardcoreMode'],
      ['no-borders-in-cage-mode', 'noBordersInCageMode', 'noBordersInCageMode'],
      ['dark-mode', 'darkMode', 'darkMode'],
      ['disable-win-message', 'disableWinMessage', 'disableWinMessage'],
      ['reset-unsolved-puzzle', 'resetUnsolvedPuzzleWithEsc', 'resetUnsolvedPuzzleWithEsc'],
      ['hide-averages', 'hideCurrentAverages', 'hideCurrentAverages'],
      ['hover-on', 'hoverOnControl', 'hoverOnControl']
    ] as const)('flips %s and persists it to localStorage under %s', async (id, storeKey, storageKey) => {
      const store = useBaseStore();
      mountModal();
      expect(store[storeKey]).toBe(false);
      await toggleCheckbox(id);
      expect(store[storeKey]).toBe(true);
      expect(localStorage.getItem(storageKey)).toBe('true');
      await toggleCheckbox(id);
      expect(store[storeKey]).toBe(false);
      expect(localStorage.getItem(storageKey)).toBe('false');
    });

    it('flips keep-session and persists it to localStorage', async () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      mountModal();
      expect(store.keepSession).toBe(false);
      await toggleCheckbox('keep-session');
      expect(store.keepSession).toBe(true);
      expect(localStorage.getItem('keepSession')).toBe('true');
      localStorage.setItem('_xss', 'stale-session');
      localStorage.setItem('_xcs', 'stale-count');
      await toggleCheckbox('keep-session');
      expect(store.keepSession).toBe(false);
      expect(localStorage.getItem('keepSession')).toBe('false');
      expect(localStorage.getItem('_xss')).toBeNull();
      expect(localStorage.getItem('_xcs')).toBeNull();
    });

    it('switches the document theme when toggling dark mode', async () => {
      mountModal();
      await toggleCheckbox('dark-mode');
      expect(document.documentElement.dataset['theme']).toBe('dark');
      await toggleCheckbox('dark-mode');
      expect(document.documentElement.dataset['theme']).toBe('light');
    });

    it('disables "hover on control" only while pro mode is off, and "disable win message" only while fmc blitz is off', async () => {
      const store = useBaseStore();
      mountModal();
      expect(getInput('hover-on').disabled).toBe(true);
      expect(getInput('disable-win-message').disabled).toBe(false);
      store.proMode = true;
      store.fmcBlitz = true;
      await nextTick();
      expect(getInput('hover-on').disabled).toBe(false);
      expect(getInput('disable-win-message').disabled).toBe(true);
    });

    it('disables "hide averages" while unregistered, offline pro mode, or on a network error', async () => {
      const store = useBaseStore();
      mountModal();
      expect(getInput('hide-averages').disabled).toBe(true);
      store.proMode = true;
      store.token = 'real-session-token';
      await nextTick();
      expect(getInput('hide-averages').disabled).toBe(false);
      store.isNetworkError = true;
      await nextTick();
      expect(getInput('hide-averages').disabled).toBe(true);
    });
  });

  describe('setEnableCageMode', () => {
    it('turns on cage mode: disables marathon/fmc blitz/pro mode, unlocks cages, and restarts', async () => {
      localStorage.setItem('_xcu', btoa('1,2,3'));
      const store = useBaseStore();
      store.marathonMode = true;
      store.fmcBlitz = true;
      store.proMode = true;
      const restarts: string[] = [];
      useEventBus<string, string>('event-bus').on((event, payload) => {
        if (event === 'restart' && payload != null) {
          restarts.push(payload);
        }
      });
      const wrapper = mountModal();
      await toggleCheckbox('enable-cage-mode');

      expect(store.enableCageMode).toBe(true);
      expect(store.marathonMode).toBe(false);
      expect(store.fmcBlitz).toBe(false);
      expect(store.proBeforeCage).toBe(true);
      expect(store.proMode).toBe(false);
      expect(internals(wrapper).puzzleSize).toBe(4);

      await vi.waitFor(() => {
        expect(store.unlockedCages.has(1)).toBe(true);
        expect(store.cageMode).toBe(true);
        expect(store.cagePath).not.toBe('');
      });
      // initAfterNewPuzzleSize (called mid-toggle) and the toggle itself both emit restart.
      expect(restarts).toEqual(['fromConfig', 'fromConfig']);
    });

    // Cage mode exists only at 4x4, and the toggle rebuilds the board while it runs. A board
    // built at the old size renders the wrong number of cage tiles, and the loading veil -
    // waiting for one image per cell - never clears.
    it.each([3, 6])('rebuilds the board at 4x4 when turned on from size %i', async (size) => {
      const store = useBaseStore();
      store.numLines = size;
      store.initStore();
      expect(store.mixedOrders).toHaveLength(size * size);
      // The app's own restart handling, as ActionPanel wires it: a restart from config
      // resets the store, which rebuilds the board at whatever size the store holds.
      const stopListening = useAppEventBus().on((event, payload) => {
        if (event === 'restart') {
          store.reset(payload === 'fromConfig');
        }
      });

      mountModal();
      await toggleCheckbox('enable-cage-mode');
      await vi.waitFor(() => {
        expect(store.cageMode).toBe(true);
      });

      expect(store.numLines).toBe(4);
      expect(store.mixedOrders).toHaveLength(16);
      expect(store.mixedOrders).toHaveLength(store.arrayLength);
      stopListening();
    });

    it('turns off cage mode and restores pro mode when it was on before entering cage mode', async () => {
      const store = useBaseStore();
      store.enableCageMode = true;
      store.cageMode = true;
      store.proBeforeCage = true;
      mountModal();
      await toggleCheckbox('enable-cage-mode');
      expect(store.enableCageMode).toBe(false);
      expect(store.cageMode).toBe(false);
      expect(store.proMode).toBe(true);
      expect(localStorage.getItem('proMode')).toBe('true');
    });

    it('turns off cage mode without touching pro mode when it was off before entering cage mode', async () => {
      const store = useBaseStore();
      store.enableCageMode = true;
      store.cageMode = true;
      store.proBeforeCage = false;
      mountModal();
      await toggleCheckbox('enable-cage-mode');
      expect(store.proMode).toBe(false);
    });
  });

  describe('setProMode', () => {
    it('turning it on enables hover control, disables cage mode, resets the session, and loads averages when registered', async () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      store.enableCageMode = true;
      store.cageMode = true;
      localStorage.setItem('_xss', 'stale-session');
      localStorage.setItem('_xcs', 'stale-count');
      store.consecutiveSolves = 5;
      mountModal();
      await toggleCheckbox('pro-mode');

      expect(store.proMode).toBe(true);
      expect(store.hoverOnControl).toBe(true);
      expect(store.enableCageMode).toBe(false);
      expect(store.cageMode).toBe(false);
      expect(store.spaceBetween).toBe(0);
      expect(localStorage.getItem('_xss')).toBeNull();
      expect(localStorage.getItem('_xcs')).toBeNull();
      expect(store.consecutiveSolves).toBe(0);
      await vi.waitFor(() => {
        expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('user_averages'), store.token);
      });
    });

    it('turning it off does not force hover control on or fetch averages', async () => {
      const store = useBaseStore();
      store.proMode = true;
      store.hoverOnControl = false;
      mountModal();
      await toggleCheckbox('pro-mode');
      expect(store.proMode).toBe(false);
      expect(store.hoverOnControl).toBe(false);
      expect(useGetFetchAPI).not.toHaveBeenCalled();
    });
  });

  describe('setMarathonMode', () => {
    it('toggles it on, resets fmc/cage state, and re-requests averages via the watcher', async () => {
      const store = useBaseStore();
      store.proMode = true;
      store.token = 'real-session-token';
      store.fmcBlitz = true;
      store.enableCageMode = true;
      store.cageMode = true;
      localStorage.setItem('_xss', 'stale-session');
      mountModal();
      await toggleCheckbox('marathon-mode');

      expect(store.marathonMode).toBe(true);
      expect(store.fmcBlitz).toBe(false);
      expect(store.enableCageMode).toBe(false);
      expect(store.cageMode).toBe(false);
      expect(localStorage.getItem('_xss')).toBeNull();
      await vi.waitFor(() => {
        expect(useGetFetchAPI).toHaveBeenCalledWith(expect.stringContaining('puzzle_type=marathon'), store.token);
      });
    });

    it('toggles it back off', async () => {
      const store = useBaseStore();
      store.marathonMode = true;
      mountModal();
      await toggleCheckbox('marathon-mode');
      expect(store.marathonMode).toBe(false);
      expect(localStorage.getItem('marathonMode')).toBe('false');
    });
  });

  describe('setFMCBlitzMode', () => {
    it('turns on pro mode first when it was off, then enables fmc blitz at the standard size', async () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      store.marathonMode = true;
      const wrapper = mountModal();
      await toggleCheckbox('fmc-blitz-mode-mode');

      expect(store.proMode).toBe(true);
      expect(store.fmcBlitz).toBe(true);
      expect(store.marathonMode).toBe(false);
      expect(store.enableCageMode).toBe(false);
      expect(store.cageMode).toBe(false);
      expect(internals(wrapper).puzzleSize).toBe(4);
    });

    it('keeps a puzzle size that is already valid for fmc blitz', async () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      store.proMode = true;
      store.numLines = 5;
      const wrapper = mountModal();
      await toggleCheckbox('fmc-blitz-mode-mode');
      expect(internals(wrapper).puzzleSize).toBe(5);
    });

    it('resets an invalid puzzle size down to the standard core size', async () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      store.proMode = true;
      store.numLines = 6;
      const wrapper = mountModal();
      await toggleCheckbox('fmc-blitz-mode-mode');
      expect(internals(wrapper).puzzleSize).toBe(4);
    });

    it('turns fmc blitz back off without re-enabling pro mode a second time', async () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      store.proMode = true;
      store.fmcBlitz = true;
      mountModal();
      await toggleCheckbox('fmc-blitz-mode-mode');
      expect(store.fmcBlitz).toBe(false);
      expect(store.proMode).toBe(true);
    });
  });

  describe('puzzle size slider', () => {
    it('changing away from the standard size disables cage mode and restores pro mode from before cage mode', async () => {
      const store = useBaseStore();
      store.enableCageMode = true;
      store.proBeforeCage = true;
      const wrapper = mountModal();
      await clickSliderMark('5');

      expect(internals(wrapper).puzzleSize).toBe(5);
      expect(store.numLines).toBe(5);
      expect(store.enableCageMode).toBe(false);
      expect(store.proMode).toBe(true);
      expect(localStorage.getItem('numLines')).toBe('5');
    });

    it('resets fmc blitz when the new size is not a valid fmc blitz size', async () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      mountModal();
      await clickSliderMark('7');
      expect(store.fmcBlitz).toBe(false);
    });

    it('keeps fmc blitz when the new size is still a valid fmc blitz size', async () => {
      const store = useBaseStore();
      store.fmcBlitz = true;
      mountModal();
      await clickSliderMark('3');
      expect(store.fmcBlitz).toBe(true);
    });

    it('re-initializes when moving away from the standard size', async () => {
      const store = useBaseStore();
      mountModal();
      const initSpy = vi.spyOn(store, 'initAfterNewPuzzleSize');
      await clickSliderMark('6');
      expect(store.numLines).toBe(6);
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('skips re-initializing when moving back to the standard size while cage mode stays enabled', async () => {
      const store = useBaseStore();
      store.numLines = 5;
      store.enableCageMode = true;
      mountModal();
      const initSpy = vi.spyOn(store, 'initAfterNewPuzzleSize');
      await clickSliderMark('4');
      expect(store.numLines).toBe(4);
      expect(initSpy).not.toHaveBeenCalled();
    });

    it('ignores a puzzle size of 0, which the slider itself never emits', async () => {
      const store = useBaseStore();
      const wrapper = mountModal();
      const initSpy = vi.spyOn(store, 'initAfterNewPuzzleSize');
      internals(wrapper).puzzleSize = 0;
      await nextTick();
      expect(store.numLines).not.toBe(0);
      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe('closing the modal', () => {
    it('emits close when clicking OK', async () => {
      const wrapper = mountModal();
      document.querySelector('button.tool-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  describe('g1000 mode', () => {
    it('hides the mode-switching options while keeping dark mode and disable-win-message visible', () => {
      const store = useBaseStore();
      store.g1000Mode = true;
      mountModal();
      expect(exists('enable-cage-mode')).toBe(false);
      expect(exists('pro-mode')).toBe(false);
      expect(exists('marathon-mode')).toBe(false);
      expect(exists('fmc-blitz-mode-mode')).toBe(false);
      expect(exists('keep-session')).toBe(false);
      expect(exists('dark-mode')).toBe(true);
      expect(exists('disable-win-message')).toBe(true);
    });
  });

  describe('fmc blitz / keep session visibility', () => {
    it('hides fmc blitz and keep session options without a token', () => {
      mountModal();
      expect(exists('fmc-blitz-mode-mode')).toBe(false);
      expect(exists('keep-session')).toBe(false);
    });

    it('hides them during a network error even with a token', () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      store.isNetworkError = true;
      mountModal();
      expect(exists('fmc-blitz-mode-mode')).toBe(false);
    });

    it('shows them with a token and no network error', () => {
      const store = useBaseStore();
      store.token = 'real-session-token';
      mountModal();
      expect(exists('fmc-blitz-mode-mode')).toBe(true);
      expect(exists('keep-session')).toBe(true);
    });
  });
});
