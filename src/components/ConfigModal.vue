<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { useAppEventBus } from '../composables/useAppEventBus';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { setSetting, toggleSetting } from '../stores/persistedSettings';

import { CORE_NUM, fmcBlitzCores } from '@/const';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';

const baseStore = useBaseStore();
const emit = defineEmits<{ close: [] }>();
const eventBus = useAppEventBus();
const configModal = ref<HTMLElement>();
useCloseOnClickOutside(configModal, () => emit('close'));
const puzzleSize = ref(baseStore.numLines);
const disabledCageMode = computed(() => {
  return !baseStore.enableCageMode;
});
const isTouchDevice = useMediaQuery('(pointer: coarse)');
const disableCageMode = (): void => {
  setSetting('enableCageMode', false);
  baseStore.cageMode = false;
};
const resetExclusiveModes = (): void => {
  disableCageMode();
  baseStore.clearStoredSession();
  baseStore.resetConsecutiveSolves();
};
const setEnableCageMode = (): void => {
  toggleSetting('enableCageMode');
  setSetting('marathonMode', false);
  setSetting('fmcBlitz', false);
  puzzleSize.value = CORE_NUM;
  if (baseStore.enableCageMode) {
    baseStore.numLines = CORE_NUM;
    setSetting('proBeforeCage', baseStore.proMode);
    setSetting('proMode', false);
    baseStore.initAfterNewPuzzleSize();
    baseStore.loadUnlockedCagesFromLocalStorage();
    baseStore.cageMode = true;
    baseStore.doPrepareCageMode();
    eventBus.emit('restart', 'fromConfig');
  } else {
    baseStore.cageMode = false;
    if (baseStore.proBeforeCage) {
      setSetting('proMode', baseStore.proBeforeCage);
    }
    eventBus.emit('restart', 'fromConfig');
  }
};
const setCageHardcoreMode = (): void => {
  toggleSetting('cageHardcoreMode');
};
const setNoBordersInCageMode = (): void => {
  toggleSetting('noBordersInCageMode');
};
const setDarkMode = (): void => {
  toggleSetting('darkMode');
};
const setDisableWinMessage = (): void => {
  toggleSetting('disableWinMessage');
};
const setResetUnsolvedPuzzleWithEsc = (): void => {
  toggleSetting('resetUnsolvedPuzzleWithEsc');
};
const setHideAverages = (): void => {
  toggleSetting('hideCurrentAverages');
};
const setHoverOnControl = (): void => {
  toggleSetting('hoverOnControl');
};
const setProMode = (): void => {
  toggleSetting('proMode');
  if (baseStore.proMode) {
    setSetting('hoverOnControl', true);
  }
  resetExclusiveModes();
  baseStore.setSpaceBetween();
  if (baseStore.token != null) {
    baseStore.loadAverages();
  }
  eventBus.emit('restart', 'fromConfig');
};
const setMarathonMode = (): void => {
  if (baseStore.enableCageMode) {
    setProMode();
  }
  toggleSetting('marathonMode');
  setSetting('fmcBlitz', false);
  resetExclusiveModes();
  eventBus.emit('restart', 'fromConfig');
};
const setFMCBlitzMode = (): void => {
  if (baseStore.enableCageMode) {
    setProMode();
  }
  toggleSetting('fmcBlitz');
  setSetting('marathonMode', false);
  resetExclusiveModes();
  if (!fmcBlitzCores.includes(puzzleSize.value)) {
    puzzleSize.value = CORE_NUM;
  }
  baseStore.initAfterNewPuzzleSize();
};
const setKeepSession = (): void => {
  toggleSetting('keepSession');
  if (!baseStore.keepSession) {
    baseStore.clearStoredSession();
  }
};
watch(puzzleSize, (newValue) => {
  if (newValue !== CORE_NUM && baseStore.enableCageMode) {
    disableCageMode();
    if (baseStore.proBeforeCage) {
      setSetting('proMode', baseStore.proBeforeCage);
    }
  }
  if (!fmcBlitzCores.includes(newValue)) {
    setSetting('fmcBlitz', false);
  }
  baseStore.numLines = newValue;
  localStorage.setItem('numLines', baseStore.numLines.toString());
  if (!baseStore.enableCageMode) {
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
    <div ref="configModal" class="config-modal modal-shell modal-centered">
      <p class="info-header">
        <span>Game config</span>
      </p>
      <div class="options">
        <PuzzleSizeSlider v-if="!baseStore.g1000Mode" v-model="puzzleSize" />
        <div v-if="!baseStore.g1000Mode" class="option">
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
        <div v-if="!baseStore.g1000Mode" class="option">
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
        <div v-if="!baseStore.g1000Mode" class="option">
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
            :disabled="baseStore.fmcBlitz"
            :checked="baseStore.disableWinMessage"
            @change="setDisableWinMessage"
          >
          <label for="disable-win-message" :class="{ 'disabled-label': baseStore.fmcBlitz }">
            Disable Win Message
          </label>
        </div>
        <div v-if="!baseStore.g1000Mode" class="option">
          <input
            id="reset-unsolved-puzzle"
            type="checkbox"
            name="reset-unsolved-puzzle"
            :disabled="isTouchDevice"
            :checked="baseStore.resetUnsolvedPuzzleWithEsc"
            @change="setResetUnsolvedPuzzleWithEsc"
          >
          <label for="reset-unsolved-puzzle" :class="{ 'disabled-label': isTouchDevice }">
            Reset unsolved puzzle by Esc
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
            :checked="baseStore.hoverOnControl"
            @change="setHoverOnControl"
          >
          <label for="hover-on">
            Hover On Control
          </label>
        </div>
        <div v-if="!baseStore.g1000Mode" class="option">
          <input
            id="casual-mode"
            type="checkbox"
            name="casual-mode"
            :checked="!baseStore.proMode"
            @change="setProMode"
          >
          <label for="casual-mode">
            Casual Mode (animated tiles)
          </label>
        </div>
        <div v-if="!baseStore.g1000Mode" class="option">
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
        <div v-if="!baseStore.isNetworkError && baseStore.token != null && !baseStore.g1000Mode" class="option">
          <input
            id="fmc-blitz-mode-mode"
            type="checkbox"
            name="fmc-blitz-mode-mode"
            :checked="baseStore.fmcBlitz"
            @change="setFMCBlitzMode"
          >
          <label for="fmc-blitz-mode-mode">
            FMC Blitz Mode
          </label>
        </div>
        <div v-if="!baseStore.isNetworkError && baseStore.token != null && !baseStore.g1000Mode" class="option">
          <input
            id="keep-session"
            type="checkbox"
            name="keep-session"
            :checked="baseStore.keepSession"
            @change="setKeepSession"
          >
          <label for="keep-session">
            Keep Session
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
  justify-content: center;
  width: 290px;
  z-index: var(--z-modal);
  left: calc(50% - 145px);
  padding: 20px;
}
.info-header {
  text-align: center;
  margin-bottom: 0;
  margin-top: 5px;
}
.info-header span {
  font-weight: 600;
  font-size: 21px;
}
.options {
  margin: 0 auto;
}
.option {
  display: flex;
  justify-content: left;
  gap: 10px;
  margin-bottom: 10px;
}
input[type="checkbox"] {
  height: 16px;
  margin-top: 1px;
}
label {
  display: flex;
  align-items: center;
  line-height: 1;
  font-size: 16px;
  -webkit-user-select: none;
  user-select: none;
}
.disabled-label {
  opacity: 0.3;
}
@media (pointer: coarse) {
  label {
    padding: 5px 8px 5px 24px;
    margin: -5px -8px -5px -24px;
  }
}
@media (hover: hover) {
  .option:hover > label:not(.disabled-label) {
    opacity: 0.8;
    cursor: pointer;
  }
  .option:hover > input[type="checkbox"]:hover:not(:disabled) {
    cursor: pointer;
  }
}
.buttons {
  margin-top: 10px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
}
</style>
