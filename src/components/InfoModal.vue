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
        <span>About the game</span>
      </p>
      <p class="instruction">
        <span>Move blocks until they are in regular order. You can play and beat online records of time and moves. Can you be among the best world players? Try "Cage Mode" and unlock all funny images by solving the puzzles. Look under "Config" and try advanced modes: Pro (speed sliding) and Marathon. See more information about the game <a target="_blank" rel="noopener" href="https://github.com/ske7/15-Puzzle">here</a>.</span>
      </p>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
      <p class="copyright">
        <span>© {{ getYear }} SKE</span>
        <br>
        <span><a target="_blank" rel="noopener" href="https://github.com/ske7/15-Puzzle">This game is open source</a></span>
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.info-modal {
  --modal-width: 340px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  width: var(--modal-width);
  position: fixed;
  z-index: 2000;
  top: 135px;
  left: calc(50% - var(--modal-width) / 2);
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
  margin-top: 20px;
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
  font-size: 14px;
}
a {
  color: var(--link-color);
  text-decoration: underline;
  cursor: pointer;
}
a:hover {
  text-decoration: underline;
  color: var(--text-color);
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
    top: calc(50% - 220px);
    min-height: 320px;
  }
}
</style>
