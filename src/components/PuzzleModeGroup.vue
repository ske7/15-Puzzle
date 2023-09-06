<script setup lang="ts">
const props = defineProps<{ modelValue: string; choices: string[]; header: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const setValue = (value: string): void => {
  emit('update:modelValue', value);
};
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
</script>

<template>
  <div class="puzzle-mode-container">
    <p>{{ header }}</p>
    <div class="puzzle-mode-group">
      <label :for="choices[0]">
        <input
          :id="choices[0]"
          :checked="props.modelValue === choices[0]"
          type="radio"
          :value="choices[0]"
          :name="choices[0]"
          @change="setValue(choices[0])"
        >
        <span @click="setValue(choices[0])">
          {{ capitalize(choices[0]) }}
        </span>
      </label>
      <label :for="choices[1]">
        <input
          :id="choices[1]"
          :checked="props.modelValue === choices[1]"
          type="radio"
          :value="choices[1]"
          :name="choices[1]"
          @change="setValue(choices[1])"
        >
        <span @click="setValue(choices[1])">
          {{ capitalize(choices[1]) }}
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.puzzle-mode-container {
  max-width: 250px;
  margin: 0 auto;
}
.puzzle-mode-container p {
  text-align: center;
  font-weight: 600;
}
.puzzle-mode-group {
  display: flex;
  justify-content: center;
  gap: 25px;
  margin-bottom: 5px;
}
.puzzle-mode-group input {
  margin-right: 5px;
}
</style>
