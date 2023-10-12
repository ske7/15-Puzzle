<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useEventBus } from '@vueuse/core';
import { CORE_NUM } from '@/const';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';

const baseStore = useBaseStore();
const emit = defineEmits<{ close: [] }>();
const eventBus = useEventBus<string>('event-bus');

const configModal = ref<HTMLElement>();
onClickOutside(configModal, (event) => {
  event.stopPropagation();
  emit('close');
});
const puzzleSize = ref<number>(baseStore.numLines);
const disabledCageMode = computed(() => {
  return !baseStore.enableCageMode || baseStore.marathonMode ||
  baseStore.proMode || baseStore.numLines !== CORE_NUM;
});
const setEnableCageMode = (): void => {
  baseStore.enableCageMode = !baseStore.enableCageMode;
  localStorage.setItem('enableCageMode', baseStore.enableCageMode.toString());
  baseStore.marathonMode = false;
  localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
  baseStore.proMode = false;
  localStorage.setItem('proMode', baseStore.proMode.toString());
  puzzleSize.value = CORE_NUM;
  if (baseStore.enableCageMode) {
    baseStore.loadUnlockedCagesFromLocalStorage();
    baseStore.cageMode = true;
    baseStore.doPrepareCageMode();
    eventBus.emit('restart', 'fromConfig');
  } else {
    baseStore.cageMode = false;
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
const setHideAverages = (): void => {
  baseStore.hideCurrentAverages = !baseStore.hideCurrentAverages;
  localStorage.setItem('hideCurrentAverages', baseStore.hideCurrentAverages.toString());
};
const setHoverOnControl = (): void => {
  baseStore.hoverOnControl = !baseStore.hoverOnControl;
  localStorage.setItem('hoverOnControl', baseStore.hoverOnControl.toString());
};
const setProMode = (): void => {
  baseStore.proMode = !baseStore.proMode;
  localStorage.setItem('proMode', baseStore.proMode.toString());
  baseStore.hoverOnControl = true;
  localStorage.setItem('hoverOnControl', 'true');
  baseStore.enableCageMode = false;
  localStorage.setItem('enableCageMode', baseStore.enableCageMode.toString());
  baseStore.cageMode = false;
  baseStore.setSpaceBetween();
  baseStore.resetConsecutiveSolves();
  baseStore.loadAverages();
  eventBus.emit('restart', 'fromConfig');
};
const setMarathonMode = (): void => {
  baseStore.marathonMode = !baseStore.marathonMode;
  localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
  baseStore.enableCageMode = false;
  localStorage.setItem('enableCageMode', baseStore.enableCageMode.toString());
  baseStore.cageMode = false;
  baseStore.resetConsecutiveSolves();
  eventBus.emit('restart', 'fromConfig');
};
watch(puzzleSize, (newValue) => {
  if (newValue !== 0) {
    if (newValue !== CORE_NUM) {
      baseStore.enableCageMode = false;
      localStorage.setItem('enableCageMode', baseStore.enableCageMode.toString());
      baseStore.cageMode = false;
    }
    baseStore.numLines = newValue;
    baseStore.initAfterNewPuzzleSize();
  }
});
const { marathonMode } = storeToRefs(baseStore);
watch(marathonMode, () => {
  baseStore.updateCurrentAverages();
});
</script>

<template>
  <Teleport to="body">
    <div ref="configModal" class="config-modal">
      <p class="info-header">
        <span>Game config</span>
      </p>
      <div class="options">
        <PuzzleSizeSlider v-model="puzzleSize" />
        <div class="option">
          <input
            id="enable-cage-mode"
            type="checkbox"
            name="enable-cage-mode"
            :checked="baseStore.enableCageMode"
            @change="setEnableCageMode"
          >
          <label for="enable-cage-mode">
            Cage Mode
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
            No Numbers In Cage Mode
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
            id="hide-averages"
            type="checkbox"
            name="hide-averages"
            :disabled="!baseStore.proMode || !baseStore.registered || baseStore.isNetworkError"
            :checked="baseStore.hideCurrentAverages"
            @change="setHideAverages"
          >
          <label for="hide-averages" :class="{ 'disabled-label': !baseStore.proMode || !baseStore.registered || baseStore.isNetworkError }">
            Hide Averages
          </label>
        </div>
        <div class="option">
          <input
            id="hover-on"
            type="checkbox"
            name="hover-on"
            :disabled="baseStore.proMode"
            :checked="baseStore.hoverOnControl"
            @change="setHoverOnControl"
          >
          <label for="hover-on" :class="{ 'disabled-label': baseStore.proMode }">
            Hover On Control
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
        <a href="/?playground" class="link-item playground-mode">Playground Mode</a>
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
  margin-bottom: 0px;
  margin-top: 5px;
}
.info-header span {
  font-weight: 600;
  font-size: 21px;
}
.options {
  margin: 0 auto;
  margin-top: 0px;
}
.option {
  display: flex;
  justify-content: left;
  align-items: normal;
  gap: 10px;
  margin-bottom: 10px;
}
input[type=checkbox] {
  height: 16px;
  margin-top: 1px;
}
label {
  display: flex;
  align-items: center;
  line-height: 1;
  font-size: 16px;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
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
.playground-mode {
  margin-top: -5px;
  margin-left: 23.2px;
  display: block;
}
</style>
