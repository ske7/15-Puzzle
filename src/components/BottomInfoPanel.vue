<script setup lang="ts">
import { useBaseStore } from '../stores/base';
import { displayedTime, calculateTPS } from '../utils';
import { CORE_NUM } from '@/stores/const';
import { useEventBus } from '@vueuse/core';

const baseStore = useBaseStore();
const eventBus = useEventBus<string>('event-bus');
</script>

<template>
  <div class="bottom-info-panel">
    <div class="records-row">
      <p>
        <span>PB {{ baseStore.marathonMode ? 'marathon ' : ' ' }}time: </span>
        <span class="italic" :class="{ red: baseStore.newTimeRecord }">
          {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeMRecord }}s
        </span>
        <span> (TPS: {{ calculateTPS(baseStore.timeRecordMoves, baseStore.timeRecord) }})</span>
      </p>
      <p>
        <span>PB {{ baseStore.marathonMode ? 'marathon ' : ' ' }}moves:  </span>
        <span class="italic" :class="{ red: baseStore.newMovesRecord }">
          {{ baseStore.movesRecord || '?' }}
        </span>
        <span> ({{ displayedTime(baseStore.movesRecordTime) }}s)</span>
      </p>
    </div>
    <div class="info-row">
      <p
        v-if="!(baseStore.disableCageMode || baseStore.marathonMode || baseStore.proMode)
          && baseStore.numLines === CORE_NUM"
      >
        <span
          class="unlocked"
          :class="{ paused: baseStore.showModal }"
          @click="eventBus.emit('show-image-gallery')"
        >
          Completed</span>  <span class="italic">
          {{ baseStore.unlockedCages.size }}
        </span> out of {{ baseStore.cagesCount }} "Cages"
      </p>
      <p v-if="baseStore.marathonMode">
        Solved
        <span class="italic">
          {{ baseStore.solvedPuzzlesInMarathon }}
        </span> out of 5 puzzles
      </p>
    </div>
  </div>
</template>

<style scoped>
.bottom-info-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  font-family: 'consolas';
  line-height: 27px;
}
.unlocked {
  color: var(--link-color);
  text-decoration: underline;
}
.unlocked:hover:not(.paused) {
  text-decoration: underline;
  color: var(--text-color);
  cursor: pointer;
}
.paused {
  opacity: 0.5;
}
.red {
  color: red;
}
.italic {
  font-style: italic;
}
</style>
