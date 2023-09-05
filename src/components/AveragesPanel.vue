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
</script>

<template>
  <div
    v-if="baseStore.currentAverages.length > 0 && !baseStore.hideCurrentAverages &&
      baseStore.proMode && !baseStore.cageMode && !baseStore.marathonMode"
    class="avg-wrapper"
  >
    <div class="avg-row top-row">
      <span />
      <span>Time</span>
      <span>Moves</span>
      <span>TPS</span>
    </div>
    <div class="avg-row">
      <span>ao5</span>
      <span>{{ baseStore.currentAverages[0].time || 'tbd' }}<span v-if="checkUpTime(0)" class="red">↑</span><span v-if="checkDownTime(0)" class="green">↓</span></span>
      <span>{{ baseStore.currentAverages[0].moves || 'tbd' }}<span v-if="checkUpMoves(0)" class="red">↑</span><span v-if="checkDownMoves(0)" class="green">↓</span></span>
      <span>{{ baseStore.currentAverages[0].tps || 'tbd' }}<span v-if="checkUpTPS(0)" class="green">↑</span><span v-if="checkDownTPS(0)" class="red">↓</span></span>
    </div>
    <div class="avg-row">
      <span>ao12</span>
      <span>{{ baseStore.currentAverages[1].time || 'tbd' }}<span v-if="checkDownTime(1)" class="green">↓</span><span v-if="checkUpTime(1)" class="red">↑</span></span>
      <span>{{ baseStore.currentAverages[1].moves || 'tbd' }}<span v-if="checkUpMoves(1)" class="red">↑</span><span v-if="checkDownMoves(1)" class="green">↓</span></span>
      <span>{{ baseStore.currentAverages[1].tps || 'tbd' }}<span v-if="checkUpTPS(1)" class="green">↑</span><span v-if="checkDownTPS(1)" class="red">↓</span></span>
    </div>
    <div class="avg-row hide-on-mobile">
      <span>ao50</span>
      <span>{{ baseStore.currentAverages[2].time || 'tbd' }}<span v-if="checkDownTime(2)" class="green">↓</span><span v-if="checkUpTime(2)" class="red">↑</span></span>
      <span>{{ baseStore.currentAverages[2].moves || 'tbd' }}<span v-if="checkUpMoves(2)" class="red">↑</span><span v-if="checkDownMoves(2)" class="green">↓</span></span>
      <span>{{ baseStore.currentAverages[2].tps || 'tbd' }}<span v-if="checkUpTPS(2)" class="green">↑</span><span v-if="checkDownTPS(2)" class="red">↓</span></span>
    </div>
    <div class="avg-row hide-on-mobile">
      <span>ao100</span>
      <span>{{ baseStore.currentAverages[3].time || 'tbd' }}<span v-if="checkDownTime(3)" class="green">↓</span><span v-if="checkUpTime(3)" class="red">↑</span></span>
      <span>{{ baseStore.currentAverages[3].moves || 'tbd' }}<span v-if="checkUpMoves(3)" class="red">↑</span><span v-if="checkDownMoves(3)" class="green">↓</span></span>
      <span>{{ baseStore.currentAverages[3].tps || 'tbd' }}<span v-if="checkUpTPS(3)" class="green">↑</span><span v-if="checkDownTPS(3)" class="red">↓</span></span>
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
  width: 80px;
  padding-right: 10px;
}
.avg-row span:first-child {
  text-align: right;
  width: 60px;
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
  }
  .avg-row span {
    width: 70px;
  }
  .hide-on-mobile {
    display: none;
  }
}
@media screen and (max-height: 650px) and (max-width: 950px) {
  .avg-wrapper {
    font-size: 14px;
    line-height: 1.3;
    margin-top: -5px;
  }
  .avg-row span {
    width: 65px;
  }
}
.green {
  color: green;
}
.red {
  color: red;
}
</style>
