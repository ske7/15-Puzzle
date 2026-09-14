import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventBus } from '@vueuse/core';
import { useBaseStore } from '../../stores/base';
import { useKeyDown } from '../useKeyDown';
import { withSetup } from '../../../tests/withSetup';
import { ControlType } from '@/const';

// useKeyDown() registers via the bare global addEventListener/removeEventListener.
// Without unmounting between tests, a real listener from one test would still be
// live during the next one - and unlike plain store-state leaks, that leakage is
// NOT harmless here, since every leaked listener would mutate the same shared
// `event` object and emit on the same global (non-Pinia-scoped) event bus. Stubbing
// these two globals once for the whole file (rather than per test - repeatedly
// stubbing/restoring them, or spying on the real window.addEventListener, both
// reproducibly hung the Vitest worker here) sidesteps that: capture whichever
// handler the latest useKeyDown() setup registered and invoke it directly instead
// of going through real DOM dispatch.
let handler: (event: KeyboardEvent) => void;

function press(code: string, options: Partial<KeyboardEventInit> = {}): void {
  handler(new KeyboardEvent('keydown', { code, cancelable: true, ...options }));
}

describe('useKeyDown', () => {
  // Mount useKeyDown() exactly once for the whole file rather than per test: creating
  // and unmounting 20+ Vue app instances back-to-back (whether or not each one is
  // properly disposed) reproducibly hung the Vitest worker partway through this file,
  // at a different, non-deterministic test each run - a real, if hard to pin down,
  // resource issue with the repeated-mount pattern itself, not with any individual
  // test's logic (every test here passes fine in isolation or in small groups).
  // Resetting the same Pinia store's state between tests avoids that entirely while
  // still exercising the real composable end to end.
  let store: ReturnType<typeof useBaseStore>;
  let pinia: ReturnType<typeof createPinia>;

  beforeAll(() => {
    vi.stubGlobal('addEventListener', (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'keydown') {
        handler = listener as (event: KeyboardEvent) => void;
      }
    });
    vi.stubGlobal('removeEventListener', () => undefined);
    pinia = createPinia();
    setActivePinia(pinia);
    store = useBaseStore();
    withSetup(() => useKeyDown());
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    // The store is a setup store, which has no $reset(), and the single-mount fixture
    // above means this instance has to survive every test. So build a pristine store on
    // a throwaway pinia and copy its state across: that restores the defaults without
    // mounting anything, and gives each test its own fresh arrays/Sets rather than
    // handing every test the same snapshot's.
    setActivePinia(createPinia());
    const pristine = { ...useBaseStore().$state };
    setActivePinia(pinia);
    store.$patch((state) => {
      Object.assign(state, pristine);
    });
  });

  it('prevents the default browser action while no modal is open', () => {
    store.numLines = 4;
    store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    const event = new KeyboardEvent('keydown', { code: 'ArrowLeft', cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    handler(event);
    expect(spy).toHaveBeenCalled();
    // This key press also triggers a real movement, which starts a real setInterval
    // via beforeMove() - stop it so it doesn't leak into later tests.
    store.stopInterval();
  });

  it('does not prevent the default action while a modal is open', () => {
    store.showConfig = true;
    const event = new KeyboardEvent('keydown', { code: 'ArrowLeft', cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    handler(event);
    expect(spy).not.toHaveBeenCalled();
  });

  it('emits a restart on Escape when resetUnsolvedPuzzleWithEsc is enabled', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Escape');
    expect(events).toEqual(['restart']);
    stop();
  });

  it('tags the restart as "fromKeyboard" on Escape when the win modal is showing', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    store.showWinModal = true;
    const bus = useEventBus<string>('event-bus');
    const payloads: unknown[] = [];
    const stop = bus.on((_event, payload) => payloads.push(payload));
    press('Escape');
    expect(payloads).toEqual(['fromKeyboard']);
    stop();
  });

  it('ignores Escape when resetUnsolvedPuzzleWithEsc is disabled', () => {
    store.resetUnsolvedPuzzleWithEsc = false;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Escape');
    expect(events).toEqual([]);
    stop();
  });

  it('ignores Escape while paused', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    store.paused = true;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Escape');
    expect(events).toEqual([]);
    stop();
  });

  it('ignores Escape in g1000 mode', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    store.g1000Mode = true;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Escape');
    expect(events).toEqual([]);
    stop();
  });

  it('clears savedOrders and restarts on Ctrl+Space', () => {
    store.savedOrders = [1, 2, 3];
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Space', { ctrlKey: true });
    expect(store.savedOrders).toEqual([]);
    expect(events).toEqual(['restart']);
    stop();
  });

  it('does not restart on Space when the puzzle is unsolved and reset-on-esc is enabled', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    store.numLines = 3;
    store.inPlaceCount = 0;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Space');
    expect(events).toEqual([]);
    stop();
  });

  it('restarts on Space when the puzzle is already done', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    store.numLines = 3;
    store.inPlaceCount = 8;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    press('Space');
    expect(events).toEqual(['restart']);
    stop();
  });

  it('tags the restart as "fromKeyboard" on Space when the win modal is showing', () => {
    store.resetUnsolvedPuzzleWithEsc = true;
    store.numLines = 3;
    store.inPlaceCount = 8;
    store.showWinModal = true;
    const bus = useEventBus<string>('event-bus');
    const payloads: unknown[] = [];
    const stop = bus.on((_event, payload) => payloads.push(payload));
    press('Space');
    expect(payloads).toEqual(['fromKeyboard']);
    stop();
  });

  it('pastes a valid clipboard scramble in playground mode', async () => {
    store.playgroundMode = true;
    store.numLines = 4;
    // Must be solvable and not already (near-)solved: pasting it triggers renewPuzzle(),
    // which loops on mixAndCheckSolvable() until it accepts the scramble, and playground
    // mode's savedOrders reuse always regenerates this exact same fixed array - a solved
    // or trivially-sorted one would make that loop spin forever. See the equivalent
    // comment in base.network.spec.ts.
    vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('2,1,4,3,5,6,7,8,0');
    press('KeyV', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(store.savedOrders).toEqual([2, 1, 4, 3, 5, 6, 7, 8, 0]);
    });
    expect(store.numLines).toBe(3);
    // renewPuzzle() -> playgroundModeRenew() consumes and clears this flag once the
    // pasted scramble has actually been checked against the DB, so the final state
    // here is false, not the true it's transiently set to inside listenCtrlVKey.
    expect(store.checkUserScrambleInDB).toBe(false);
  });

  it('ignores an invalid clipboard scramble', async () => {
    store.playgroundMode = true;
    store.savedOrders = [];
    const readTextSpy = vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('not,a,valid,scramble,at,all');
    press('KeyV', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(readTextSpy).toHaveBeenCalled();
    });
    expect(store.savedOrders).toEqual([]);
  });

  it('ignores Ctrl+V outside playground mode', () => {
    const readTextSpy = vi.spyOn(navigator.clipboard, 'readText');
    press('KeyV', { ctrlKey: true });
    expect(readTextSpy).not.toHaveBeenCalled();
  });

  it('grows the puzzle size on PageUp', async () => {
    store.numLines = 4;
    press('PageUp');
    await vi.waitFor(() => {
      expect(store.numLines).toBe(5);
    });
  });

  it('shrinks the puzzle size on PageDown', async () => {
    store.numLines = 4;
    press('PageDown');
    await vi.waitFor(() => {
      expect(store.numLines).toBe(3);
    });
  });

  it.each([
    { key: 'PageUp', fmcBlitz: false, numLines: 8 },
    { key: 'PageUp', fmcBlitz: true, numLines: 5 },
    { key: 'PageDown', fmcBlitz: false, numLines: 3 },
    { key: 'PageDown', fmcBlitz: true, numLines: 3 },
  ])('does not move numLines past the boundary on $key (fmcBlitz=$fmcBlitz)', async ({ key, fmcBlitz, numLines }) => {
    store.fmcBlitz = fmcBlitz;
    store.numLines = numLines;
    press(key);
    await Promise.resolve();
    expect(store.numLines).toBe(numLines);
  });

  it('ignores puzzle-size keys while a modal is open', async () => {
    store.showConfig = true;
    store.numLines = 4;
    press('PageUp');
    await Promise.resolve();
    expect(store.numLines).toBe(4);
  });

  it('moves left on the corresponding keys, threading the keyboard control type through', async () => {
    store.numLines = 4;
    store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
    press('KeyA');
    await vi.waitFor(() => {
      expect(store.movesCount).toBe(1);
    });
    expect(store.moveDoneBy).toBe(ControlType.Keyboard);
    store.stopInterval();
  });

  it.each([
    { key: 'ArrowLeft', method: 'moveLeft' as const },
    { key: 'KeyA', method: 'moveLeft' as const },
    { key: 'KeyJ', method: 'moveLeft' as const },
    { key: 'ArrowRight', method: 'moveRight' as const },
    { key: 'KeyD', method: 'moveRight' as const },
    { key: 'KeyL', method: 'moveRight' as const },
    { key: 'ArrowUp', method: 'moveUp' as const },
    { key: 'KeyW', method: 'moveUp' as const },
    { key: 'KeyI', method: 'moveUp' as const },
    { key: 'ArrowDown', method: 'moveDown' as const },
    { key: 'KeyS', method: 'moveDown' as const },
    { key: 'KeyK', method: 'moveDown' as const },
  ])('dispatches $method on $key', async ({ key, method }) => {
    const spy = vi.spyOn(store, method).mockImplementation(() => undefined);
    press(key);
    // onKeyDown is async and awaits listenCtrlVKey() before reaching movement
    // dispatch even for non-Ctrl+V keys, so the dispatch lands one microtask later.
    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith(ControlType.Keyboard);
    });
  });

  it('does not move while the puzzle is already done', () => {
    store.numLines = 3;
    store.inPlaceCount = 8;
    store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 1];
    press('ArrowLeft');
    expect(store.movesCount).toBe(0);
  });

  it('does not move while paused', () => {
    store.paused = true;
    store.numLines = 4;
    store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
    press('KeyA');
    expect(store.movesCount).toBe(0);
  });

  // Must run last: it mounts a second useKeyDown() instance, whose own addEventListener
  // call (via the file-level stub) overwrites the shared `handler` that every test above
  // relies on.
  it('removes the keydown listener on unmount', () => {
    const removeSpy = vi.fn();
    vi.stubGlobal('removeEventListener', removeSpy);
    const [, unmount] = withSetup(() => useKeyDown());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
