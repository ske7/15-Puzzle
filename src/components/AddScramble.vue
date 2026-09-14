<script setup lang="ts">
import { ref, reactive } from 'vue';
import { type ScrambleData } from '../types';
import { convertToNumbersArray, isSolvable, isSorted, sumArrayElements } from '@/utils';
import { cores } from '@/const';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';

const emit = defineEmits<{ close: []; set: [scramble: number[]] }>();

const addScramble = ref<HTMLElement>();
useCloseOnClickOutside(addScramble, () => emit('close'));

const errorText = ref('');
const formData: ScrambleData = reactive({ scramble: '' });
const doSubmit = (): void => {
  errorText.value = 'null';
  const scramble = convertToNumbersArray(formData.scramble);
  if (scramble.length === 0 || !cores.includes(Math.sqrt(scramble.length))) {
    errorText.value = 'Wrong scramble format!';
    return;
  }
  if (!isSolvable(scramble)) {
    errorText.value = 'The scramble is not solvable!';
    return;
  }
  if (isSorted(scramble.slice(0, -1))) {
    errorText.value = 'The scramble already solved!';
    return;
  }
  const sum = sumArrayElements(scramble);
  if (sum !== (scramble.length * (scramble.length - 1) / 2)) {
    errorText.value = 'Wrong scramble format!';
    return;
  }
  emit('set', scramble);
};
</script>

<template>
  <div ref="addScramble" class="add-scramble modal-shell">
    <p class="header modal-header">
      <span>Add Scramble</span>
    </p>
    <form @submit.prevent="doSubmit">
      <fieldset class="fields">
        <label for="scramble">
          <span class="label-text">Scramble (format: 1,2,3... or 1 2 3 4/5 6...)</span>
          <input
            id="scramble"
            v-model.trim="formData.scramble"
            type="text"
            name="scramble"
            minlength="17"
            maxlength="300"
            required
            @focus="true"
          >
        </label>
      </fieldset>
      <p v-if="errorText !== ''" class="error-text">
        {{ errorText }}
      </p>
      <div class="buttons">
        <button
          type="submit"
          class="tool-button"
        >
          Add
        </button>
        <button
          type="button"
          class="tool-button"
          @click="emit('close')"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.add-scramble {
  --modal-width: 340px;
  justify-content: center;
  height: auto;
  width: var(--modal-width);
  z-index: var(--z-modal);
  top: 135px;
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
}
.fields {
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;
  padding: 0;
  border: none;
}
label {
  margin-bottom: 5px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-content: flex-start;
}
label input {
  max-width: 100%;
  width: 100%;
  border: 1px solid #ccc;
  background-color: var(--background-color);
  color: var(--text-color);
  height: auto;
  padding: 3px 7px;
  border-radius: 8px;
  line-height: 1.6;
}
.label-text {
  font-size: 14px;
  padding: 0 2px;
}
.buttons {
  margin-top: 10px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
  gap: 20px;
}
.tool-button {
  width: 80px;
}
.error-text {
  color: var(--error-color);
  margin-top: -5px;
  margin-bottom: 15px;
  font-size: 14px;
}
@media screen and (max-width: 420px) {
  .add-scramble {
  --modal-width: 300px;
  }
}
</style>
