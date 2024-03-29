<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  choices: string[];
  header: string;
  capitalize?: boolean;
  gap?: number;
  names?: string[] | null;
}>(),
{
  capitalize: true,
  gap: 25,
  names: null
});
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const setValue = (value: string): void => {
  emit('update:modelValue', value);
};
const doCapitalize = (str: string, index: number): string => {
  if (props.names !== null) {
    return props.names[index];
  }
  if (!props.capitalize) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};
const gapValue = computed(() => {
  return `${props.gap}px`;
});
</script>

<template>
  <div class="puzzle-mode-container">
    <p>{{ header }}</p>
    <div class="puzzle-mode-group">
      <label v-for="(item, index) in choices" :key="index" :for="item">
        <input
          :id="item"
          :checked="props.modelValue === item"
          type="radio"
          :value="item"
          :name="item"
          @change="setValue(item)"
        >
        <span @click="setValue(item)">
          {{ doCapitalize(item, index) }}
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
  gap: v-bind(gapValue);
  margin-bottom: 5px;
}
.puzzle-mode-group input {
  margin-right: 5px;
  cursor: pointer;
  margin-top: 3px;
}
.puzzle-mode-group span {
  cursor: pointer;
}
.puzzle-mode-group label {
  display: flex;
  align-items: center;
  line-height: 1.5;
}
input[type="radio"] {
  -ms-transform: scale(1.2);
  -webkit-transform: scale(1.2);
  transform: scale(1.2);
}
@media screen and (max-width: 840px) {
  input[type="radio"] {
   -ms-transform: scale(1.1);
   -webkit-transform: scale(1.1);
   transform: scale(1.1);
  }
}
</style>
