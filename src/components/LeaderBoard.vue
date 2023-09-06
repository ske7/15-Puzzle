<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';
import { type UserRecord } from '../stores/const';

const emit = defineEmits<{ close: [] }>();

const leaderBoard = ref<HTMLElement>();
onClickOutside(leaderBoard, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();

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
fetch('stats');

const puzzleSize = ref<number>(baseStore.numLines);
const puzzleMode = ref<string>(baseStore.marathonMode ? 'marathon' : 'standard');
const bestType = ref<string>('time');

const filteredRecords = computed(() => {
  if ((userRecords.value == null) || userRecords.value.length === 0) {
    return [];
  }
  return userRecords.value.filter((value) => {
    return value.puzzle_size === Number(puzzleSize.value) &&
           value.puzzle_type === puzzleMode.value &&
           value.record_type === bestType.value;
  }).sort((a, b) => {
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
  });
});
let scrollbarWidth = 17;
const tbody = document.getElementById('records-tbody');
if (tbody !== null) {
  scrollbarWidth = tbody.offsetWidth - tbody.clientWidth;
}
const scrollWidth = computed(() => {
  if (filteredRecords.value.length > 10) {
    return `${scrollbarWidth}px`;
  }
  return '0px';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="!baseStore.isFetching" ref="leaderBoard" class="leaderboard">
      <p class="header">
        <span>Leaderboard</span>
      </p>
      <PuzzleSizeSlider v-model="puzzleSize" />
      <PuzzleModeGroup v-model="puzzleMode" :choices="['standard', 'marathon']" :header="'Puzzle Mode'" />
      <PuzzleModeGroup v-model="bestType" :choices="['time', 'moves']" :header="'Best Factor'" />
      <div class="table-container">
        <table class="items-table">
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
              <td>{{ item.tps }}</td>
              <td class="w-28">
                {{ item.control_type.slice(0, 1) }}
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
  --modal-width: 360px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  min-height: 620px;
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
  min-height: 284px;
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
  max-height: 244px;
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
.t-overflow {
  overflow: hidden;
  text-overflow: ellipsis;
}
.puzzle-size-slider-container {
  max-width: 250px;
}
@media screen and (max-width: 840px) {
  .table-container .items-table thead tr {
    width: 100%;
  }
  .table-container .items-table tbody {
    max-height: 244px;
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
    max-height: 233px;
  }
}
@media screen and (max-height: 620px) {
  .leaderboard {
    min-height: 488px;
    top: calc(50% - 244px);
  }
  .table-container {
    min-height: 100px;
  }
  .table-container .items-table tbody {
    max-height: 117px;
    overflow-y: auto;
  }
}
</style>
