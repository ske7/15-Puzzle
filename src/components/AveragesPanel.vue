<script setup lang="ts">
import { ref, computed, defineAsyncComponent, type AsyncComponentLoader } from 'vue';
import { useBaseStore } from '../stores/base';
const LeaderBoard = defineAsyncComponent({
  loader: async () => await import('../components/LeaderBoard.vue') as unknown as AsyncComponentLoader,
  delay: 150
});

const baseStore = useBaseStore();

const positionTop = computed(() => {
  return `${baseStore.boardPos.top + 100}px`;
});
const positionLeft = computed(() => {
  return `${baseStore.boardPos.left - 300}px`;
});
const checkUpTime = (arrayID: number): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  if (Number(baseStore.currentAverages[arrayID].time ?? 0) >
      Number(baseStore.prevAverages[arrayID].time ?? 0)) {
    return true;
  }
  return false;
};
const checkDownTime = (arrayID: number): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  if (Number(baseStore.currentAverages[arrayID].time ?? 0) <
      Number(baseStore.prevAverages[arrayID].time ?? 0)) {
    return true;
  }
  return false;
};
const checkUpMoves = (arrayID: number): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  if (Number(baseStore.currentAverages[arrayID].moves ?? 0) >
    Number(baseStore.prevAverages[arrayID].moves ?? 0)) {
    return true;
  }
  return false;
};
const checkDownMoves = (arrayID: number): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  if (Number(baseStore.currentAverages[arrayID].moves ?? 0) <
    Number(baseStore.prevAverages[arrayID].moves ?? 0)) {
    return true;
  }
  return false;
};
const checkUpTPS = (arrayID: number): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  if (Number(baseStore.currentAverages[arrayID].tps ?? 0) >
    Number(baseStore.prevAverages[arrayID].tps ?? 0)) {
    return true;
  }
  return false;
};
const checkDownTPS = (arrayID: number): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  if (Number(baseStore.currentAverages[arrayID].tps ?? 0) <
    Number(baseStore.prevAverages[arrayID].tps ?? 0)) {
    return true;
  }
  return false;
};
const checkIfWasRecord = (type: string, field: string): boolean => {
  const r = baseStore.wasAvgRecords.find(value => {
    return value.type === type;
  });
  if (field === 'time') {
    return r?.record_time ?? false;
  } else if (field === 'moves') {
    return r?.record_moves ?? false;
  } else if (field === 'tps') {
    return r?.record_tps ?? false;
  }
  return false;
};
const checkIfProRecord = (type: string, field: string): boolean => {
  const r = baseStore.wasAvgRecords.find(value => {
    return value.type === type;
  });
  if (field === 'time') {
    return r?.pro_avg_time ?? false;
  } else if (field === 'moves') {
    return r?.pro_avg_moves ?? false;
  } else if (field === 'tps') {
    return r?.pro_avg_tps ?? false;
  }
  return false;
};
const disableDuringMarathon = computed(() => {
  return baseStore.marathonMode && baseStore.doneFirstMove && !baseStore.isDone;
});
const cannotClick = computed(() => {
  return baseStore.showModal || disableDuringMarathon.value;
});
const showAveragesLeaderBoard = ref(false);
const wasPausedBeforeOpenModal = ref(false);
const doShowLeaderBoard = (): void => {
  if (cannotClick.value) {
    return;
  }
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  showAveragesLeaderBoard.value = true;
  baseStore.showLeaderBoard = true;
};
const closeLeaderBoard = (): void => {
  showAveragesLeaderBoard.value = false;
  baseStore.showLeaderBoard = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
</script>

<template>
  <div
    v-if="baseStore.currentAverages.length > 0 && !baseStore.hideCurrentAverages && baseStore.proMode"
    class="avg-wrapper"
  >
    <div class="avg-row top-row">
      <span><span class="best-averages-mobile link-item" :class="{ paused: cannotClick }" @click="doShowLeaderBoard">Best</span></span>
      <span>Time</span>
      <span>Moves</span>
      <span>TPS</span>
    </div>
    <div class="avg-rows">
      <div class="avg-row">
        <span class="avg-type">ao5</span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao5', 'time'), 'purple': checkIfProRecord('ao5', 'time') }">
            {{ baseStore.currentAverages[0].time || 'tbd' }}
          </span>
          <span v-if="checkUpTime(0)" class="red">↑</span>
          <span v-if="checkDownTime(0)" class="green">↓</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao5', 'moves'), 'purple': checkIfProRecord('ao5', 'moves') }">
            {{ baseStore.currentAverages[0].moves || 'tbd' }}
          </span>
          <span v-if="checkUpMoves(0)" class="red">↑</span>
          <span v-if="checkDownMoves(0)" class="green">↓</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao5', 'tps'), 'purple': checkIfProRecord('ao5', 'tps') }">
            {{ baseStore.currentAverages[0].tps || 'tbd' }}
          </span>
          <span v-if="checkUpTPS(0)" class="green">↑</span>
          <span v-if="checkDownTPS(0)" class="red">↓</span>
        </span>
      </div>
      <div class="avg-row">
        <span class="avg-type">ao12</span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao12', 'time'), 'purple': checkIfProRecord('ao12', 'time') }">
            {{ baseStore.currentAverages[1].time || 'tbd' }}
          </span>
          <span v-if="checkDownTime(1)" class="green">↓</span>
          <span v-if="checkUpTime(1)" class="red">↑</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao12', 'moves'), 'purple': checkIfProRecord('ao12', 'moves') }">
            {{ baseStore.currentAverages[1].moves || 'tbd' }}
          </span>
          <span v-if="checkUpMoves(1)" class="red">↑</span>
          <span v-if="checkDownMoves(1)" class="green">↓</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao12', 'tps'), 'purple': checkIfProRecord('ao12', 'tps') }">
            {{ baseStore.currentAverages[1].tps || 'tbd' }}
          </span>
          <span v-if="checkUpTPS(1)" class="green">↑</span>
          <span v-if="checkDownTPS(1)" class="red">↓</span>
        </span>
      </div>
      <div class="avg-row">
        <span class="avg-type">ao50</span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao50', 'time'), 'purple': checkIfProRecord('ao50', 'time') }">
            {{ baseStore.currentAverages[2].time || 'tbd' }}
          </span>
          <span v-if="checkDownTime(2)" class="green">↓</span>
          <span v-if="checkUpTime(2)" class="red">↑</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao50', 'moves'), 'purple': checkIfProRecord('ao50', 'moves') }">
            {{ baseStore.currentAverages[2].moves || 'tbd' }}
          </span>
          <span v-if="checkUpMoves(2)" class="red">↑</span>
          <span v-if="checkDownMoves(2)" class="green">↓</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao50', 'tps'), 'purple': checkIfProRecord('ao50', 'tps') }">
            {{ baseStore.currentAverages[2].tps || 'tbd' }}
          </span>
          <span v-if="checkUpTPS(2)" class="green">↑</span>
          <span v-if="checkDownTPS(2)" class="red">↓</span>
        </span>
      </div>
      <div class="avg-row">
        <span class="avg-type">ao100</span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao100', 'time'), 'purple': checkIfProRecord('ao100', 'time') }">
            {{ baseStore.currentAverages[3].time || 'tbd' }}
          </span>
          <span v-if="checkDownTime(3)" class="green">↓</span>
          <span v-if="checkUpTime(3)" class="red">↑</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao100', 'moves'), 'purple': checkIfProRecord('ao100', 'moves') }">
            {{ baseStore.currentAverages[3].moves || 'tbd' }}
          </span>
          <span v-if="checkUpMoves(3)" class="red">↑</span>
          <span v-if="checkDownMoves(3)" class="green">↓</span>
        </span>
        <span>
          <span :class="{ 'red': checkIfWasRecord('ao100', 'tps'), 'purple': checkIfProRecord('ao100', 'tps') }">
            {{ baseStore.currentAverages[3].tps || 'tbd' }}
          </span>
          <span v-if="checkUpTPS(3)" class="green">↑</span>
          <span v-if="checkDownTPS(3)" class="red">↓</span>
        </span>
      </div>
    </div>
    <p class="consecutive-solves">
      Consecutive solves: {{ baseStore.consecutiveSolves }}
    </p>
    <p class="best-averages">
      <span class="link-item" :class="{ paused: cannotClick }" @click="doShowLeaderBoard">Best Averages</span>
    </p>
    <LeaderBoard
      v-if="baseStore.showLeaderBoard && showAveragesLeaderBoard"
      :form-type="'averages'"
      @close="closeLeaderBoard"
    />
  </div>
</template>

<style scoped>
.avg-wrapper {
  display: flex;
  position: absolute;
  top: v-bind(positionTop);
  left: v-bind(positionLeft);
  flex-direction: column;
  font-size: 16px;
  font-family: 'consolas', sans-serif;
}
.avg-row {
  display: flex;
}
.avg-row span {
  width: 75px;
}
.avg-row .avg-type {
  text-align: right;
  width: 75px;
  padding-right: 20px;
  font-weight: 600;
}
.green {
  color: green;
}
.red {
  color: red;
}
.purple {
  color: var(--violet);
}
.purple::after {
  content: 'p';
  color: var(--violet);
  font-size: 12px;
  font-weight: 700;
}
.best-averages {
  display: flex;
  justify-content: center;
}
.best-averages-mobile {
  display: none;
}
.link-item {
  color: var(--link-color);
  text-decoration: underline;
}
.link-item:hover:not(.paused) {
  text-decoration: underline;
  color: var(--text-color);
  cursor: pointer;
}
.link-item.paused {
  opacity: 0.5;
}
.consecutive-solves {
  text-align: center;
}
@media screen and (max-width: 1050px) {
  .avg-wrapper {
    width: 100%;
    align-items: center;
    position: relative !important;
    top: auto !important;
    left: auto !important;
    padding: 5px 0;
    font-size: 15px;
    line-height: 1.5;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
  .avg-rows {
    max-height: 44px;
    overflow-y: auto;
  }
  .avg-row span {
    width: 70px;
  }
  .avg-row .avg-type {
    text-align: right;
    width: 70px;
    padding-right: 20px;
    font-weight: 600;
  }
  .best-averages {
    display: none;
  }
  .best-averages-mobile {
    display: block;
    text-align: center;
  }
  .best-averages-mobile .link-item {
    font-size: 14px;
  }
}
@media screen and (max-height: 650px) and (max-width: 1050px) {
  .avg-wrapper {
    font-size: 14px;
    line-height: 1.3;
    margin-top: -5px;
  }
  .avg-rows {
    max-height: 35px;
    overflow-y: auto;
  }
  .avg-row span, .avg-row .avg-type {
    width: 70px;
  }
}
</style>