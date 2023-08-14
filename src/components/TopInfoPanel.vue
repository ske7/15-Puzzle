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
      <span class="bold">Solved!</span>
    </div>
    <div>
      <span>Moves:</span>
      <span class="ml-5">{{ baseStore.movesCount }}</span>
    </div>
  </div>
</template>
