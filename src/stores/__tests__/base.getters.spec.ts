import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '../base';
import { loadCageImages } from '../../../tests/cageImages';
import { ControlType } from '@/const';

describe('useBaseStore - getters', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('freeElementIndex finds the blank tile', () => {
    const store = useBaseStore();
    store.currentOrders = [1, 0, 2];
    expect(store.freeElementIndex).toBe(1);
  });

  it('cagesCount matches the cages list length', () => {
    expect(useBaseStore().cagesCount).toBe(25);
  });

  it('arrayLength is numLines squared', () => {
    const store = useBaseStore();
    store.numLines = 5;
    expect(store.arrayLength).toBe(25);
  });

  it('startOrderedCount counts tiles already in place', () => {
    const store = useBaseStore();
    store.mixedOrders = [1, 3, 2, 4];
    expect(store.startOrderedCount).toBe(2);
  });

  it('isDone is false in noPlayMode', () => {
    const store = useBaseStore();
    store.noPlayMode = true;
    store.numLines = 3;
    store.inPlaceCount = 8;
    expect(store.isDone).toBe(false);
  });

  it('isDone compares inPlaceCount against arrayLength - 1', () => {
    const store = useBaseStore();
    store.numLines = 3;
    store.inPlaceCount = 8;
    expect(store.isDone).toBe(true);
    store.inPlaceCount = 7;
    expect(store.isDone).toBe(false);
  });

  it('afterDoneAnimationEnd is true and pins afterDoneCount in pro mode', () => {
    const store = useBaseStore();
    store.numLines = 3;
    store.proMode = true;
    expect(store.afterDoneAnimationEnd).toBe(true);
    expect(store.afterDoneCount).toBe(8);
  });

  it('afterDoneAnimationEnd is true while not done outside pro mode', () => {
    const store = useBaseStore();
    store.numLines = 3;
    store.inPlaceCount = 0;
    expect(store.afterDoneAnimationEnd).toBe(true);
  });

  it('afterDoneAnimationEnd compares afterDoneCount once done outside pro mode', () => {
    const store = useBaseStore();
    store.numLines = 3;
    store.inPlaceCount = 8;
    store.afterDoneCount = 8;
    expect(store.afterDoneAnimationEnd).toBe(true);
    store.afterDoneCount = 3;
    expect(store.afterDoneAnimationEnd).toBe(false);
  });

  describe('finishLoadingAllCageImages', () => {
    it('finishes only once every tile image of the current picture has loaded', () => {
      const store = useBaseStore();
      store.numLines = 3;
      store.cagePath = '01-joe';
      loadCageImages(store, 8);
      expect(store.finishLoadingAllCageImages).toBe(false);
      loadCageImages(store);
      expect(store.finishLoadingAllCageImages).toBe(true);
    });

    it('stays finished when a new puzzle is dealt the same picture', () => {
      const store = useBaseStore();
      store.numLines = 4;
      store.cagePath = '01-joe';
      store.initStore();
      loadCageImages(store);

      store.initStore();

      expect(store.finishLoadingAllCageImages).toBe(true);
    });

    it('waits again when a new puzzle is dealt a different picture', () => {
      const store = useBaseStore();
      store.numLines = 4;
      store.cagePath = '01-joe';
      loadCageImages(store);

      store.cagePath = '02-primal';
      store.initStore();

      expect(store.finishLoadingAllCageImages).toBe(false);
    });
  });

  it('timeMRecord and timeStr format via displayedTime', () => {
    const store = useBaseStore();
    store.timeRecord = 1500;
    store.time = 2000;
    expect(store.timeMRecord).toBe('1.500');
    expect(store.timeStr).toBe('2');
  });

  it('blitzTimeStr shows 0 for a negative time', () => {
    const store = useBaseStore();
    store.blitzTime = -1;
    expect(store.blitzTimeStr).toBe('0');
  });

  it('blitzTimeStr shows the configured FMC time before the first solve', () => {
    const store = useBaseStore();
    store.blitzTime = 0;
    store.solvedPuzzlesInMarathon = 0;
    expect(store.blitzTimeStr).toBe('180');
  });

  it('blitzTimeStr shows the formatted time otherwise', () => {
    const store = useBaseStore();
    store.blitzTime = 2500;
    store.solvedPuzzlesInMarathon = 1;
    expect(store.blitzTimeStr).toBe('2.500');
  });

  it('showModal is true when any modal flag is set', () => {
    const store = useBaseStore();
    expect(store.showModal).toBe(false);
    store.showLeaderBoard = true;
    expect(store.showModal).toBe(true);
  });

  it('disableDuringMarathon is true only during an active, unfinished marathon run', () => {
    const store = useBaseStore();
    expect(store.disableDuringMarathon).toBe(false);
    store.marathonMode = true;
    expect(store.disableDuringMarathon).toBe(false); // time is still 0
    store.time = 5000;
    expect(store.disableDuringMarathon).toBe(true);
    store.inPlaceCount = store.arrayLength - 1; // isDone
    expect(store.disableDuringMarathon).toBe(false);
  });

  it('cannotClick is true when any modal is open, during a marathon run, or in replay', () => {
    const store = useBaseStore();
    expect(store.cannotClick).toBe(false);
    store.showLeaderBoard = true;
    expect(store.cannotClick).toBe(true);
    store.showLeaderBoard = false;
    store.marathonMode = true;
    store.time = 5000;
    expect(store.cannotClick).toBe(true);
    store.marathonMode = false;
    store.inReplay = true;
    expect(store.cannotClick).toBe(true);
  });

  it('cageImgIndex finds the index of the current cage path', () => {
    const store = useBaseStore();
    store.cagePath = '03-willy';
    expect(store.cageImgIndex).toBe(2);
  });

  it('unlockedCagesSortedArr sorts numerically', () => {
    const store = useBaseStore();
    store.unlockedCages = new Set([10, 2, 1]);
    expect(store.unlockedCagesSortedArr).toEqual([1, 2, 10]);
  });

  it('unlockedCagesValues maps indices back to cage paths', () => {
    const store = useBaseStore();
    store.unlockedCages = new Set([0, 2]);
    expect(store.unlockedCagesValues).toEqual(['01-joe', '03-willy']);
  });

  it('freeElementCol / freeElementRow derive from freeElementIndex', () => {
    const store = useBaseStore();
    store.numLines = 4;
    store.currentOrders = [1, 2, 3, 4, 5, 0, 7, 8, 9, 10, 11, 12, 13, 14, 15, 6];
    expect(store.freeElementCol).toBe(2);
    expect(store.freeElementRow).toBe(2);
  });

  it('registered reflects whether a token is present', () => {
    const store = useBaseStore();
    expect(store.registered).toBe(false);
    store.token = 'tok';
    expect(store.registered).toBe(true);
  });

  it('tps computes moves per second via calculateTPS', () => {
    const store = useBaseStore();
    store.movesCount = 100;
    store.time = 2000;
    expect(store.tps).toBe('50.000');
  });

  it('getControlTypeStr maps each control type', () => {
    const store = useBaseStore();
    store.moveDoneBy = ControlType.Touch;
    expect(store.getControlTypeStr).toBe('touch');
    store.moveDoneBy = ControlType.Keyboard;
    expect(store.getControlTypeStr).toBe('keyboard');
    store.moveDoneBy = ControlType.Mouse;
    expect(store.getControlTypeStr).toBe('mouse');
  });

  it('sharedPlaygroundMode is true only when every condition holds', () => {
    const store = useBaseStore();
    store.playgroundMode = true;
    store.publicId = 'pub';
    store.userName = 'me';
    store.otherUserName = 'someone-else';
    expect(store.sharedPlaygroundMode).toBe(true);
  });

  it('sharedPlaygroundMode is false when the viewer owns the scramble', () => {
    const store = useBaseStore();
    store.playgroundMode = true;
    store.publicId = 'pub';
    store.userName = 'me';
    store.otherUserName = 'me';
    expect(store.sharedPlaygroundMode).toBe(false);
  });

  it('getTime treats a zero time as 1 to avoid divide-by-zero', () => {
    const store = useBaseStore();
    store.time = 0;
    expect(store.getTime).toBe(1);
    store.time = 500;
    expect(store.getTime).toBe(500);
  });

  it('walkSpeed is faster in fast-walk mode', () => {
    const store = useBaseStore();
    expect(store.walkSpeed).toBe(200);
    store.fastWalkMode = true;
    expect(store.walkSpeed).toBe(50);
  });
});
