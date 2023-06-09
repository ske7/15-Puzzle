import { defineStore } from 'pinia';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: 0,
    freeElement: 0,
    orderedCount: 0
  }),
  getters: {
    isDone(): boolean {
      return this.orderedCount === this.numLines ** 2 - 1;
    }
  }
});
