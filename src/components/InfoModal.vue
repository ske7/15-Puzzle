<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';
import ScrambleCube from './ScrambleCube.vue';

const emit = defineEmits<{ close: [] }>();

const infoModal = ref<HTMLElement>();
const cubeFlying = ref(false);
useCloseOnClickOutside(infoModal, () => emit('close'));

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
    <div ref="infoModal" class="info-modal modal-shell modal-centered" :class="{ 'cube-flying': cubeFlying }">
      <ScrambleCube @flying="cubeFlying = $event" />
      <p class="info-header">
        <span>About the game</span>
      </p>
      <p class="instruction">
        <span>Move the blocks until they are in order. Beat your records of time and moves, and compete online with the
          best players in the world. Look under "Config" for more modes: Marathon, Casual (animated tiles), and Cage,
          where each solved puzzle unlocks a funny picture. See more information about the game
          <a target="_blank" rel="noopener noreferrer" href="https://github.com/ske7/15-Puzzle">here</a>.</span>
      </p>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
      <p class="copyright">
        <span>© {{ getYear }} SKE</span>
        <br>
        <span>
          <a target="_blank" rel="noopener noreferrer" href="https://github.com/ske7/15-Puzzle">This game is open source</a>
        </span>
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.info-modal {
  --modal-width: 340px;
  justify-content: center;
  width: var(--modal-width);
  z-index: var(--z-modal);
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
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
  cursor: pointer;
}
a:hover {
  color: var(--text-color);
}
@media (pointer: coarse) {
  a {
    position: relative;
    padding: 6px 4px;
    margin: 0 -4px;
  }
}
.cube-flying {
  user-select: none;
}
.cube-flying a,
.cube-flying button {
  pointer-events: none;
}
@media screen and (max-width: 420px) {
  .info-modal {
    width: calc(100% - 30px);
    left: 15px;
    min-height: 320px;
  }
}
</style>
