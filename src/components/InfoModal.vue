<script setup lang="ts">
import { computed } from 'vue';

const emit = defineEmits<{ close: []; }>();
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
    <div class="info-modal">
      <p class="info-header">
        <span>Game instructions</span>
      </p>
      <p class="instruction">
        Move blocks until they are in regular order.
        You can play and beat your records of time and moves. Unlock "Cage mode" completing the puzzle in less than a minute. There are lots of funny "Cages". Try to reach them all if you can.
      </p>
      <div class="buttons">
        <button class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
      <p class="copyright">
        <span>© {{ getYear }} SKE</span>
        <br>
        <span>This game is open <a target="_blank" href="https://github.com/ske7/15-Puzzle">source</a></span>
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.info-modal {
  --modal-width: 300px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  height: auto;
  width: var(--modal-width);
  position: fixed;
  z-index: 2000;
  top: 20%;
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
  box-shadow: 0 8px 16px gray;
}
.info-header {
  text-align: center;
  margin-bottom: 10px;
}
.info-header span{
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
  margin-bottom: 0px;
  text-align: center;
  line-height: 1.1;
}
.copyright span {
  font-style: italic;
  color: navy;
  font-size: 12px;
}
.copyright a {
  text-decoration: underline;
}
</style>
