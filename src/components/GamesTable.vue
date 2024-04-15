<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { onClickOutside, useDateFormat, useWindowSize } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import { type GameData } from '@/types';
import { baseUrl, OrderDirection, OrderDirectionMap } from '@/const';
import { shortenSolutionStr, convertScrambles } from '@/utils';
import CopyButton from './CopyButton.vue';

const emit = defineEmits<{ close: [] }>();

const gamesTable = ref<HTMLElement>();
onClickOutside(gamesTable, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();
const { width: windowWidth } = useWindowSize();
const limit = 50;
let offset = 0;

const puzzleSize = ref<number>(baseStore.numLines);
const puzzleMode = ref<string>(baseStore.marathonMode ? 'marathon' : 'standard');
if (baseStore.g1000Mode) {
  puzzleMode.value = 'g1000';
}
const errorMsg = ref('');
const gameRecords = ref<GameData[]>([]);
const isFetching = ref(false);
const fetched = ref(false);
const fetch = (endpoint: string): void => {
  errorMsg.value = '';
  if (isFetching.value) {
    return;
  }
  isFetching.value = true;
  useGetFetchAPI(endpoint, baseStore.token)
    .then(res => {
      isFetching.value = false;
      if (res.game_records != null) {
        if (res.game_records.length === 0) {
          offset = -1;
        } else {
          gameRecords.value.push(...res.game_records);
          offset += limit;
        }
      }
      fetched.value = true;
    })
    .catch((error: unknown) => {
      errorMsg.value = error as string;
      if (String(errorMsg.value).toLowerCase().includes('networkerror')) {
        baseStore.isNetworkError = true;
      }
      isFetching.value = false;
    });
};
const formatDate = (date?: string): string => {
  if (date == null) {
    return '';
  }
  return useDateFormat(date, 'YYYY-MM-DD HH:mm:ss').value;
};
let orderDirection: OrderDirection = OrderDirection.Desc;
let sortField = 'id';
const doFetch = (): void => {
  // eslint-disable-next-line vue/max-len
  fetch(`user_games?puzzle_size=${puzzleSize.value}&puzzle_type=${puzzleMode.value}&offset=${offset}&limit=${limit}&order_field=${sortField}&order_direction=${OrderDirectionMap.get(orderDirection)}`);
};
let recordsTable: HTMLElement | null;
const onscroll = (_event: Event): void => {
  if (recordsTable != null && offset !== -1) {
    if (recordsTable.scrollTop + recordsTable.offsetHeight >= recordsTable.scrollHeight - 100) {
      doFetch();
    }
  }
};
onMounted(() => {
  doFetch();
  recordsTable = document.getElementById('game-list-table');
  if (recordsTable != null) {
    recordsTable.addEventListener('scroll', onscroll);
  }
});
onUnmounted(() => {
  if (recordsTable != null) {
    recordsTable.removeEventListener('scroll', onscroll);
  }
});
const puzzleModeChoices = ref(baseStore.numLines === 3 ? ['standard', 'marathon', 'g1000'] : ['standard', 'marathon']);
watch(puzzleSize, (newValue) => {
  if (newValue !== 0) {
    if (newValue === 3) {
      puzzleModeChoices.value = ['standard', 'marathon', 'g1000'];
    } else {
      if (puzzleMode.value === 'g1000') {
        puzzleMode.value = 'standard';
      }
      puzzleModeChoices.value = ['standard', 'marathon'];
    }
    gameRecords.value = [];
    offset = 0;
    fetched.value = false;
    if (sortField === 'opt_diff') {
      sortField = 'moves';
    }
    doFetch();
  }
});
watch(puzzleMode, () => {
  gameRecords.value = [];
  offset = 0;
  fetched.value = false;
  doFetch();
});
const doSort = (newSortField: string): void => {
  if (newSortField !== sortField) {
    sortField = newSortField;
    orderDirection = OrderDirection.Asc;
  } else if (orderDirection === OrderDirection.Asc) {
    orderDirection = OrderDirection.Desc;
  } else if (orderDirection === OrderDirection.Desc) {
    orderDirection = OrderDirection.Asc;
  }
  gameRecords.value = [];
  offset = 0;
  fetched.value = false;
  doFetch();
};
const download = (content: string, fileName: string, contentType: string): void => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
};
const jsonToCSV = (data: GameData[]): string => {
  const fields = ['public_id', 'created_at', 'consecutive_solves', 'time', 'moves', 'tps', 'scramble', 'solve_path'];
  if (puzzleSize.value === 3) {
    fields.splice(5, 0, 'opt_moves');
  }
  let csvStr = `${fields.join(',')}\n`;
  data.forEach(item => {
    const publicId = item.public_id;
    const createdAt = formatDate(item.created_at);
    const consecutiveSolves = item.consecutive_solves;
    const time = (item.time / 1000.0).toString();
    const moves = item.moves;
    const tps = item.tps;
    const scramble = convertScrambles(item.scramble, puzzleMode.value);
    const solvePath = shortenSolutionStr(item.solve_path);
    let optMoves = '';
    if (puzzleSize.value === 3) {
      optMoves = `${item.opt_moves},`;
    }
    // eslint-disable-next-line vue/max-len
    csvStr += `${publicId},${createdAt},${consecutiveSolves},${time},${moves},${optMoves}${tps},${scramble},${solvePath}\n`;
  });
  return csvStr;
};
const doExport = (): void => {
  useGetFetchAPI(`session_games?puzzle_size=${puzzleSize.value}&puzzle_type=${puzzleMode.value}`, baseStore.token)
    .then(res => {
      download(jsonToCSV(res.game_records!), 'games.csv', 'text/plain');
    })
    .catch((error: unknown) => {
      errorMsg.value = error as string;
      console.log(errorMsg.value);
    });
};
</script>

