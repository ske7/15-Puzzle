<script setup lang="ts">
import { computed, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';

const emit = defineEmits<{ close: [] }>();

const infoModal = ref<HTMLElement>();
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
</script>

<template>
  <Teleport to="body">
    <div ref="infoModal" class="info-modal">
      <p class="info-header">
        <span>Game instructions</span>
      </p>
      <p class="instruction">
        <span>Move blocks until they are in regular order. You can play and beat your records of time and moves. Unlock "Cage mode" by solving the puzzle in less than 60 seconds. There are lots of funny Cage images - complete puzzles in "Cage mode" and try to reach them all. Look under "Config" and try advanced modes: Pro and Marathon. For more information about the game, see <a target="_blank" href="https://github.com/ske7/15-Puzzle">here</a>.</span>
      </p>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
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
  top: 130px;
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
  font-size: 21px;
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
  margin-top: 15px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
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
  font-size: 14px;
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
@media (min-height: 800px), screen and (max-width: 820px) and (min-width: 500px) {
  .info-modal {
    top: calc(50% - 210px);
  }
}
@media screen and (max-width: 420px) {
  .info-modal {
    width: calc(100% - 30px);
    margin: 0 auto;
    left: 15px;
    top: calc(50% - 210px);
    min-height: 320px;
  }
  .instruction  {
    font-size: 15px;
  }
}
</style>
