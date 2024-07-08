<script setup lang="ts">
import { defineAsyncComponent, type AsyncComponentLoader } from 'vue';
import { useDateFormat } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { displayedTime, convertScramble, calculateMD } from '@/utils';
import { baseUrl } from '@/const';
const CopyButton = defineAsyncComponent({
  loader: async () => await import('../components/CopyButton.vue') as unknown as AsyncComponentLoader,
  delay: 150
});

const baseStore = useBaseStore();

const formatDate = (date?: string): string => {
  if (date == null) {
    return '';
  }
  return useDateFormat(date, 'YYYY-MM-DD HH:mm:ss').value;
};
</script>

<template>
  <div class="top-info-panel">
    <div v-if="baseStore.replayMode || baseStore.sharedPlaygroundMode" class="replay-row-info">
      <p>
        Solved by <span>{{ baseStore.sharedPlaygroundMode ? baseStore.otherUserName : baseStore.repGame.name }}</span>
      </p>
      <p>
        Date:
        <span>{{ formatDate(baseStore.sharedPlaygroundMode ?
          baseStore.playgroundCreatedAt : baseStore.repGame.created_at) }}</span>
      </p>
      <p v-if="baseStore.replayMode">
        <span>{{ displayedTime(baseStore.repGame.time) }}s | {{ baseStore.repGame.moves }} |
          {{ baseStore.repGame.tps }}</span>
      </p>
    </div>
    <div v-if="baseStore.playgroundMode" class="playground-row-info">
      <p>
        Scramble:<span>md:{{ calculateMD(baseStore.mixedOrders) }};
          {{ convertScramble(String(baseStore.mixedOrders)) }}</span>
        <CopyButton :item-to-copy="String(baseStore.mixedOrders)" :is-solve-path="false" />
      </p>
    </div>
    <div class="info-wrapper">
      <div class="factor-wrapper">
        <span>Time:</span>
        <a
          v-if="baseStore.lastGameID !== '0' && !baseStore.cageMode"
          :href="`${baseUrl}?game_id=${baseStore.lastGameID}`"
          class="ml-5 link-item"
        >
          {{ baseStore.timeStr }}s
        </a>
        <span v-else class="ml-5">{{ baseStore.timeStr }}s</span>
      </div>
      <div class="factor-wrapper">
        <span>Moves:</span>
        <span class="ml-5">{{ baseStore.movesCount }}<span
          v-show="baseStore.opt_m !== 0 && (baseStore.movesCount !== 0 || baseStore.playgroundMode)"
          class="opt-moves"
        >+{{ baseStore.movesCount - baseStore.opt_m }}</span></span>
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
  contain: layout style;
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
.playground-row-info  {
  font-size: 14px;
  line-height: 1.6;
  margin-top: -5px;
  margin-bottom: -5px;
  max-width: 390px;
  min-height: 24px;
  position: relative;
}
.playground-row-info p {
  display: flex;
  color: var(--link-color);
  font-weight: 600;
  align-items: baseline;
}
.playground-row-info span {
  color: var(--link-color);
  margin-left: 5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}
.playground-row-info :deep(.copy-button) {
  height: 20px;
}
.factor-wrapper {
  position: relative;
}
.opt-moves {
  color: var(--link-color);
  font-size: 12px;
  vertical-align: super;
}
@media screen and (max-width: 450px) {
  .playground-row-info  {
    max-width: 320px;
  }
  .playground-row-info span {
    max-width: 200px;
  }
}
@media screen and (max-width: 360px) {
  .playground-row-info  {
    line-height: 23px;
    max-width: 280px;
  }
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
