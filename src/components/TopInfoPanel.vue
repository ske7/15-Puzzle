<script setup lang="ts">
import { useBaseStore } from '../stores/base';

const baseStore = useBaseStore();
</script>

<template>
  <div class="top-info-panel">
    <div>
      <span>Time:</span>
      <span class="ml-5">{{ baseStore.timeStr }}s</span>
    </div>
    <div v-if="baseStore.isDone" class="solved">
      <span>Solved!</span>
    </div>
    <div>
      <span>Moves:</span>
      <span class="ml-5">{{ baseStore.movesCount }}</span>
    </div>
  </div>
</template>

<style scoped>
.top-info-panel {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  position: relative;
  width: 100%;
  min-height: 29px;
  font-family: 'consolas';
}
.solved {
  position: absolute;
  left: calc(50% - 30.8px);
}
.solved span {
  font-weight: 600;
}
.ml-5 {
  margin-left: 5px;
}
@media screen and (max-width: 420px) {
  .solved {
    display: none;
  }
}
</style>
