<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { onClickOutside, useDateFormat } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import { type UserScrambleData } from '@/types';
import { baseUrl, OrderDirection, OrderDirectionMap } from '@/const';
import { convertScramble, convertToNumbersArray } from '@/utils';
import CopyButton from './CopyButton.vue';

const emit = defineEmits<{ close: []; set: [scramble: number[]] }>();

const scrambleList = ref<HTMLElement>();
onClickOutside(scrambleList, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();

const limit = 50;
let offset = 0;

const puzzleSize = ref<number>(baseStore.numLines);
const errorMsg = ref('');
const scrambleRecords = ref<UserScrambleData[]>([]);
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
      if (res.scramble_records != null) {
        if (res.scramble_records.length === 0) {
          offset = -1;
        } else {
          scrambleRecords.value.push(...res.scramble_records);
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
  fetch(`list_user_scrambles?puzzle_size=${puzzleSize.value}&offset=${offset}&limit=${limit}&order_field=${sortField}&order_direction=${OrderDirectionMap.get(orderDirection)}`);
};
let scrambleTable: HTMLElement | null;
const onscroll = (_event: Event): void => {
  if (scrambleTable != null && offset !== -1) {
    if (scrambleTable.scrollTop + scrambleTable.offsetHeight >= scrambleTable.scrollHeight - 100) {
      doFetch();
    }
  }
};
onMounted(() => {
  doFetch();
  scrambleTable = document.getElementById('scramble-list-table');
  if (scrambleTable != null) {
    scrambleTable.addEventListener('scroll', onscroll);
  }
});
onUnmounted(() => {
  if (scrambleTable != null) {
    scrambleTable.removeEventListener('scroll', onscroll);
  }
});
watch(puzzleSize, (newValue) => {
  if (newValue !== 0) {
    scrambleRecords.value = [];
    offset = 0;
    fetched.value = false;
    doFetch();
  }
});
const setScramble = (strScramble: string): void => {
  const scramble = convertToNumbersArray(strScramble);
  emit('set', scramble);
};
const doSort = (newSortField: string): void => {
  if (newSortField !== sortField) {
    sortField = newSortField;
    orderDirection = OrderDirection.Asc;
  } else if (orderDirection === OrderDirection.Asc) {
    orderDirection = OrderDirection.Desc;
  } else if (orderDirection === OrderDirection.Desc) {
    orderDirection = OrderDirection.Asc;
  }
  scrambleRecords.value = [];
  offset = 0;
  fetched.value = false;
  doFetch();
};
</script>

<template>
  <div ref="scrambleList" class="scramble-list">
    <p class="header">
      <span>
        Saved Scrambles
      </span>
    </p>
    <PuzzleSizeSlider v-model="puzzleSize" />
    <hr class="nice-hr">
    <div id="scramble-list-table" class="table-wrapper">
      <div class="flex-table table-header">
        <div class="flex-row w-70">
          ID
        </div>
        <div class="flex-row w-160">
          Date
          <span class="pro-sort" @click="doSort('id')">
            {{ sortField !== 'id' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div class="flex-row w-160">
          Best Time
          <span class="pro-sort" @click="doSort('best_time')">
            {{ sortField !== 'best_time' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div class="flex-row w-120">
          Best Moves
          <span class="pro-sort" @click="doSort('best_moves')">
            {{ sortField !== 'best_moves' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
          </span>
        </div>
        <div class="flex-row">
          Scramble
        </div>
        <div class="flex-row w-95">
          Solution
        </div>
        <div class="flex-row w-120">
          Public ID
        </div>
      </div>
      <template v-if="fetched">
        <div
          v-for="(item) in scrambleRecords"
          :key="item.id"
          class="flex-table"
        >
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
              Best Time
              <span class="pro-sort" @click="doSort('best_time')">
                {{ sortField !== 'best_time' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
              </span>
            </div>
            <div class="flex-row">
              Best Moves
              <span class="pro-sort" @click="doSort('best_moves')">
                {{ sortField !== 'best_moves' ? '↑↓' : (orderDirection === OrderDirection.Asc ? '↑' : '↓') }}
              </span>
            </div>
            <div class="flex-row">
              Scramble
            </div>
            <div class="flex-row">
              Solution
            </div>
            <div class="flex-row">
              Public ID
            </div>
          </div>
          <div class="items">
            <div class="flex-row w-70">
              <p class="link-item" @click="setScramble(String(item.scramble))">
                {{ item.id }}
              </p>
            </div>
            <div class="flex-row w-160">
              <span>{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="flex-row w-160">
              <span>{{ item.best_time! / 1000 }} ( {{ item.best_time_moves }} | {{ item.best_tps }})</span>
            </div>
            <div class="flex-row w-120">
              <span>{{ item.best_moves }}</span>
            </div>
            <div class="flex-row smaller-font">
              <div class="copy-button-wrapper">
                <p class="scramble-text">
                  {{ convertScramble(item.scramble) }}
                </p>
                <CopyButton
                  v-if="item.scramble"
                  :item-to-copy="String(item.scramble)"
                  :is-solve-path="false"
                />
              </div>
            </div>
            <div class="flex-row w-95 smaller-font">
              <div class="copy-button-wrapper">
                <CopyButton
                  v-if="item.solve_path"
                  :item-to-copy="String(item.solve_path)"
                  :is-solve-path="true"
                />
              </div>
            </div>
            <div class="flex-row w-120">
              <a :href="`${baseUrl}?playground&public_id=${item.public_id}`" class="link-item">
                {{ item.public_id }}
              </a>
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
.scramble-list {
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
  margin: 4px auto;
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
  padding: 7px 4px;
  overflow: hidden;
  text-align: center;
  border-right: solid 1px var(--table-border-color);
  border-bottom: solid 1px var(--table-border-color);
}
.w-70 {
  max-width: 70px;
}
.w-95 {
  max-width: 95px;
}
.w-120{
  max-width: 120px;
}
.w-160{
  max-width: 160px;
}
.scramble-text {
  margin-right: 5px;
  display: inline;
  font-size: 14px;
  line-height: 25px;
}
.items {
  display: flex;
  flex: 1;
}
.flex-table:first-of-type {
  border-top: solid 1px var(--table-border-color);
}
.table-header-mobile .flex-row, .flex-table:first-of-type .flex-row {
  background: gold;
  color: black;
  font-size: 16px;
  font-weight: 600;
  max-height: 32px;
}
.flex-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
  font-size: 14px;
  padding: 0 5px;
  display: block;
}
.copy-button-wrapper {
  display: inline-block;
}
.copy-button-wrapper :deep(.copy-button) {
  display: inline;
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
@media screen and (max-width: 1100px) {
  .scramble-text {
    display: none;
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
    margin-bottom: 12px;
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
    min-height: 32px;
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
  .w-70 {
    max-width: 180px;
    min-width: 180px;
  }
  .w-95 {
    max-width: 180px;
    min-width: 180px;
  }
  .w-120 {
    max-width: 180px;
    min-width: 180px;
  }
  .w-160 {
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
