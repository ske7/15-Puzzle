import { defineStore } from 'pinia';
import { generateAndShuffle, generate } from '../utils';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: 4,
    freeElement: 16,
    time: 0,
    movesCount: 0,
    afterDoneCount: 0,
    actualOrders: [] as number[],
    mixedOrders: [] as number[],
    doResetList: false,
    interval: 0,
    paused: false,
    movesRecord: 0,
    timeRecord: 0
  }),
  actions: {
    initStore() {
      this.numLines = 4;
      this.freeElement = 16;
      this.time = 0;
      this.movesCount = 0;
      this.afterDoneCount = 0;
      this.actualOrders = generate(this.numLines ** 2);
      this.mixedOrders = generateAndShuffle(this.numLines ** 2);
      this.doResetList = false;
    },
    incMoves() {
      this.movesCount++;
    },
    reset() {
      this.doResetList = true;
    },
    stopInterval() {
      clearInterval(this.interval);
    },
    invertPaused() {
      this.paused = !this.paused;
    }
  },
  getters: {
    orderedCount(): number {
      let count = 0;
      for (const i in this.actualOrders) {
        if (this.actualOrders[i] === this.mixedOrders[i]) {
          count += 1;
        }
      }
      return count;
    },
    isDone(): boolean {
      return this.orderedCount === this.numLines ** 2 - 1;
    },
    afterDoneAnimationEnd(): boolean {
      if (!this.isDone) {
        return true;
      }
      return this.afterDoneCount === this.numLines ** 2 - 1;
    },
    minutes(): number {
      return Math.floor(this.time / 60);
    },
    seconds(): string {
      return (this.time % 60).toString().padStart(2, '0');
    },
    timeRecordMinutes(): number {
      return Math.floor(this.timeRecord / 60);
    },
    timeRecordSeconds(): string {
      return (this.timeRecord % 60).toString().padStart(2, '0');
    }
  }
});
