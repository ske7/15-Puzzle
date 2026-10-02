<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import { type TableColumn, type UserScrambleData } from '@/types';
import { baseUrl, OrderDirection, OrderDirectionMap } from '@/const';
import { convertScramble, convertToNumbersArray } from '@/utils';
import CopyButton from './CopyButton.vue';
import { usePaginatedFetch } from '../composables/usePaginatedFetch';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';

const emit = defineEmits<{ close: []; set: [scramble: number[]] }>();

const scrambleList = ref<HTMLElement>();
useCloseOnClickOutside(scrambleList, () => emit('close'));

const baseStore = useBaseStore();
const puzzleSize = ref(baseStore.numLines);

const buildScrambleUrl = (
  offset: number,
  limit: number,
  sortField: string,
  orderDirection: OrderDirection
): string => {
  const direction = OrderDirectionMap.get(orderDirection);
  return `list_user_scrambles?puzzle_size=${puzzleSize.value}&offset=${offset}&limit=${limit}&order_field=${sortField}&order_direction=${direction}`;
};

const {
  records: scrambleRecords,
  fetched,
  reset,
  formatDate,
  formatShortDate,
  columnClass,
  sort,
  sortArrow,
  sortField
} = usePaginatedFetch<UserScrambleData>(buildScrambleUrl, (res) => res.scramble_records ?? [], 'scramble-list-table');

watch(puzzleSize, () => {
  if (['opt_diff', 'optimal_moves'].includes(sortField.value)) {
    sortField.value = 'best_moves';
  }
  reset();
});

const setScramble = (strScramble: string): void => {
  const scramble = convertToNumbersArray(strScramble);
  emit('set', scramble);
};

const doSort = (newSortField: string): void => {
  sort(newSortField);
};

const columns = computed((): TableColumn[] => {
  return [
    { label: 'ID', widthClass: 'w-70' },
    { label: 'Date', sortField: 'id', widthClass: 'w-150' },
    { label: 'Time', sortField: 'best_time', widthClass: 'w-130' },
    { label: 'Moves', sortField: 'best_moves', widthClass: 'w-90' },
    ...(puzzleSize.value === 3
      ? [
          { label: 'Opt.', sortField: 'optimal_moves', widthClass: 'w-70' },
          { label: 'Diff', sortField: 'opt_diff', widthClass: 'w-70' }
        ]
      : []),
    { label: 'Scramble' },
    { label: 'Solution', widthClass: 'w-85' },
    { label: 'Public ID', widthClass: 'w-120' }
  ];
});

</script>

