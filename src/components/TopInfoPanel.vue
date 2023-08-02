<script setup lang="ts">
import { useBaseStore } from '../stores/base';

const baseStore = useBaseStore();
</script>

<template>
  <div class="top-info-panel">
    <div class="tool-items consolas">
      <template v-if="baseStore.marathonMode">
        <span>Marathon time</span>
        <span class="ml-5">{{ baseStore.mMinutes }}:</span><span>{{ baseStore.mSeconds }}</span>
      </template>
      <template v-else>
        <span>Time:</span>
        <span class="ml-5">{{ baseStore.seconds }}s</span>
      </template>
    </div>
    <div class="tool-items consolas">
      <span>Moves:</span>
      <span class="ml-5">{{ baseStore.movesCount }}</span>
    </div>
  </div>
</template>
