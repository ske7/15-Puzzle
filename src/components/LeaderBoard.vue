<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';
import { type UserRecord } from '@/types';
import { baseUrl, fmcBlitzCores } from '@/const';

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
  useGetFetchAPI(endpoint, baseStore.token)
    .then(res => {
      baseStore.isFetching = false;
      userRecords.value = res.records;
    })
    .catch((error: unknown) => {
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

watch(puzzleSize, (newValue) => {
  if (!fmcBlitzCores.includes(newValue) && bestType.value === 'fmc_blitz_moves') {
    bestType.value = 'time';
  }
});
watch(puzzleMode, (newValue) => {
  if (newValue === 'marathon' && bestType.value === 'fmc_blitz_moves') {
    bestType.value = 'time';
  }
});

const infNumber = (n: undefined | string, isDesc = false): number => {
  if (n == null) {
    return isDesc ? -Infinity : Infinity;
  }
  return Number(n);
};
const compare = (x: undefined | number, y: undefined | number): number => {
  if (x == null) {
    return 1;
  }
  if (y == null) {
    return -1;
  }
  if (x === y) {
    return 0;
  } else {
    return x > y ? -1 : 1;
  }
};

const sortSingleRecords = (a: UserRecord, b: UserRecord): number => {
  if (bestType.value === 'time') {
    if (a.time === b.time) {
      if (Number(b.tps) === Number(a.tps)) {
        return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
      }
      return Number(b.tps) - Number(a.tps);
    }
    return a.time - b.time;
  } else {
    if (a.moves === b.moves) {
      if (Number(b.tps) === Number(a.tps)) {
        return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
      }
      return Number(b.tps) - Number(a.tps);
    }
    return a.moves - b.moves;
  }
};
const sortTimeAverages = (a: UserRecord, b: UserRecord): number => {
  const diff = compare(infNumber(b.avg_time), infNumber(a.avg_time));
  if (diff !== 0) {
    return diff;
  }
  return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
};
const sortMovesAverages = (a: UserRecord, b: UserRecord): number => {
  const diff = compare(infNumber(b.avg_moves), infNumber(a.avg_moves));
  if (diff !== 0) {
    return diff;
  }
  return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
};
const sortTPSAverages = (a: UserRecord, b: UserRecord): number => {
  const diff = compare(infNumber(a.avg_tps, true), infNumber(b.avg_tps, true));
  if (diff !== 0) {
    return diff;
  }
  return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
};
const sortAveragesRecords = (a: UserRecord, b: UserRecord): number => {
  if (bestAverage.value === 'time') {
    return sortTimeAverages(a, b);
  } else if (bestAverage.value === 'moves') {
    return sortMovesAverages(a, b);
  } else if (bestAverage.value === 'TPS') {
    return sortTPSAverages(a, b);
  }
  return Number(a.avg_time) - Number(b.avg_time);
};
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
      return sortSingleRecords(a, b);
    } else {
      return sortAveragesRecords(a, b);
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
    if (!fmcBlitzCores.includes(puzzleSize.value) || puzzleMode.value === 'marathon') {
      return ['time', 'moves'];
    }
    return ['time', 'moves', 'fmc_blitz_moves'];
  }
  return ['ao5', 'ao12', 'ao50', 'ao100'];
});
const factorNames = computed(() => {
  if (isDefault.value) {
    if (!fmcBlitzCores.includes(puzzleSize.value) || puzzleMode.value === 'marathon') {
      return ['Time', 'Moves'];
    }
    return ['Time', 'Moves', 'FMC Blitz'];
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
</script>

<template>
  <Teleport to="body">
    <div v-if="!baseStore.isFetching" ref="leaderBoard" class="leaderboard">
      <p class="header">
        <span id="leaderboard-caption">
          {{ isDefault ? 'Leaderboard' : 'Best Averages' }}
        </span>
      </p>
      <PuzzleSizeSlider v-model="puzzleSize" />
      <PuzzleModeGroup
        v-model="puzzleMode"
        :choices="['standard', 'marathon']"
        header="Puzzle Mode"
      />
      <PuzzleModeGroup
        v-model="bestType"
        :choices="factorChoices"
        :header="isDefault ? 'Best Factor' : 'Average Type'"
        :capitalize="isDefault"
        :gap="isDefault ? 25 : 15"
        :names="factorNames"
      />
      <PuzzleModeGroup
        v-if="!isDefault"
        v-model="bestAverage"
        :choices="['time', 'moves', 'TPS']"
        header="Best Factor"
      />
      <div class="table-container" :class="{ 'table-container-ml-8': isDefault }">
        <table v-if="isDefault" class="items-table" aria-describedby="leaderboard-caption">
          <thead>
            <tr>
              <th class="w-30">
                #
              </th>
              <th class="w-120">
                Name
              </th>
              <th v-if="bestType==='time'" class="min-width w-70">
                Time
              </th>
              <th v-if="bestType === 'moves' || bestType === 'fmc_blitz_moves'" class="min-width w-70">
                Moves
              </th>
              <th class="w-60">
                {{ bestType === 'fmc_blitz_moves' ? 'Time' : 'TPS' }}
              </th>
              <th class="w-28">
                By
              </th>
            </tr>
          </thead>
          <tbody id="records-tbody">
            <tr v-for="(item, index) in filteredRecords.slice(0, 100)" :key="item.id">
              <td class="w-30">
                {{ index + 1 }}
              </td>
              <td class="w-120 t-overflow">
                {{ item.name }}
              </td>
              <td v-if="bestType === 'time'" class="min-width w-70">
                <a v-if="item.scramble" :href="`${baseUrl}?game_id=${item.public_id}`" class="link-item">
                  {{ item.time / 1000 }}
                </a>
                <span v-else>
                  {{ item.time / 1000 }}
                </span>
              </td>
              <td v-if="bestType === 'moves' || bestType === 'fmc_blitz_moves'" class="min-width w-70">
                <a v-if="item.scramble && bestType !== 'fmc_blitz_moves'" :href="`${baseUrl}?game_id=${item.public_id}`" class="link-item">
                  {{ item.moves }}
                </a>
                <span v-else>
                  {{ item.moves }}
                </span>
              </td>
              <td class="min-width w-60">
                {{ bestType === 'fmc_blitz_moves' ? Number(item.moves / Number(item.tps)).toFixed(3) : item.tps }}
              </td>
              <td class="w-28">
                {{ item.control_type?.slice(0, 1) }}
              </td>
            </tr>
          </tbody>
        </table>
        <table v-if="!isDefault" class="items-table items-avg" aria-describedby="leaderboard-caption">
          <thead>
            <tr>
              <th class="w-30">
                #
              </th>
              <th class="w-160">
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
            </tr>
          </thead>
          <tbody id="records-tbody">
            <tr v-for="(item, index) in filteredRecords.slice(0, 100)" :key="item.id">
              <td class="w-30">
                {{ index + 1 }}
              </td>
              <td class="w-160 t-overflow">
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
  --modal-width: 400px;
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
.items-avg {
  width: 90%;
  margin: 0 auto;
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
  padding: 3px 4px 3px 4px;
  border: 1px solid var(--table-border-color);
  border-top: 0px;
}
.min-width {
  min-width: 67px;
}
.w-28 {
  width: 28px;
}
.w-30 {
  width: 30px;
}
.w-120 {
  width: 120px;
}
.w-160 {
  width: 160px;
}
.w-60 {
  width: 67px;
}
.w-70 {
  width: 72px;
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
.link-item {
  color: var(--link-color);
  text-decoration: underline;
}
.link-item:hover:not(.paused) {
  text-decoration: underline;
  color: var(--text-color);
  cursor: pointer;
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
  .table-container-ml-8 {
    margin-left: -8px;
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