<template>
  <div ref="scrambleList" class="scramble-list modal-shell">
    <p class="header modal-header">
      <span>
        Saved Scrambles
      </span>
    </p>
    <PuzzleSizeSlider v-model="puzzleSize" />
    <hr class="nice-hr">
    <div id="scramble-list-table" class="table-wrapper">
      <div class="flex-table table-header">
        <div
          v-for="column in columns"
          :key="column.label"
          class="flex-row"
          :class="[column.widthClass, columnClass(column.label)]"
        >
          {{ column.label }}
          <span v-if="column.sortField" class="pro-sort" @click="doSort(column.sortField)">
            {{ sortArrow(column.sortField) }}
          </span>
        </div>
      </div>
      <template v-if="fetched">
        <div v-for="(item) in scrambleRecords" :key="item.id" class="flex-table">
          <div class="items">
            <div class="flex-row w-70 col-id">
              <p class="link-item" @click="setScramble(String(item.scramble))">
                {{ item.id }}
              </p>
            </div>
            <div class="flex-row w-150 col-date">
              <span class="date-full">{{ formatDate(item.created_at) }}</span>
              <span class="date-short">{{ formatShortDate(item.created_at) }}</span>
            </div>
            <div class="flex-row w-130 column-direction col-time">
              <span>{{ item.best_time! / 1000 }}</span>
              <span>( {{ item.best_time_moves }} | {{ item.best_tps }})</span>
            </div>
            <div class="flex-row w-90 col-moves">
              <span>{{ item.best_moves }}<sup
                v-if="puzzleSize === 3 && (item.opt_diff ?? 0) > 0"
                class="opt-moves"
              >+{{ item.opt_diff }}</sup></span>
            </div>
            <div v-if="puzzleSize === 3" class="flex-row w-70 col-opt">
              <span>{{ item.optimal_moves }}</span>
            </div>
            <div v-if="puzzleSize === 3" class="flex-row w-70 col-diff">
              <span v-if="(item.opt_diff ?? 0) > 0">+{{ item.opt_diff }}</span>
            </div>
            <div class="flex-row smaller-font col-scramble">
              <div class="copy-button-wrapper">
                <p class="scramble-text">
                  {{ convertScramble(item.scramble) }}
                </p>
                <CopyButton v-if="item.scramble" :item-to-copy="String(item.scramble)" :is-solve-path="false" />
              </div>
            </div>
            <div class="flex-row w-85 smaller-font col-solution">
              <div class="copy-button-wrapper">
                <CopyButton v-if="item.solve_path" :item-to-copy="String(item.solve_path)" :is-solve-path="true" />
              </div>
            </div>
            <div class="flex-row w-120 col-public-id">
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
  height: 100dvh;
  width: var(--modal-width);
  z-index: var(--z-modal-table);
  top: 0;
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
  line-height: 1.3;
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
  margin: 4px auto;
  width: 100%;
  border: none;
  border-top: 1px solid var(--table-border-color);
  height: 0;
}
.table-wrapper {
  margin: 4px auto;
  width: 100%;
  max-width: 95%;
  overflow: auto;
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
.w-85 {
  max-width: 85px;
}
.w-90 {
  max-width: 90px;
}
.w-120 {
  max-width: 120px;
}
.w-130 {
  max-width: 130px;
}
.w-150 {
  max-width: 150px;
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
.flex-table:first-of-type .flex-row {
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
}
.copy-button-wrapper :deep(.copy-button) {
  --vd-font-size: 13px;
  --vh-font-size: 14px;
}
.link-item {
  font-size: 14px;
  font-weight: 600;
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
.column-direction {
  flex-direction: column;
}
.date-short,
.opt-moves {
  display: none;
}
.opt-moves {
  margin-left: 1px;
  color: var(--link-color);
  font-size: 10px;
}
@media screen and (max-width: 1100px) {
  .scramble-list {
    --modal-width: 100%;
  }
  .scramble-text {
    display: none;
  }
  .nice-hr {
    display: none;
  }
  .table-wrapper {
    max-width: 100%;
  }
  .w-70, .w-85, .w-90, .w-120, .w-130, .w-150 {
    max-width: 100%;
  }
  .col-moves {
    flex-grow: 1.15;
  }
  .col-public-id a {
    overflow-wrap: anywhere;
  }
}
@media screen and (max-width: 600px) {
  .scramble-list {
    padding: 15px 8px;
  }
  .table-header {
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .flex-row {
    min-height: 40px;
    padding: 4px 2px;
  }
  .flex-table:first-of-type .flex-row {
    flex-direction: column;
    max-height: none;
    font-size: 12px;
  }
  .flex-row span,
  .link-item {
    padding: 0;
    font-size: 12px;
  }
  .pro-sort {
    font-size: 12px !important;
  }
  .col-id {
    flex: 0 0 36px;
  }
  .col-date {
    flex: 0 0 58px;
  }
  .col-time {
    flex-grow: 1.4;
  }
  .col-opt,
  .col-diff {
    display: none;
  }
  .flex-row .opt-moves {
    display: inline;
  }
  .col-scramble,
  .col-solution {
    flex: 0 0 34px;
  }
  .col-public-id {
    flex: 0 0 54px;
  }
  .flex-table.table-header .flex-row.col-scramble,
  .flex-table.table-header .flex-row.col-solution,
  .flex-table.table-header .flex-row.col-public-id {
    font-size: 0;
  }
  .table-header .col-scramble::after {
    content: 'Scr';
    font-size: 12px;
  }
  .table-header .col-solution::after {
    content: 'Sol';
    font-size: 12px;
  }
  .table-header .col-public-id::after {
    content: 'Link';
    font-size: 12px;
  }
  .date-full {
    display: none;
  }
  .flex-row .date-short {
    display: inline;
    white-space: normal;
  }
}
@media screen and (max-width: 380px) {
  .flex-table:first-of-type .flex-row {
    font-size: 11px;
  }
}
@media screen and (max-width: 350px) {
  .flex-row span,
  .link-item {
    font-size: 11px;
  }
  .col-id {
    flex-basis: 32px;
  }
  .col-date {
    flex-basis: 50px;
  }
  .col-scramble,
  .col-solution {
    flex-basis: 28px;
  }
  .col-public-id {
    flex-basis: 48px;
  }
}
</style>
