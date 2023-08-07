<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useEventBus } from '@vueuse/core';

const baseStore = useBaseStore();
const emit = defineEmits<{ close: []; }>();
const eventBus = useEventBus<string>('event-bus');

const configModal = ref<HTMLElement>();
onClickOutside(configModal, (event) => {
  event.stopPropagation();
  emit('close');
});
const disabledCageMode = computed(() => {
  return baseStore.disableCageMode || baseStore.marathonMode || baseStore.proMode;
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
  baseStore.waitForUpdate = true;
  baseStore.marathonMode = !baseStore.marathonMode;
  localStorage.setItem('marathonMode', baseStore.marathonMode.toString());
  baseStore.eligibleForCageMode = false;
  eventBus.emit('restart', 'fromConfig');
};
</script>

<template>
  <Teleport to="body">
    <div ref="configModal" class="config-modal">
      <p class="info-header">
        <span>Game config</span>
      </p>
      <div class="options">
        <div class="option">
          <input
            id="disable-cage-mode"
            type="checkbox"
            name="disable-cage-mode"
            :disabled="baseStore.marathonMode || baseStore.proMode"
            :checked="baseStore.disableCageMode"
            @change="setDisableCageMode"
          >
          <label for="disable-cage-mode" :class="{ 'disabled-label': baseStore.marathonMode || baseStore.proMode }">
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
  background-color: white;
  border-radius: 8px;
  height: auto;
  width: 280px;
  position: fixed;
  z-index: 2000;
  top: calc(50% - 220px);
  left: calc(50% - 140px);
  padding: 20px;
  box-shadow: 0 8px 16px gray;
}
.info-header {
  text-align: center;
  margin-bottom: 5px;
  margin-top: 5px;
}
.info-header span {
  font-weight: 500;
  font-size: 21px;
  color: navy;
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
label {
  display: flex;
  align-items: center;
  line-height: 1;
  font-size: 16px;
}
.disabled-label {
  opacity: 0.3;
}
input[type=checkbox] {
  margin-top: 1px;
}
.buttons {
  margin-top: 10px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
}
</style>
