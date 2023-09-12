<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';
import { type UserRecord } from '../stores/const';

const props = defineProps<{ formType: string }>();
const emit = defineEmits<{ close: [] }>();

const leaderBoard = ref<HTMLElement>();
onClickOutside(leaderBoard, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();

const isDefault = computed(() => {
  return props.formType === 'default';
});

const errorMsg = ref('');
const userRecords = ref<UserRecord[]>();
const fetch = (endpoint: string): void => {
  errorMsg.value = '';
  if (baseStore.isFetching) {
    return;
  }
  baseStore.isFetching = true;
  useGetFetchAPI(endpoint, baseStore.token as (string | undefined))
    .then(res => {
      baseStore.isFetching = false;
      userRecords.value = res.records;
    })
    .catch(error => {
      errorMsg.value = error as string;
      if (String(errorMsg.value).toLowerCase().includes('networkerror')) {
        baseStore.isNetworkError = true;
      }
      baseStore.isFetching = false;
    });
};
fetch(props.formType === 'default' ? 'stats' : 'stats?avg=1');

const puzzleSize = ref<number>(baseStore.numLines);
const puzzleMode = ref<string>(baseStore.marathonMode ? 'marathon' : 'standard');
const bestType = ref<string>(props.formType === 'default' ? 'time' : 'ao5');
const bestAverage = ref<string>('time');

const filteredRecords = computed(() => {
  if ((userRecords.value == null) || userRecords.value.length === 0) {
    return [];
  }
  return userRecords.value.filter((value) => {
    return value.puzzle_size === Number(puzzleSize.value) &&
           value.puzzle_type === puzzleMode.value &&
           value.record_type === bestType.value;
  }).sort((a, b) => {
    if (isDefault.value) {
      if (bestType.value === 'time') {
        if (a.time === b.time) {
          return Number(b.tps) - Number(a.tps);
        }
        return a.time - b.time;
      } else {
        if (a.moves === b.moves) {
          return Number(b.tps) - Number(a.tps);
        }
        return a.moves - b.moves;
      }
    } else {
      if (bestAverage.value === 'time') {
        return Number(a.avg_time) - Number(b.avg_time);
      } else if (bestAverage.value === 'moves') {
        return Number(a.avg_moves) - Number(b.avg_moves);
      } else if (bestAverage.value === 'TPS') {
        return Number(b.avg_tps) - Number(a.avg_tps);
      }
      return Number(a.avg_time) - Number(b.avg_time);
    }
  });
});
let scrollbarWidth = 17;
const tbody = document.getElementById('records-tbody');
if (tbody !== null) {
  scrollbarWidth = tbody.offsetWidth - tbody.clientWidth;
}
const scrollWidth = computed(() => {
  if (filteredRecords.value.length > (isDefault.value ? 10 : 5)) {
    return `${scrollbarWidth}px`;
  }
  return '0px';
});
const factorChoices = computed(() => {
  if (isDefault.value) {
    return ['time', 'moves'];
  }
  return ['ao5', 'ao12', 'ao50', 'ao100'];
});
const minHeight = computed(() => {
  if (isDefault.value) {
    return '620px';
  }
  return '498px';
});
const tbodyHeight = computed(() => {
  if (isDefault.value) {
    return '244px';
  }
  return '122px';
});
const tableContainerHeight = computed(() => {
  if (isDefault.value) {
    return '284px';
  }
  return '162px';
});
const tbodyHeightMobile = computed(() => {
  if (isDefault.value) {
    return '233px';
  }
  return '116.5px';
});
const getProStatus = (item: UserRecord): string => {
  if (item.pro_record ?? false) {
    if ((item.pro_avg_time ?? false) && bestAverage.value === 'time') {
      return item.pro_time_value ?? 'Ge!';
    }
    if ((item.pro_avg_moves ?? false) && bestAverage.value === 'moves') {
      return item.pro_moves_value ?? 'Ge!';
    }
    if ((item.pro_avg_tps ?? false) && bestAverage.value === 'TPS') {
      return item.pro_tps_value ?? 'Ge!';
    }
  }
  return '';
};
</script>

<template>
  <Teleport to="body">
    <div v-if="!baseStore.isFetching" ref="leaderBoard" class="leaderboard">
      <p class="header">
        <span>
          {{ isDefault ? 'Leaderboard' : 'Best Averages' }}
        </span>
      </p>
      <PuzzleSizeSlider v-model="puzzleSize" />
      <PuzzleModeGroup
        v-model="puzzleMode"
        :choices="['standard', 'marathon']"
        :header="'Puzzle Mode'"
      />
      <PuzzleModeGroup
        v-model="bestType"
        :choices="factorChoices"
        :header="isDefault ? 'Best Factor' : 'Average Type'"
        :capitalize="isDefault"
        :gap="isDefault ? 25 : 15"
      />
      <PuzzleModeGroup
        v-if="!isDefault"
        v-model="bestAverage"
        :choices="['time', 'moves', 'TPS']"
        :header="'Best Factor'"
      />
      <div class="table-container">
        <table v-if="isDefault" class="items-table">
          <thead>
            <tr>
              <th class="w-28">
                #
              </th>
              <th class="w-120">
                Name
              </th>
              <th v-if="bestType==='time'" class="min-width">
                Time
              </th>
              <th v-if="bestType === 'moves'" class="min-width">
                Moves
              </th>
              <th>TPS</th>
              <th class="w-28">
                By
              </th>
            </tr>
          </thead>
          <tbody id="records-tbody">
            <tr v-for="(item, index) in filteredRecords.slice(0, 50)" :key="item.id">
              <td class="w-28">
                {{ index + 1 }}
              </td>
              <td class="w-120 t-overflow">
                {{ item.name }}
              </td>
              <td v-if="bestType === 'time'" class="min-width">
                {{ item.time / 1000 }}
              </td>
              <td v-if="bestType === 'moves'" class="min-width">
                {{ item.moves }}
              </td>
              <td class="min-width">
                {{ item.tps }}
              </td>
              <td class="w-28">
                {{ item.control_type?.slice(0, 1) }}
              </td>
            </tr>
          </tbody>
        </table>
        <table v-if="!isDefault" class="items-table">
          <thead>
            <tr>
              <th class="w-28">
                #
              </th>
              <th class="w-150">
                Name
              </th>
              <th v-if="bestAverage === 'time'" class="min-width">
                Time
              </th>
              <th v-if="bestAverage === 'moves'" class="min-width">
                Moves
              </th>
              <th v-if="bestAverage === 'TPS'" class="min-width">
                TPS
              </th>
              <th>
                Pro
              </th>
            </tr>
          </thead>
          <tbody id="records-tbody">
            <tr v-for="(item, index) in filteredRecords.slice(0, 50)" :key="item.id">
              <td class="w-28">
                {{ index + 1 }}
              </td>
              <td class="w-150 t-overflow">
                {{ item.name }}
              </td>
              <td v-if="bestAverage === 'time'" class="min-width">
                {{ item.avg_time }}
              </td>
              <td v-if="bestAverage === 'moves'" class="min-width">
                {{ item.avg_moves }}
              </td>
              <td v-if="bestAverage === 'TPS'" class="min-width">
                {{ item.avg_tps }}
              </td>
              <td>
                {{ getProStatus(item) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.leaderboard {
  --modal-width: 380px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  min-height: v-bind(minHeight);
  width: var(--modal-width);
  position: fixed;
  z-index: 2000;
  top: calc(50% - 310px);
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
  box-shadow: 0 8px 16px var(--shadow-color);
}
.header {
  text-align: center;
  margin-bottom: 5px;
  margin-top: 5px;
}
.header span {
  font-weight: 600;
  font-size: 21px;
}
.buttons {
  margin-top: 15px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
}
.buttons .tool-button {
  width: 100px;
}
.table-container {
  min-height: v-bind(tableContainerHeight);
}
.items-table {
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  background-color: transparent;
  border-collapse: collapse;
  border-spacing: 0;
  margin-bottom: 10px;
  font-family: 'consolas', sans-serif;
  line-height: 1.1;
}
.items-table thead {
  font-size: 16px;
  text-align: left;
  background-color: gold;
}
.items-table thead th {
  padding: 5px;
  color: black;
  border: 1px solid var(--table-border-color);
}
.table-container table thead, table tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.table-container .items-table thead tr {
  width: calc(100% - v-bind(scrollWidth));
  display: table;
  table-layout: fixed;
}
.items-table tbody {
  font-size: 16px;
  text-align: left;
  display: block;
  max-height: v-bind(tbodyHeight);
  overflow-y: auto;
  scrollbar-width: auto;
}
.items-table td {
  padding: 3px 5px 3px 5px;
  border: 1px solid var(--table-border-color);
  border-top: 0px;
}
.min-width {
  min-width: 67px;
}
.w-28 {
  width: 28px;
}
.w-120 {
  width: 120px;
}
.w-150 {
  width: 150px;
}
.w-40 {
  width: 40px;
}
.t-overflow {
  overflow: hidden;
  text-overflow: ellipsis;
}
.puzzle-size-slider-container {
  max-width: 250px;
}
.puzzle-mode-container {
  max-width: 350px;
}
@media screen and (max-width: 840px) {
  .table-container .items-table thead tr {
    width: 100%;
  }
  .table-container .items-table tbody {
    max-height: v-bind(tbodyHeight);
  }
}
@media screen and (max-width: 420px) {
  .leaderboard {
    --modal-width: 340px;
  }
  .items-table thead {
    font-size: 15px;
  }
  .items-table tbody {
    font-size: 15px;
  }
  .table-container .items-table tbody {
    max-height: v-bind(tbodyHeightMobile);
  }
}
@media screen and (max-height: 620px) {
  .leaderboard {
    min-height: 488px;
    top: 10px;
  }
  .table-container {
    min-height: 156.4px;
  }
  .table-container .items-table tbody {
    max-height: 117px;
    overflow-y: auto;
  }
}
</style>
