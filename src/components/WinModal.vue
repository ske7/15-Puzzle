<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useEventBus } from '@vueuse/core';

const emit = defineEmits<{ close: [] }>();
const winModal = ref<HTMLElement>();
onClickOutside(winModal, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();
const eventBus = useEventBus<string>('event-bus');

const closeAndRestart = (): void => {
  emit('close');
  if (!baseStore.cageMode) {
    eventBus.emit('restart');
  }
};
onUnmounted(() => {
  baseStore.showWinModal = false;
});
</script>

<template>
  <div ref="winModal" class="win-modal">
    <div class="finish-message">
      <p>Congrats! You've done it. 🏆</p>
      <p v-if="baseStore.newTimeRecord || baseStore.newMovesRecord" class="unlock-message mb-5 mt-5">
        Your new record:
        <span v-show="baseStore.newTimeRecord">{{ baseStore.timeMRecord }}s</span>
        <span v-show="baseStore.newMovesRecord && baseStore.newTimeRecord"> / </span>
        <span v-show="baseStore.newMovesRecord">{{ baseStore.movesRecord }} moves</span>
      </p>
      <p v-if="baseStore.cageMode && baseStore.isDone" class="unlock-message mt-5">
        You've completed Cage game (#{{ baseStore.cageImgIndex + 1 }})
      </p>
    </div>
    <div class="buttons">
      <button
        type="button"
        class="tool-button"
        @click="closeAndRestart"
      >
        {{ baseStore.cageMode ? 'OK' : 'New Game' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.win-modal {
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  width: 320px;
  position: fixed;
  z-index: 2000;
  top: calc(50% - 160px);
  left: calc(50% - 160px);
  padding: 20px;
  box-shadow: 0 8px 16px var(--shadow-color);
}
@media screen and (max-width: 360px) {
  .win-modal {
    width: 300px;
    left: calc(50% - 150px);
  }
}
.finish-message {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 42px;
}
.finish-message p {
  font-size: 21px;
  line-height: 32px;
  text-align: center;
  color: var(--win-color);
  font-weight: 600;
}
.finish-message .unlock-message {
  font-size: 16px;
  line-height: 25px;
  color: var(--text-color);
  font-style: italic;
}
.unlock-message  span {
  font-weight: 600;
}
.buttons {
  margin-top: 20px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
}
.buttons .tool-button {
  width: 100px;
}
.mb-5 {
  margin-bottom: 5px;
}
.mt-5 {
  margin-top: 5px;
}
</style>
