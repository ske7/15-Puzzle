<script setup lang="ts">
import { useBaseStore } from '../stores/base';
import { displayedTime } from '@/utils';

const baseStore = useBaseStore();
</script>

<template>
  <div class="top-info-panel">
    <div class="factor-wrapper">
      <span>Time:</span>
      <span class="ml-5">{{ baseStore.timeStr }}s</span>
      <span v-if="baseStore.replayMode" class="replay-value">
        {{ displayedTime(baseStore.repGame.time) }}s
      </span>
    </div>
    <div class="factor-wrapper">
      <span>Moves:</span>
      <span class="ml-5">{{ baseStore.movesCount }}</span>
      <span v-if="baseStore.replayMode" class="replay-value">
        {{ baseStore.repGame.moves }}
      </span>
    </div>
    <div class="factor-wrapper">
      <span>TPS:</span>
      <span class="ml-5">{{ baseStore.tps }}</span>
      <span v-if="baseStore.replayMode" class="replay-value">
        {{ baseStore.repGame.tps }}
      </span>
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
.factor-wrapper {
  position: relative;
}
.replay-value {
  position: absolute;
  top: -15px;
  left: 0px;
  font-size: 14px;
  color: var(--link-color);

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
