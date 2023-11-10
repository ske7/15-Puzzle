<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { onClickOutside, useDateFormat, useWindowSize } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import { type GameData } from '@/types';
import { baseUrl, OrderDirection, OrderDirectionMap } from '@/const';
import { shortenSolutionStr, convertScramble } from '@/utils';
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
    .catch(error => {
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
  fetch(`user_games?puzzle_size=${puzzleSize.value}&offset=${offset}&limit=${limit}&order_field=${sortField}&order_direction=${OrderDirectionMap.get(orderDirection)}`);
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
watch(puzzleSize, (newValue) => {
  if (newValue !== 0) {
    gameRecords.value = [];
    offset = 0;
    fetched.value = false;
    doFetch();
  }
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
</script>

<template>
  <div ref="gamesTable" class="games-table">
    <p class="header">
      <span>
        Your Games
      </span>
    </p>
    <PuzzleSizeSlider v-model="puzzleSize" />
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
        <div class="flex-row w-85">
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
              <a v-if="item.scramble" :href="`${baseUrl}?game_id=${item.id}`" class="link-item">
                {{ item.id }}
              </a>
              <span v-else>{{ item.id }}</span>
            </div>
            <div class="flex-row w-95">
              <span class="white-space-normal date-smaller">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="flex-row w-85">
              <span>{{ item.time / 1000 }}</span>
            </div>
            <div class="flex-row w-85">
              <span>{{ item.moves }}</span>
            </div>
            <div class="flex-row w-85">
              <span>{{ item.tps }}</span>
            </div>
            <div class="flex-row smaller-font" :class="{ 'w-85': windowWidth <= 1100 }">
              <div class="copy-button-wrapper">
                <span v-if="item.scramble" class="smaller-font long-span">
                  {{ convertScramble(item.scramble) }}
                </span>
                <span v-else class="long-span">{{ convertScramble(item.scramble) }}</span>
                <CopyButton
                  v-if="item.scramble"
                  :item-to-copy="String(item.scramble)"
                  :is-solve-path="false"
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
}
.buttons .tool-button {
  width: 100px;
}
.puzzle-size-slider-container {
  max-width: 250px;
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
  font-size: 16px;
  font-weight: 600;
  max-height: 50px;
}
.flex-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
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
  font-size: 16px !important;
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
  .w-70, .w-85, .w-95 {
    max-width: 100%;
  }
  .table-wrapper {
    max-width: 100%;
  }
  .long-span {
    display: none !important;
  }
}
@media screen and (max-width: 768px) {
  .games-table {
  --modal-width: 600px;
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
  .w-70, .w-85, w-95 {
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
