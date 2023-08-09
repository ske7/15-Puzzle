<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useEventBus } from '@vueuse/core';
import { type puzzleCores } from '@/stores/const';
import { CORE_NUM } from '../stores/const';

const baseStore = useBaseStore();
const emit = defineEmits<{ close: []; }>();
const eventBus = useEventBus<string>('event-bus');

const configModal = ref<HTMLElement>();
onClickOutside(configModal, (event) => {
  event.stopPropagation();
  emit('close');
});
const disabledCageMode = computed(() => {
  return baseStore.disableCageMode || baseStore.marathonMode ||
  baseStore.proMode || baseStore.numLines !== CORE_NUM;
});

const setDisableCageMode = (): void => {
  baseStore.disableCageMode = !baseStore.disableCageMode;
  localStorage.setItem('disableCageMode', baseStore.disableCageMode.toString());
  if (baseStore.cageMode || baseStore.eligibleForCageMode) {
    baseStore.eligibleForCageMode = false;
    eventBus.emit('restart', 'fromConfig');
  }
};
const setCageHardcoreMode = (): void => {
  baseStore.cageHardcoreMode = !baseStore.cageHardcoreMode;
  localStorage.setItem('cageHardcoreMode', baseStore.cageHardcoreMode.toString());
};
const setNoBordersInCageMode = (): void => {
  baseStore.noBordersInCageMode = !baseStore.noBordersInCageMode;
  localStorage.setItem('noBordersInCageMode', baseStore.noBordersInCageMode.toString());
};
const setDarkMode = (): void => {
  baseStore.darkMode = !baseStore.darkMode;
  localStorage.setItem('darkMode', baseStore.darkMode.toString());
  document.documentElement.setAttribute('data-theme', baseStore.darkMode ? 'dark' : 'light');
};
const setDisableWinMessage = (): void => {
  baseStore.disableWinMessage = !baseStore.disableWinMessage;
  localStorage.setItem('disableWinMessage', baseStore.disableWinMessage.toString());
};
const setProMode = (): void => {
  baseStore.proMode = !baseStore.proMode;
  localStorage.setItem('proMode', baseStore.proMode.toString());
  localStorage.setItem('fasterSliding', baseStore.proMode.toString());
  baseStore.setSpaceBetween();
  eventBus.emit('restart', 'fromConfig');
};
const setProPalette = (): void => {
  baseStore.proPalette = !baseStore.proPalette;
  localStorage.setItem('proPalette', baseStore.proPalette.toString());
  baseStore.setSpaceBetween();
};
const setMarathonMode = (): void => {
  baseStore.marathonMode = !baseStore.marathonMode;
  localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
  baseStore.eligibleForCageMode = false;
  eventBus.emit('restart', 'fromConfig');
};
const sliderValue = ref<number>(baseStore.numLines);

watch(sliderValue, (newValue) => {
  if (newValue) {
    baseStore.numLines = Number(newValue) as puzzleCores;
    localStorage.setItem('numLines', baseStore.numLines.toString());
    eventBus.emit('restart', 'fromConfig');
  }
});
</script>

