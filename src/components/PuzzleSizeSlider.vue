<script setup lang="ts">
import { cores, CORE_NUM } from '@/const';

const props = withDefaults(defineProps<{ modelValue: number; disabled?: boolean }>(), {
  disabled: false
});

const emit = defineEmits<{ 'update:modelValue': [number] }>();

const setValue = (value: number): void => {
  if (!isNaN(value) && cores.includes(value)) {
    emit('update:modelValue', value);
  } else {
    emit('update:modelValue', CORE_NUM);
  }
};
const setInputValue = (event: Event): void => {
  const value = (event.target as HTMLInputElement).value;
  setValue(Number(value));
};
</script>

<template>
  <div class="puzzle-size-slider-container">
    <label for="core-num">Puzzle Size</label>
    <input
      id="core-num"
      :value="props.modelValue"
      name="core-num"
      type="range"
      :min="cores[0]"
      :max="cores.slice(-1)[0]"
      step="1"
      list="markers"
      class="slider"
      :disabled="props.disabled"
      @input="setInputValue($event)"
    >
    <datalist id="markers">
      <option
        v-for="(item, i) in cores"
        :key="i"
        :value="item"
        :label="`${item}x${item}`"
      />
    </datalist>
    <p class="slider-marks">
      <span v-for="(item, i) in cores" :key="i" @click="setValue(item)">
        {{ `${item}x${item}` }}
      </span>
    </p>
  </div>
</template>

<style scoped>
.puzzle-size-slider-container {
  width: 100%;
  margin: 0 auto;
}
.puzzle-size-slider-container > label {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  font-weight: 600;
}
.slider {
  width: 100%;
  cursor: pointer;
  height: 15px;
}
.slider-marks {
  display: flex;
  justify-content: space-between;
  margin-top: -4px;
  margin-bottom: 5px;
}
.slider-marks span {
  cursor: pointer;
}
@media screen and (max-width: 350px) {
  .puzzle-size-slider-container > label {
    margin-top: 5px;
  }
  .slider-marks {
    margin-bottom: 3px
  }
}
</style>
