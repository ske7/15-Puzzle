import { defineStore } from 'pinia';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: 0,
    freeElement: 0,
    orderedCount: 0,
    movesCount: 0,
    doResetList: false,
    actualOrders: [] as number[],
    time: 0,
    interval: 0
  }),
  actions: {
    incMoves() {
      this.movesCount++;
    },
    reset() {
      this.doResetList = true;
    },
    stopInterval() {
      clearInterval(this.interval);
    }
  },
  getters: {
    isDone(): boolean {
      return this.orderedCount === this.numLines ** 2 - 1;
    },
    minutes(): number {
      return Math.floor(this.time / 60);
    },
    seconds(): string {
      return (this.time % 60).toString().padStart(2, '0');
    }
  }
});