<template>
  <Teleport to="body">
    <div ref="configModal" class="config-modal">
      <p class="info-header">
        <span>Game config</span>
      </p>
      <div class="options">
        <div class="slide-container">
          <label for="core-num">Puzzle Type</label>
          <input
            id="core-num"
            v-model="sliderValue"
            name="core-num"
            type="range"
            min="3"
            max="5"
            step="1"
            list="markers"
            class="slider"
          >
          <datalist id="markers">
            <option value="3" label="3x3" />
            <option value="4" label="4x4" />
            <option value="5" label="5x5" />
          </datalist>
          <p class="slider-marks">
            <span>3x3</span><span>4x4</span><span>5x5</span>
          </p>
        </div>
        <div class="option">
          <input
            id="disable-cage-mode"
            type="checkbox"
            name="disable-cage-mode"
            :disabled="baseStore.marathonMode || baseStore.proMode || baseStore.numLines !== CORE_NUM"
            :checked="baseStore.disableCageMode"
            @change="setDisableCageMode"
          >
          <label
            for="disable-cage-mode"
            :class="{ 'disabled-label': baseStore.marathonMode ||
              baseStore.proMode || baseStore.numLines !== CORE_NUM }"
          >
            Disable Cage Mode
          </label>
        </div>
        <div class="option">
          <input
            id="hardcore"
            type="checkbox"
            name="hardcore"
            :disabled="disabledCageMode"
            :checked="baseStore.cageHardcoreMode"
            @change="setCageHardcoreMode"
          >
          <label for="hardcore" :class="{ 'disabled-label': disabledCageMode }">
            Cage Hardcore Mode
          </label>
        </div>
        <div class="option">
          <input
            id="no-borders-in-cage-mode"
            type="checkbox"
            name="no-borders-in-cage-mode"
            :disabled="disabledCageMode"
            :checked="baseStore.noBordersInCageMode"
            @change="setNoBordersInCageMode"
          >
          <label for="no-borders-in-cage-mode" :class="{ 'disabled-label': disabledCageMode }">
            No Borders In Cage Mode
          </label>
        </div>
        <div class="option">
          <input
            id="dark-mode"
            type="checkbox"
            name="dark-mode"
            :checked="baseStore.darkMode"
            @change="setDarkMode"
          >
          <label for="dark-mode">
            Dark Mode
          </label>
        </div>
        <div class="option">
          <input
            id="disable-win-message"
            type="checkbox"
            name="disable-win-message"
            :checked="baseStore.disableWinMessage"
            @change="setDisableWinMessage"
          >
          <label for="disable-win-message">
            Disable Win Message
          </label>
        </div>
        <div class="option">
          <input
            id="pro-mode"
            type="checkbox"
            name="pro-mode"
            :checked="baseStore.proMode"
            @change="setProMode"
          >
          <label for="pro-mode">
            Pro Mode (speed sliding)
          </label>
        </div>
        <div class="option">
          <input
            id="pro-palette"
            type="checkbox"
            name="pro-palette"
            :disabled="!baseStore.proMode"
            :checked="baseStore.proPalette"
            @change="setProPalette"
          >
          <label for="pro-palette" :class="{ 'disabled-label': !baseStore.proMode }">
            Pro Palette
          </label>
        </div>
        <div class="option">
          <input
            id="marathon-mode"
            type="checkbox"
            name="marathon-mode"
            :checked="baseStore.marathonMode"
            @change="setMarathonMode"
          >
          <label for="marathon-mode">
            Marathon Mode
          </label>
        </div>
      </div>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.config-modal {
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  width: 290px;
  position: fixed;
  z-index: 2000;
  top: calc(50% - 235px);
  left: calc(50% - 145px);
  padding: 20px;
  box-shadow: 0 8px 16px var(--shadow-color);
}
.info-header {
  text-align: center;
  margin-bottom: 5px;
  margin-top: 5px;
}
.info-header span {
  font-weight: 600;
  font-size: 21px;
}
.options {
  margin: 0 auto;
  margin-top: 5px;
}
.option {
  display: flex;
  justify-content: left;
  align-items: normal;
  gap: 10px;
  margin-bottom: 15px;
}
input[type=checkbox] {
  margin-top: 1px;
}
label {
  display: flex;
  align-items: center;
  line-height: 1;
  font-size: 16px;
}
.disabled-label {
  opacity: 0.3;
}
.option:hover > label:not(.disabled-label) {
  opacity: 0.8;
  cursor: pointer;
}
.option:hover > input[type=checkbox]:hover:not(:disabled){
  cursor: pointer;
}
.buttons {
  margin-top: 10px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
}
.slide-container > label {
  justify-content: center;
  margin-top: 10px;
  margin-bottom: 5px;
}
.slider {
  width: 100%;
  cursor: pointer;
  height: 15px;
}
.slider-marks {
  display: flex;
  justify-content: space-between;
  margin-top: -5px;
  margin-bottom: 10px;
}
</style>
