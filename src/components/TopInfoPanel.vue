<script setup lang="ts">
import { useBaseStore } from '../stores/base';

const baseStore = useBaseStore();
</script>

<template>
  <div class="top-info-panel">
    <div class="tool-items">
      <span>Time:&nbsp;</span>
      <span class="time">{{ baseStore.minutes || '0' }}m&nbsp;</span>
      <span class="time">{{ baseStore.seconds || '00' }}s</span>
    </div>
    <div class="tool-items end">
      <span>Moves:&nbsp;</span>
      <span class="moves-count">{{ baseStore.movesCount }}</span>
    </div>
  </div>
</template>
