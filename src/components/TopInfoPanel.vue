<script setup lang="ts">
import { useBaseStore } from '../stores/base';
import { displayedTime } from '@/utils';
import { baseUrl } from '@/const';

const baseStore = useBaseStore();
</script>

<template>
  <div class="top-info-panel">
    <div v-if="baseStore.replayMode" class="replay-row-info">
      <p>Solved by <span>{{ baseStore.repGame.name }}</span></p>
      <p>
        <span>{{ displayedTime(baseStore.repGame.time) }}s | {{ baseStore.repGame.moves }} | {{ baseStore.repGame.tps }}</span>
      </p>
    </div>
    <div class="info-wrapper">
      <div class="factor-wrapper">
        <span>Time:</span>
        <a v-if="baseStore.lastGameID && !baseStore.cageMode" :href="`${baseUrl}?game_id=${baseStore.lastGameID}`" class="ml-5 link-item">
          {{ baseStore.timeStr }}s
        </a>
        <span v-else class="ml-5">{{ baseStore.timeStr }}s</span>
      </div>
      <div class="factor-wrapper">
        <span>Moves:</span>
        <span class="ml-5">{{ baseStore.movesCount }}</span>
      </div>
      <div class="factor-wrapper">
        <span>TPS:</span>
        <span class="ml-5">{{ baseStore.tps }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-info-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  font-family: 'consolas', sans-serif;
}
.info-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  position: relative;
  width: 100%;
  min-height: 29px;
}
.replay-row-info  {
  text-align: center;
  font-size: 14px;
  max-width: 320px;
  line-height: 1.2;
  margin-top: -5px;
}
.replay-row-info span {
  font-size: 14px;
  color: var(--link-color);
  font-weight: 600;
}
.factor-wrapper {
  position: relative;
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
