<script setup lang="ts">
import { computed } from 'vue';
import { shortenSolutionStr, convertScramble } from '@/utils';
import { useClipboard } from '@vueuse/core';

const props = defineProps<{ itemToCopy: string; isSolvePath: boolean }>();
const { copy, copied } = useClipboard();

const copyText = computed(() => {
  if (props.isSolvePath) {
    return shortenSolutionStr(props.itemToCopy);
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
    {{ copied ? 'Copied' : '📷' }}
  </button>
</template>

<style scoped>
.copy-button {
  cursor: auto;
  border: 0px;
  font-style: normal;
  height: 24px;
  width: 32px;
  transition: 0.7ms all ease-out;
  margin-top: -5px;
  font-size: 14px;
  background-color: transparent;
}
.copy-button:disabled {
  cursor: auto;
  opacity: 1;
  font-style: italic;
  text-shadow: 2px;
}
.copy-button:hover, .copy-button:active {
  background-color: transparent;
}
.copy-button:active:not([disabled]) {
  cursor: pointer;
  padding-top: 3px;
  font-size: 1.1em;
}
.copy-button:hover:not([disabled]) {
  cursor: pointer;
  padding-top: 2px;
  padding-left: 2px;
  font-size: 1.1em;
  background-color: transparent;
}
</style>
