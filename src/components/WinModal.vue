<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useEventBus } from '@vueuse/core';

const emit = defineEmits<{ close: []; }>();
const winModal = ref(null);
onClickOutside(winModal, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();
const eventBus = useEventBus<string>('event-bus');

const closeAndRestart = (): void => {
  emit('close');
  eventBus.emit('restart');
};

onMounted(() => {
  baseStore.paused = true;
});
onBeforeUnmount(() => {
  baseStore.paused = false;
});
</script>

<template>
  <div ref="winModal" class="win-modal">
    <div class="finish-message">
      <p>Congrats! You've done it. 🏆</p>
      <p v-if="baseStore.eligibleForCageMode" class="unlock-message">
        "Cage mode" is unlocked for the next game!
      </p>
    </div>
    <div class="buttons">
      <button v-if="!baseStore.cageMode" class="tool-button" @click="closeAndRestart">
        New Game
      </button>
      <button v-if="baseStore.cageMode" class="tool-button" @click="emit('close')">
        OK
      </button>
    </div>
  </div>
</template>

<style scoped>
.win-modal {
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  height: auto;
  width: 300px;
  position: fixed;
  z-index: 2000;
  top: 25%;
  left: calc(50% - 150px);
  padding: 20px;
  box-shadow: 0 8px 16px gray;
}
.finish-message {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.finish-message p {
  font-size: 21px;
  line-height: 32px;
  text-align: center;
  color: goldenrod;
  font-weight: 600;
}
.unlock-message {
  font-size: 16px !important;
  line-height: 25px !important;
  color: navy !important;
  font-style: italic;
}
.buttons {
  margin-top: 20px;
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
}
.buttons .tool-button {
  width: 100px;
}
</style>
