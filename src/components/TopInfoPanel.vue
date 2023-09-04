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
    <div>
      <span>Moves:</span>
      <span class="ml-5">{{ baseStore.movesCount }}</span>
    </div>
    <div>
      <span>TPS:</span>
      <span class="ml-5">{{ baseStore.tps }}</span>
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
  font-family: 'consolas', sans-serif;
}
@media screen and (max-width: 360px) {
  .top-info-panel {
    font-size: 15px;
  }
}
@media screen and (max-width: 340px) {
  .top-info-panel {
    font-size: 14px;
  }
}
.ml-5 {
  margin-left: 5px;
}
</style>
