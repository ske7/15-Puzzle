<script setup lang="ts">
import { computed } from 'vue';
import { shortenSolutionStr, convertScramble, convertScrambles } from '@/utils';
import { useClipboard } from '@vueuse/core';

const props = defineProps<{ itemToCopy: string; isSolvePath: boolean; puzzleType?: string }>();
const { copy, copied } = useClipboard({ copiedDuring: 500 });

const copyText = computed(() => {
  if (props.isSolvePath) {
    return shortenSolutionStr(props.itemToCopy);
  }
  if ((props.puzzleType?.toLowerCase().startsWith('m')) ?? false) {
    return convertScrambles(props.itemToCopy, props.puzzleType);
  }
  return convertScramble(props.itemToCopy);
});
</script>

<template>
  <button
    type="button"
    class="tool-button copy-button"
    :disabled="copied"
    @click="copy(copyText)"
  >
    <span>📷</span>
  </button>
</template>

<style scoped>
* {
  --vd-font-size: 12px;
  --vh-font-size: 13px;
}
.copy-button {
  cursor: auto;
  border: 0px;
  font-style: normal;
  height: 24px;
  width: 24px;
  min-width:24px;
  transition: 1ms all ease-out;
  font-size: var(--vd-font-size);
  background-color: transparent;
  display: inline;
}
.copy-button:disabled {
  cursor: auto;
  opacity: 1;
  font-style: italic;
}
.copy-button:hover, .copy-button:active {
  background-color: transparent;
}
.copy-button:active:not([disabled]) {
  cursor: pointer;
  padding-top: 1px;
  font-size: var(--vh-font-size);
}
.copy-button:hover:not([disabled]) {
  cursor: pointer;
  padding-top: 1px;
  padding-left: 3px;
  font-size: var(--vh-font-size);
  background-color: transparent;
}
</style>
