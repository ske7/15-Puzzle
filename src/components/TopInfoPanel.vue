<script setup lang="ts">
import { useBaseStore } from '../stores/base';

const baseStore = useBaseStore();
</script>

<template>
  <div class="top-info-panel">
    <div class="tool-items consolas">
      <span>{{ baseStore.marathonMode ? 'Marathon time' : 'Time' }}:</span>
      <span class="ml-5">{{ baseStore.timeStr }}s</span>
    </div>
    <div class="tool-items consolas">
      <span>Moves:</span>
      <span class="ml-5">{{ baseStore.movesCount }}</span>
    </div>
  </div>
</template>
