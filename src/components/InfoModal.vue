<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside } from '@vueuse/core';

const baseStore = useBaseStore();
const emit = defineEmits<{ close: [] }>();

const infoModal = ref(null);
onClickOutside(infoModal, (event) => {
  event.stopPropagation();
  emit('close');
});

const getYear = computed(() => {
  const currentYear = new Date().getFullYear();
  if (currentYear === 2023) {
    return currentYear.toString();
  }
  return `2023 - ${currentYear}`;
});

const setCageHardcoreMode = (): void => {
  baseStore.cageHardcoreMode = !baseStore.cageHardcoreMode;
  localStorage.setItem('cageHardcoreMode', baseStore.cageHardcoreMode.toString());
};
</script>

<template>
  <Teleport to="body">
    <div ref="infoModal" class="info-modal">
      <p class="info-header">
        <span>Game instructions</span>
      </p>
      <p class="instruction">
        Move blocks until they are in regular order.
        You can play and beat your records of time and moves. Unlock "Cage mode" by solving the puzzle in less than 60 seconds. There are lots of funny "Cages". Try to reach them all if you can. Cage Hardcore Mode is for puzzle gurus... you won't see numbers on "Cages".
      </p>
      <p class="info-header mt-10">
        <span>Options</span>
      </p>
      <div class="hardcore-mode">
        <input
          id="hardcore"
          type="checkbox"
          name="hardcore"
          :checked="baseStore.cageHardcoreMode"
          @change="setCageHardcoreMode"
        >
        <label for="hardcore">Cage Hardcore Mode</label>
      </div>
      <div class="buttons">
        <button class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
      <p class="copyright">
        <span>© {{ getYear }} SKE</span>
        <br>
        <span><a target="_blank" href="https://github.com/ske7/15-Puzzle">This game is open source</a></span>
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.info-modal {
  --modal-width: 360px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  height: auto;
  width: var(--modal-width);
  position: fixed;
  z-index: 2000;
  top: 117px;
  left: calc(50% - var(--modal-width) / 2);
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
  font-size: 18px;
  color: navy;
}
.instruction {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  max-width: 100%;
  font-size: 16px;
  margin: auto;
  text-align: left;
  line-height: 1.4;
}
.buttons {
  margin-top: 10px;
  display: flex;
  justify-content: space-evenly;
}
.copyright {
  margin-top: 10px;
  margin-bottom: 5px;
  text-align: center;
  line-height: 1.1;
}
.copyright span {
  font-style: italic;
  color: navy;
  font-size: 12px;
}
.copyright a {
  color: #105d97;
  text-decoration: underline;
  cursor: pointer;
}
.copyright a:hover {
  text-decoration: underline;
  color: navy;
}
.hardcore-mode {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}
label {
  display: flex;
  align-items: center;
  line-height: 1;
}
input[type=checkbox] {
  margin-bottom: -2px;
  height: 15px;
  width: 15px;
}
@media screen and (max-width: 420px) {
  .info-modal {
    width: calc(100% - 40px);
    margin: 0 auto;
    left: 20px;
    top: 70px;
    min-height: 320px;
  }
  .instruction  {
    font-size: 15px;
  }
  label {
    font-size: 15px;
  }
  .info-header span {
    font-size: 17px;
  }
}
</style>
