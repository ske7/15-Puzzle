import { defineStore } from 'pinia';

export const useBaseStore = defineStore('base', {
  state: () => ({
    numLines: 0,
    freeElement: 0
  })
});
