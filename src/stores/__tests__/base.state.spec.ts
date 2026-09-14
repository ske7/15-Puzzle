import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../base';
import * as utils from '../../utils';

describe('useBaseStore - state, records, cage unlocking', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('state defaults from localStorage', () => {
    it('reads persisted boolean flags on creation', () => {
      localStorage.setItem('proMode', 'true');
      localStorage.setItem('darkMode', 'true');
      setActivePinia(createPinia());
      const store = useBaseStore();
      expect(store.proMode).toBe(true);
      expect(store.darkMode).toBe(true);
    });

    it('defaults booleans to false when nothing is persisted', () => {
      const store = useBaseStore();
      expect(store.proMode).toBe(false);
      expect(store.cageMode).toBe(false);
    });
  });

  describe('setSpaceBetween', () => {
    it('is 0 in cage mode', () => {
      const store = useBaseStore();
      store.cageMode = true;
      store.setSpaceBetween();
      expect(store.spaceBetween).toBe(0);
    });

    it('is 0 in pro mode', () => {
      const store = useBaseStore();
      store.proMode = true;
      store.setSpaceBetween();
      expect(store.spaceBetween).toBe(0);
    });

    it('uses the default spacing otherwise', () => {
      const store = useBaseStore();
      store.setSpaceBetween();
      expect(store.spaceBetween).toBe(8);
    });
  });

  describe('incMoves', () => {
    it('increments movesCount', () => {
      const store = useBaseStore();
      store.incMoves();
      store.incMoves();
      expect(store.movesCount).toBe(2);
    });
  });

  // The size-suffix rule these cover now lives in recordCodec's recordStorageKey, which
  // has its own dedicated spec - kept here too, asserted through the store, because the
  // exact key names are what existing installs already hold.
  describe('record storage keys', () => {
    it('uses the unsuffixed key for the default core size', () => {
      const store = useBaseStore();
      store.setTimeRecord(1000, 20, 4, false, true);
      expect(localStorage.getItem('timeRecord')).not.toBeNull();
      expect(localStorage.getItem('timeRecord4')).toBeNull();
    });

    it('appends the size for any other puzzle size', () => {
      const store = useBaseStore();
      store.setTimeRecord(1000, 20, 6, false, true);
      expect(localStorage.getItem('timeRecord6')).not.toBeNull();
      expect(localStorage.getItem('timeRecord')).toBeNull();
    });
  });

  describe('getFMCBlitzScrambleCount', () => {
    it('returns 50 for size 3', () => {
      expect(useBaseStore().getFMCBlitzScrambleCount(3)).toBe(50);
    });

    it('returns 5 for size 5', () => {
      expect(useBaseStore().getFMCBlitzScrambleCount(5)).toBe(5);
    });

    it('returns 12 for any other size', () => {
      expect(useBaseStore().getFMCBlitzScrambleCount(4)).toBe(12);
      expect(useBaseStore().getFMCBlitzScrambleCount(8)).toBe(12);
    });
  });

  describe('time/moves/FMC-blitz record round trips', () => {
    beforeEach(() => {
      vi.spyOn(utils, 'generateRand').mockReturnValue(0.123456789);
    });

    it('setTimeRecord + loadTimeRecord round-trips the value', () => {
      const store = useBaseStore();
      store.setTimeRecord(12345, 42, 4, false);
      expect(store.timeRecord).toBe(12345);
      expect(store.newTimeRecord).toBe(true);
      const loaded = store.loadTimeRecord(false, 4);
      expect(loaded).toEqual({ record: 12345, adding: 42 });
    });

    it('setTimeRecord does nothing when equal and moves is not lower', () => {
      const store = useBaseStore();
      store.setTimeRecord(100, 10, 4, false);
      store.newTimeRecord = false;
      store.setTimeRecord(100, 20, 4, false);
      expect(store.newTimeRecord).toBe(false);
      expect(store.timeRecordMoves).toBe(10);
    });

    it('setTimeRecord with onlySetToStorage does not flip the new-record flag', () => {
      const store = useBaseStore();
      store.setTimeRecord(500, 5, 4, false, true);
      expect(store.newTimeRecord).toBe(false);
      expect(store.timeRecord).toBe(500);
    });

    it('setTimeRecord uses a separate key for marathon mode', () => {
      const store = useBaseStore();
      store.setTimeRecord(999, 9, 4, true);
      expect(localStorage.getItem('timeMRecord')).not.toBeNull();
      expect(localStorage.getItem('timeRecord')).toBeNull();
    });

    it('setMovesRecord + loadMovesRecord round-trips the value', () => {
      const store = useBaseStore();
      store.setMovesRecord(77, 3210, 5, false);
      expect(store.movesRecord).toBe(77);
      expect(store.newMovesRecord).toBe(true);
      expect(store.loadMovesRecord(false, 5)).toEqual({ record: 77, adding: 3210 });
    });

    it('setMovesRecord does nothing when equal and time is not lower', () => {
      const store = useBaseStore();
      store.setMovesRecord(10, 100, 4, false);
      store.newMovesRecord = false;
      store.setMovesRecord(10, 200, 4, false);
      expect(store.newMovesRecord).toBe(false);
    });

    it('setFMCBlitzRecord + loadFMCBlitzMovesRecord round-trips the value', () => {
      const store = useBaseStore();
      store.setFMCBlitzRecord(15, 6789, 3, false);
      expect(store.fmcBlitzMovesRecord).toBe(15);
      expect(store.newFMCBlitzMovesRecord).toBe(true);
      expect(store.loadFMCBlitzMovesRecord(3)).toEqual({ record: 15, adding: 6789 });
    });

    it('setFMCBlitzRecord does nothing when the record is unchanged', () => {
      const store = useBaseStore();
      store.setFMCBlitzRecord(15, 100, 3, false);
      store.newFMCBlitzMovesRecord = false;
      store.setFMCBlitzRecord(15, 999, 3, false);
      expect(store.newFMCBlitzMovesRecord).toBe(false);
    });

    it('setFMCBlitzRecord with onlySetToStorage does not flip the new-record flag', () => {
      const store = useBaseStore();
      store.setFMCBlitzRecord(20, 100, 3, true);
      expect(store.newFMCBlitzMovesRecord).toBe(false);
      expect(store.fmcBlitzMovesRecord).toBe(20);
    });

    it('loadTimeRecord returns zeros when nothing is stored', () => {
      expect(useBaseStore().loadTimeRecord(false, 4)).toEqual({ record: 0, adding: 0 });
    });

    // One case per RecordKind: each takes its own reset branch in
    // loadRecordFromLocalStorage, so all three need exercising.
    it.each([
      { kind: 'time' as const, key: 'timeRecord', field: 'timeRecord' as const },
      { kind: 'moves' as const, key: 'movesRecord', field: 'movesRecord' as const },
      { kind: 'fmcBlitz' as const, key: 'fmcBlitzMovesRecord', field: 'fmcBlitzMovesRecord' as const }
    ])('loadRecordFromLocalStorage resets and returns zero on a bad $kind codeword', ({ kind, key, field }) => {
      const store = useBaseStore();
      localStorage.setItem(key, btoa('1234123456123456XXXX'));
      expect(store.loadRecordFromLocalStorage(kind, 4, false)).toEqual({ record: 0, adding: 0 });
      expect(store[field]).toBe(0);
    });

    it('loadRecordFromLocalStorage tolerates the legacy y/h codeword typo but still rejects the payload', () => {
      const store = useBaseStore();
      // 'hey7' passes the lenient y/h-tolerant match against 'heh7' (String.replace
      // only swaps the first 'y', so this is the one corruption that survives it),
      // but its third character isn't 'h', so the payload itself is still rejected.
      localStorage.setItem('timeRecord', btoa('1234123456123456hey7'));
      const result = store.loadRecordFromLocalStorage('time', 4, false);
      expect(result).toEqual({ record: 0, adding: 0 });
    });

    it('loadTimeRecord recovers to zeros when the stored value is not valid base64', () => {
      localStorage.setItem('timeRecord', '***not-base64***');
      expect(useBaseStore().loadTimeRecord(false, 4)).toEqual({ record: 0, adding: 0 });
    });

    it('loadMovesRecord recovers to zeros when the stored value is not valid base64', () => {
      localStorage.setItem('movesRecord', '***not-base64***');
      expect(useBaseStore().loadMovesRecord(false, 4)).toEqual({ record: 0, adding: 0 });
    });

    it('loadFMCBlitzMovesRecord recovers to zeros when the stored value is not valid base64', () => {
      localStorage.setItem('fmcBlitzMovesRecord', '***not-base64***');
      expect(useBaseStore().loadFMCBlitzMovesRecord(4)).toEqual({ record: 0, adding: 0 });
    });
  });

  describe('setRecords', () => {
    beforeEach(() => {
      vi.spyOn(utils, 'generateRand').mockReturnValue(0.123456789);
    });

    it('sets recordVer and loads zeros on a completely fresh install', () => {
      const store = useBaseStore();
      store.setRecords();
      expect(localStorage.getItem('recordVer')).toBe('1');
      expect(store.timeRecord).toBe(0);
      expect(store.movesRecord).toBe(0);
    });

    it('does not re-migrate once recordVer is already set', () => {
      localStorage.setItem('recordVer', '1');
      const store = useBaseStore();
      store.setRecords();
      expect(store.timeRecord).toBe(0);
    });

    it('migrates a legacy unversioned standard timeRecord', () => {
      const seed = useBaseStore();
      seed.setTimeRecord(111, 11, 4, false, true);
      seed.setMovesRecord(22, 222, 4, false, true);
      localStorage.removeItem('recordVer');

      const store = useBaseStore();
      store.setRecords();
      expect(localStorage.getItem('recordVer')).toBe('1');
      expect(store.timeRecord).toBe(111);
    });

    it('migrates a legacy unversioned marathon timeMRecord', () => {
      const seed = useBaseStore();
      seed.setTimeRecord(333, 33, 4, true, true);
      seed.setMovesRecord(44, 444, 4, true, true);
      localStorage.removeItem('recordVer');
      seed.marathonMode = true;

      const store = useBaseStore();
      store.marathonMode = true;
      store.setRecords();
      expect(localStorage.getItem('recordVer')).toBe('1');
      expect(store.timeRecord).toBe(333);
    });
  });

  describe('reset', () => {
    it('resets consecutive-solve session when not done and in pro mode', () => {
      const store = useBaseStore();
      store.proMode = true;
      store.inPlaceCount = 0;
      store.consecutiveSolves = 5;
      localStorage.setItem('_xss', 'x');
      localStorage.setItem('_xcs', 'y');
      store.reset(false);
      expect(store.consecutiveSolves).toBe(0);
      expect(localStorage.getItem('_xss')).toBeNull();
      expect(localStorage.getItem('_xcs')).toBeNull();
    });

    it('re-initializes the store in pro mode', () => {
      const store = useBaseStore();
      store.proMode = true;
      store.movesCount = 9;
      store.reset(false);
      expect(store.movesCount).toBe(0);
    });

    it('re-initializes the store when configMode is true', () => {
      const store = useBaseStore();
      store.movesCount = 9;
      store.reset(true);
      expect(store.movesCount).toBe(0);
    });

    it('just flags a list reset otherwise', () => {
      const store = useBaseStore();
      store.movesCount = 9;
      store.reset(false);
      expect(store.movesCount).toBe(9);
      expect(store.doResetList).toBe(true);
    });
  });

  describe('boardSize', () => {
    it('formats the pixel size from lines, square size and spacing', () => {
      const store = useBaseStore();
      store.numLines = 4;
      store.spaceBetween = 8;
      expect(store.boardSize(50)).toBe('240px');
    });
  });

  describe('cage unlocking', () => {
    it('setUnlockedCages does nothing without a cagePath', () => {
      const store = useBaseStore();
      store.setUnlockedCages();
      expect(store.unlockedCages.size).toBe(0);
      expect(localStorage.getItem('_xcu')).toBeNull();
    });

    it('setUnlockedCages records the current cage index', () => {
      const store = useBaseStore();
      store.cagePath = '02-primal';
      store.setUnlockedCages();
      expect(store.unlockedCages.has(1)).toBe(true);
      expect(localStorage.getItem('_xcu')).not.toBeNull();
    });

    it('loadUnlockedCagesFromLocalStorage does nothing without stored data', () => {
      const store = useBaseStore();
      store.loadUnlockedCagesFromLocalStorage();
      expect(store.unlockedCages.size).toBe(0);
    });

    it('loadUnlockedCagesFromLocalStorage restores stored indices', () => {
      localStorage.setItem('_xcu', btoa('0,2,4'));
      const store = useBaseStore();
      store.loadUnlockedCagesFromLocalStorage();
      expect([...store.unlockedCages].sort((a, b) => a - b)).toEqual([0, 2, 4]);
    });

    it('doPrepareCageMode picks from unlocked cages when not all are unlocked', () => {
      const store = useBaseStore();
      store.unlockedCages = new Set([0, 1, 2]);
      store.doPrepareCageMode();
      expect(store.cageMode).toBe(true);
      expect(store.cagePath).not.toBe('');
    });

    it('doPrepareCageMode picks from all cages once every one is unlocked', () => {
      const store = useBaseStore();
      store.unlockedCages = new Set(Array.from({ length: store.cagesCount }, (_, i) => i));
      store.doPrepareCageMode();
      expect(store.cagePath).not.toBe('');
    });

    it('doPrepareCageMode clears shownCages once every cage has been shown', () => {
      const store = useBaseStore();
      store.unlockedCages = new Set(Array.from({ length: store.cagesCount }, (_, i) => i));
      // Every cage is already unlocked, so unlockedCagesValues is the full path list.
      store.shownCages = new Set(store.unlockedCagesValues);
      store.doPrepareCageMode();
      expect(store.shownCages.size).toBe(1);
      expect(store.cagePath).not.toBe('');
    });
  });

  describe('preloadImage', () => {
    // The preload is the browser fetching src, so assert on that rather than on any
    // bookkeeping. afterEach's unstubAllGlobals puts the real Image back.
    function captureRequestedSrcs(): string[] {
      const srcs: string[] = [];
      vi.stubGlobal('Image', class {
        set src(value: string) {
          srcs.push(value);
        }
      });
      return srcs;
    }

    it('requests the placeholder path when asked for one', () => {
      const srcs = captureRequestedSrcs();
      const store = useBaseStore();
      store.preloadImage('01-joe', true);
      expect(srcs).toEqual(['/cages/placeholder.jpg']);
    });

    it('requests the full cage path otherwise', () => {
      const srcs = captureRequestedSrcs();
      const store = useBaseStore();
      store.preloadImage('01-joe');
      expect(srcs).toEqual(['/cages/01-joe/complete.jpg']);
    });
  });

  describe('clearMarathonData', () => {
    it('clears marathon scrambles and solves', () => {
      const store = useBaseStore();
      store.marathonScrambles = 'a';
      store.marathonSolves = 'b';
      store.clearMarathonData();
      expect(store.marathonScrambles).toBe('');
      expect(store.marathonSolves).toBe('');
    });
  });
});
