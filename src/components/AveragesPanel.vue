<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBaseStore } from '../stores/base';
import { useLazyComponent } from '../composables/useLazyComponent';
import { useModalPause } from '../composables/useModalPause';
import { useWindowWidth } from '../composables/useWindowWidth';
const LeaderBoard = useLazyComponent(() => import('./LeaderBoard.vue'));

const baseStore = useBaseStore();

const windowWidth = useWindowWidth();
const positionTop = computed(() => {
  return `${baseStore.boardPos.top + 100}px`;
});
const positionLeft = computed(() => {
  return `${baseStore.boardPos.left - 300}px`;
});
type AverageField = 'time' | 'moves' | 'tps';

interface AverageRow {
  id: number;
  type: string;
  hasRecordCheck: boolean;
  g1000Only: boolean;
}
interface AverageColumn {
  field: AverageField;
  upClass: string;
  downClass: string;
}
const averageRows: AverageRow[] = [
  { id: 1, type: 'ao5', hasRecordCheck: true, g1000Only: false },
  { id: 2, type: 'ao12', hasRecordCheck: true, g1000Only: false },
  { id: 3, type: 'ao50', hasRecordCheck: true, g1000Only: false },
  { id: 4, type: 'ao100', hasRecordCheck: true, g1000Only: false },
  { id: 5, type: 'ao1000', hasRecordCheck: true, g1000Only: true },
  { id: 0, type: 'aoS', hasRecordCheck: false, g1000Only: false }
];
const averageColumns: AverageColumn[] = [
  { field: 'time', upClass: 'red', downClass: 'green' },
  { field: 'moves', upClass: 'red', downClass: 'green' },
  { field: 'tps', upClass: 'green', downClass: 'red' }
];
const visibleAverageRows = computed(() => {
  return averageRows.filter((row) => !row.g1000Only || baseStore.g1000Mode);
});

const checkDirection = (arrayID: number, field: AverageField, direction: 'up' | 'down'): boolean => {
  if (baseStore.prevAverages.length === 0 || baseStore.currentAverages.length === 0) {
    return false;
  }
  const current = Number(baseStore.currentAverages[arrayID][field] ?? 0);
  const prev = Number(baseStore.prevAverages[arrayID][field] ?? 0);
  return direction === 'up' ? current > prev : current < prev;
};
const checkIfWasRecord = (type: string, field: string): boolean => {
  const record = baseStore.wasAvgRecords.find(value => {
    return value.type === type;
  });
  if (field === 'time') {
    return record?.record_time ?? false;
  } else if (field === 'moves') {
    return record?.record_moves ?? false;
  } else if (field === 'tps') {
    return record?.record_tps ?? false;
  }
  return false;
};
const showAveragesLeaderBoard = ref(false);
const leaderBoardPause = useModalPause();
const doShowLeaderBoard = (): void => {
  if (baseStore.cannotClick) {
    return;
  }
  leaderBoardPause.open();
  showAveragesLeaderBoard.value = true;
  baseStore.showLeaderBoard = true;
};
const closeLeaderBoard = (): void => {
  showAveragesLeaderBoard.value = false;
  baseStore.showLeaderBoard = false;
  leaderBoardPause.close();
};
</script>

<template>
  <div
    v-if="!baseStore.replayMode && !baseStore.playgroundMode && !baseStore.isNetworkError &&
      baseStore.currentAverages.length > 0 && !baseStore.hideCurrentAverages && baseStore.proMode"
    class="avg-wrapper"
  >
    <div class="avg-row top-row">
      <span>
        <span
          v-show="!baseStore.clearDisplay"
          class="best-averages-mobile link-item"
          :class="{ paused: baseStore.cannotClick }"
          @click="doShowLeaderBoard"
        >
          Best
        </span>
      </span>
      <span>Time</span>
      <span>Moves</span>
      <span>TPS</span>
    </div>
    <div v-show="windowWidth >= 1050 || (baseStore.isDone || baseStore.time === 0)" class="avg-rows">
      <div v-for="row in visibleAverageRows" :key="row.type" class="avg-row">
        <span class="avg-type">{{ row.type }}</span>
        <span v-for="column in averageColumns" :key="column.field">
          <span :class="{ 'purple': row.hasRecordCheck && checkIfWasRecord(row.type, column.field) }">
            {{ baseStore.currentAverages[row.id][column.field] || 'tbd' }}
          </span>
          <span v-if="checkDirection(row.id, column.field, 'up')" :class="column.upClass">↑</span>
          <span v-if="checkDirection(row.id, column.field, 'down')" :class="column.downClass">↓</span>
        </span>
      </div>
    </div>
    <p class="consecutive-solves">
      Consecutive solves: {{ baseStore.consecutiveSolves }}
    </p>
    <p class="best-averages">
      <span class="link-item" :class="{ paused: baseStore.cannotClick }" @click="doShowLeaderBoard">Best Averages</span>
    </p>
    <LeaderBoard
      v-if="baseStore.showLeaderBoard && showAveragesLeaderBoard"
      form-type="averages"
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
  font-family: consolas, sans-serif;
  width: 295px;
  height: 300px;
  contain: layout paint size;
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
.best-averages {
  display: flex;
  justify-content: center;
}
.best-averages-mobile {
  display: none;
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
    height: 100px;
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
    height: 69px;
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
