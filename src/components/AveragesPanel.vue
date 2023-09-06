<script setup lang="ts">
import { computed } from 'vue';
import { useBaseStore } from '../stores/base';

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
</script>

<template>
  <div
    v-if="baseStore.currentAverages.length > 0 && !baseStore.hideCurrentAverages && baseStore.proMode"
    class="avg-wrapper"
  >
    <div class="avg-row top-row">
      <span />
      <span>Time</span>
      <span>Moves</span>
      <span>TPS</span>
    </div>
    <div class="avg-row">
      <span class="avg-type">ao5</span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao5', 'time') }">{{ baseStore.currentAverages[0].time || 'tbd' }}</span>
        <span v-if="checkUpTime(0)" class="red">↑</span>
        <span v-if="checkDownTime(0)" class="green">↓</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao5', 'moves') }">{{ baseStore.currentAverages[0].moves || 'tbd' }}</span>
        <span v-if="checkUpMoves(0)" class="red">↑</span>
        <span v-if="checkDownMoves(0)" class="green">↓</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao5', 'tps') }">{{ baseStore.currentAverages[0].tps || 'tbd' }}</span>
        <span v-if="checkUpTPS(0)" class="green">↑</span>
        <span v-if="checkDownTPS(0)" class="red">↓</span>
      </span>
    </div>
    <div class="avg-row">
      <span class="avg-type">ao12</span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao12', 'time') }">{{ baseStore.currentAverages[1].time || 'tbd' }}</span>
        <span v-if="checkDownTime(1)" class="green">↓</span>
        <span v-if="checkUpTime(1)" class="red">↑</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao12', 'moves') }">{{ baseStore.currentAverages[1].moves || 'tbd' }}</span>
        <span v-if="checkUpMoves(1)" class="red">↑</span>
        <span v-if="checkDownMoves(1)" class="green">↓</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao12', 'tps') }">{{ baseStore.currentAverages[1].tps || 'tbd' }}</span>
        <span v-if="checkUpTPS(1)" class="green">↑</span>
        <span v-if="checkDownTPS(1)" class="red">↓</span>
      </span>
    </div>
    <div class="avg-row">
      <span class="avg-type">ao50</span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao50', 'time') }">{{ baseStore.currentAverages[2].time || 'tbd' }}</span>
        <span v-if="checkDownTime(2)" class="green">↓</span>
        <span v-if="checkUpTime(2)" class="red">↑</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao50', 'moves') }">{{ baseStore.currentAverages[2].moves || 'tbd' }}</span>
        <span v-if="checkUpMoves(2)" class="red">↑</span>
        <span v-if="checkDownMoves(2)" class="green">↓</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao50', 'tps') }">{{ baseStore.currentAverages[2].tps || 'tbd' }}</span>
        <span v-if="checkUpTPS(2)" class="green">↑</span>
        <span v-if="checkDownTPS(2)" class="red">↓</span>
      </span>
    </div>
    <div class="avg-row">
      <span class="avg-type">ao100</span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao100', 'time') }">{{ baseStore.currentAverages[3].time || 'tbd' }}</span>
        <span v-if="checkDownTime(3)" class="green">↓</span>
        <span v-if="checkUpTime(3)" class="red">↑</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao100', 'moves') }">{{ baseStore.currentAverages[3].moves || 'tbd' }}</span>
        <span v-if="checkUpMoves(3)" class="red">↑</span>
        <span v-if="checkDownMoves(3)" class="green">↓</span>
      </span>
      <span>
        <span :class="{ 'red': checkIfWasRecord('ao100', 'tps') }">{{ baseStore.currentAverages[3].tps || 'tbd' }}</span>
        <span v-if="checkUpTPS(3)" class="green">↑</span>
        <span v-if="checkDownTPS(3)" class="red">↓</span>
      </span>
    </div>
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
@media screen and (max-width: 950px) {
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
    max-height: 78px;
    overflow-y: auto;
  }
  .avg-row span {
    width: 75px;
  }
  .avg-row .avg-type {
    text-align: right;
    width: 75px;
    padding-right: 10px;
    font-weight: 600;
  }
}
@media screen and (max-height: 650px) and (max-width: 950px) {
  .avg-wrapper {
    font-size: 14px;
    line-height: 1.3;
    margin-top: -5px;
    max-height: 65px;
  }
  .avg-row span, .avg-row .avg-type {
    width: 70px;
  }
}
.green {
  color: green;
}
.red {
  color: red;
}
</style>
