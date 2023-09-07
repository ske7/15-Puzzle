<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: number; disabled?: boolean }>(), {
  disabled: false
});

const emit = defineEmits<{ 'update:modelValue': [number] }>();

const setValue = (value: number): void => {
  emit('update:modelValue', value);
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
      min="3"
      max="5"
      step="1"
      list="markers"
      class="slider"
      :disabled="props.disabled"
      @input="setInputValue($event)"
    >
    <datalist id="markers">
      <option value="3" label="3x3" />
      <option value="4" label="4x4" />
      <option value="5" label="5x5" />
    </datalist>
    <p class="slider-marks">
      <span @click="setValue(3)">3x3</span>
      <span @click="setValue(4)">4x4</span>
      <span @click="setValue(5)">5x5</span>
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
  margin-top: -3px;
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