<template>
  <div ref="gamesTable" class="games-table">
    <p class="header">
      <span>
        Your Games
      </span>
    </p>
    <PuzzleSizeSlider v-model="puzzleSize" />
    <PuzzleModeGroup
      v-model="puzzleMode"
      :choices="puzzleModeChoices"
      :header="'Puzzle Mode'"
    />
    <div class="export-link-wrapper">
      <a class="link-item" @click="doExport">Export last session</a>
    </div>
    <hr class="nice-hr">
    <div id="game-list-table" class="table-wrapper">
      <div class="flex-table table-header">
        <div class="flex-row w-70">
          ID
        </div>
        <div class="flex-row w-95">
          Date
          <span class="pro-sort" @click="doSort('id')">
            {{ sortField !== 'id' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div class="flex-row w-49">
          CS
        </div>
        <div class="flex-row w-85">
          Time
          <span class="pro-sort" @click="doSort('time')">
            {{ sortField !== 'time' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div class="flex-row w-85">
          Moves
          <span class="pro-sort" @click="doSort('moves')">
            {{ sortField !== 'moves' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div v-if="puzzleSize === 3" class="flex-row w-85">
          Opt.diff
          <span class="pro-sort" @click="doSort('opt_diff')">
            {{ sortField !== 'opt_diff' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div class="flex-row w-70">
          TPS
          <span class="pro-sort" @click="doSort('tps')">
            {{ sortField !== 'tps' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↓' : '↑') }}
          </span>
        </div>
        <div class="flex-row" :class="{ 'w-85': windowWidth <= 1100 }">
          Scramble
        </div>
        <div class="flex-row" :class="{ 'w-85': windowWidth <= 1100 }">
          Solution
        </div>
      </div>
      <template v-if="fetched">
        <div v-for="(item) in gameRecords" :key="item.id" class="flex-table">
          <div class="table-header-mobile">
            <div class="flex-row">
              ID
            </div>
            <div class="flex-row">
              Date
              <span class="pro-sort" @click="doSort('id')">
                {{ sortField !== 'id' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
              </span>
            </div>
            <div class="flex-row">
              CS
            </div>
            <div class="flex-row">
              Time
              <span class="pro-sort" @click="doSort('time')">
                {{ sortField !== 'time' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
              </span>
            </div>
            <div class="flex-row">
              Moves
              <span class="pro-sort" @click="doSort('moves')">
                {{ sortField !== 'moves' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
              </span>
            </div>
            <div v-if="puzzleSize === 3" class="flex-row">
              Opt.diff
              <span class="pro-sort" @click="doSort('opt_diff')">
                {{ sortField !== 'opt_diff' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
              </span>
            </div>
            <div class="flex-row">
              TPS
              <span class="pro-sort" @click="doSort('tps')">
                {{ sortField !== 'tps' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↓' : '↑') }}
              </span>
            </div>
            <div class="flex-row">
              Scramble
            </div>
            <div class="flex-row">
              Solution
            </div>
          </div>
          <div class="items">
            <div class="flex-row w-70">
              <a v-if="item.scramble " :href="`${baseUrl}?game_id=${item.public_id}`" class="link-item">
                {{ item.id }}
              </a>
              <span v-else>{{ item.id }}</span>
            </div>
            <div class="flex-row w-95">
              <span class="white-space-normal date-smaller">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="flex-row w-49">
              <span> {{ item.consecutive_solves }}</span>
            </div>
            <div class="flex-row w-85">
              <span>{{ item.time / 1000 }}</span>
            </div>
            <div class="flex-row w-85">
              <span>{{ item.moves }}</span>
            </div>
            <div v-if="puzzleSize === 3" class="flex-row w-85">
              <span v-if="(item.opt_diff || 0) >= 0">+{{ item.opt_diff || 0 }}</span>
            </div>
            <div class="flex-row w-70">
              <span>{{ item.tps }}</span>
            </div>
            <div class="flex-row smaller-font" :class="{ 'w-85': windowWidth <= 1100 }">
              <div class="copy-button-wrapper">
                <span v-if="item.scramble" class="smaller-font long-span">
                  {{ convertScrambles(item.scramble, item.puzzle_type) }}
                </span>
                <span v-else class="long-span">{{ convertScrambles(item.scramble, item.puzzle_type) }}</span>
                <CopyButton
                  v-if="item.scramble"
                  :item-to-copy="String(item.scramble)"
                  :is-solve-path="false"
                  :puzzle-type="item.puzzle_type"
                />
              </div>
            </div>
            <div class="flex-row smaller-font" :class="{ 'w-85': windowWidth <= 1100 }">
              <div class="copy-button-wrapper">
                <span class="long-span">{{ shortenSolutionStr(item.solve_path) }}</span>
                <CopyButton
                  v-if="item.solve_path"
                  :item-to-copy="String(item.solve_path)"
                  :is-solve-path="true"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <div v-if="fetched" class="buttons">
      <button type="button" class="tool-button" @click="emit('close')">
        OK
      </button>
    </div>
  </div>
</template>

<style scoped>
.games-table {
  --modal-width: 1100px;
  display: flex;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: 100vh;
  width: var(--modal-width);
  position: fixed;
  z-index: 2005;
  top: 0px;
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
  box-shadow: 0 8px 16px var(--shadow-color);
  line-height: 1.3;
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
  align-items: center;
  gap: 10px;
  flex-direction: column;
}
.buttons .tool-button {
  width: 100px;
}
.puzzle-size-slider-container {
  max-width: 250px;
}
.games-wrapper {
  position: relative;
}
.export-link-wrapper {
  display: block;
  width: 100%;
  max-width: 95%;
  margin: 0 auto;
}
.nice-hr {
  max-width: 95%;
  margin: 4px auto 4px auto;
  width: 100%;
  border: none;
  border-top: 1px solid var(--table-border-color);
  height: 0px;
}
.table-wrapper {
  display: block;
  margin: 0px auto;
  width: 100%;
  max-width: 95%;
  overflow: auto;
}
.table-header-mobile {
  display: none;
}
.flex-table {
  display: flex;
  flex-flow: row wrap;
  border-left: solid 1px var(--table-border-color);
}
.flex-row {
  display: flex;
  flex-basis: 0;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  min-height: 52.6px;
  padding: 7px 4px;
  overflow: hidden;
  text-align: center;
  border-right: solid 1px var(--table-border-color);
  border-bottom: solid 1px var(--table-border-color);
}
.w-49 {
  max-width: 49px;
}
.w-70 {
  max-width: 70px;
}
.w-85 {
  max-width: 85px;
}
.w-95 {
  max-width: 95px;
}
.items {
  display: flex;
  flex: 1;
}
.table-header > .flex-row {
  min-height: 35.6px;
}
.flex-table:first-of-type {
  border-top: solid 1px var(--table-border-color);
}
.table-header-mobile .flex-row, .flex-table:first-of-type .flex-row {
  background: gold;
  color: black;
  font-size: 15px;
  font-weight: 600;
  max-height: 50px;
}
.flex-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 232px;
  font-size: 14px;
  padding: 0 5px;
  display: block;
}
.copy-button-wrapper {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-direction: column;
  line-height: 1.2;
  margin-bottom: -5px;
  font-size: 14px;
}
.copy-button-wrapper :deep(.copy-button) {
  display: flex;
  --vd-font-size: 13px;
  --vh-font-size: 14px;
}
.link-item {
  color: var(--link-color);
  text-decoration: underline;
  font-size: 14px;
  font-weight: 600;
}
.link-item:hover:not(.paused) {
  text-decoration: underline;
  color: var(--text-color);
  cursor: pointer;
}
.pro-sort {
  cursor: pointer;
  font-weight: 800;
  color: darkcyan;
  min-width: auto !important;
  font-size: 15px !important;
}
.pro-sort:hover {
  opacity: 0.8;
}
.pro-sort:active {
  opacity: 0.7;
}
.white-space-normal {
  white-space: normal !important;
}
@media screen and (max-width: 1100px) {
  .games-table {
  --modal-width: 768px;
  }
  .w-49, .w-70, .w-85, .w-95 {
    max-width: 100%;
  }
  .table-wrapper {
    max-width: 100%;
  }
  .export-link-wrapper {
    max-width: 100%;
  }
  .long-span {
    display: none !important;
  }
}
@media screen and (max-width: 768px) {
  .games-table {
  --modal-width: 100%;
  }
  .date-smaller {
    min-width: 80px;
    font-size: 13px !important;
  }
}
@media screen and (max-width: 600px) {
  .games-table {
  --modal-width: 600px;
  }
  .nice-hr {
    display: none;
  }
  .export-link-wrapper {
    width: auto;
    margin-bottom: 5px;
  }
  .table-wrapper {
    display: flex;
    flex-direction: column;
  }
  .table-header-mobile, .items {
    display: flex;
    flex-direction: column;
  }
  .table-header-mobile {
    width: 150px;
  }
  .items {
    flex: 0;
  }
  .flex-table {
    display: flex;
    flex-flow: row wrap;
    margin-bottom: 20px;
    border-bottom: 0px;
    border-left: 0px;
    justify-content: center;
  }
  .flex-row {
    display: flex;
    flex-basis: 0;
    flex-grow: 1;
    max-width: 180px;
    min-width: 180px;
    min-height: 60px;
    border-top: solid 1px var(--table-border-color);
    border-bottom: solid 0px var(--table-border-color);
  }
  .flex-row:last-of-type {
    border-bottom: solid 1px var(--table-border-color);
  }
  .table-header-mobile > .flex-row {
    width: 150px;
    max-width: 150px;
    min-width: 150px;
  }
  .table-header {
    display: none;
  }
  .w-49, .w-70, .w-85, w-95 {
    max-width: 180px;
    min-width: 180px;
  }
  .flex-row span {
    max-width: 180px;
    min-width: 180px;
    font-weight: 600;
  }
  .smaller-font span, .smaller-font .link-item {
    font-size: 12px;
  }
  .date-smaller {
    font-size: 14px !important;
  }
}
@media screen and (max-width: 350px) {
  .table-header-mobile {
    width: 120px;
  }
  .table-header-mobile > .flex-row {
    width: 120px;
    max-width: 120px;
    min-width: 120px;
  }
}
</style>
