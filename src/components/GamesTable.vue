<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { onClickOutside, useDateFormat } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import { type GameData } from '@/types';
import { shortenSolutionStr, convertScramble } from '@/utils';
import CopyButton from './CopyButton.vue';

const baseUrl: string = import.meta.env.VITE_BASE_URL;
const emit = defineEmits<{ close: [] }>();

const gamesTable = ref<HTMLElement>();
onClickOutside(gamesTable, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();

const puzzleSize = ref<number>(baseStore.numLines);

const errorMsg = ref('');
const gameRecords = ref<GameData[]>();
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
      gameRecords.value = res.game_records;
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
onMounted(() => {
  fetch(`user_games?puzzle_size=${puzzleSize.value}`);
});
watch(puzzleSize, (newValue) => {
  if (newValue !== 0) {
    fetch(`user_games?puzzle_size=${newValue}`);
  }
});
</script>

<template>
  <div ref="gamesTable" class="games-table">
    <p class="header">
      <span>
        Your Games
      </span>
    </p>
    <PuzzleSizeSlider v-model="puzzleSize" />
    <div v-if="fetched" class="table-wrapper">
      <div class="flex-table table-header">
        <div class="flex-row w-70">
          ID
        </div>
        <div class="flex-row w-95">
          Date
        </div>
        <div class="flex-row w-70">
          Time
        </div>
        <div class="flex-row w-70">
          Moves
        </div>
        <div class="flex-row w-70">
          TPS
        </div>
        <div class="flex-row">
          Scramble
        </div>
        <div class="flex-row">
          Solution
        </div>
      </div>
      <div v-for="(item) in gameRecords" :key="item.id" class="flex-table">
        <div class="table-header-mobile">
          <div class="flex-row">
            ID
          </div>
          <div class="flex-row">
            Date
          </div>
          <div class="flex-row">
            Time
          </div>
          <div class="flex-row">
            Moves
          </div>
          <div class="flex-row">
            TPS
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
            <a v-if="item.scramble" :href="`${baseUrl}?game_id=${item.id}`">{{ item.id }}</a>
            <span v-else>{{ item.id }}</span>
          </div>
          <div class="flex-row w-95">
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <div class="flex-row w-70">
            <span>{{ item.time / 1000 }}</span>
          </div>
          <div class="flex-row w-70">
            <span>{{ item.moves }}</span>
          </div>
          <div class="flex-row w-70">
            <span>{{ item.tps }}</span>
          </div>
          <div class="flex-row smaller-font">
            <div class="copy-button-wrapper">
              <span>{{ convertScramble(item.scramble) }}</span>
              <CopyButton
                v-if="item.scramble"
                :item-to-copy="String(item.scramble)"
                :is-solve-path="false"
              />
            </div>
          </div>
          <div class="flex-row smaller-font">
            <div class="copy-button-wrapper">
              <span>{{ shortenSolutionStr(item.solve_path) }}</span>
              <CopyButton
                v-if="item.solve_path"
                :item-to-copy="String(item.solve_path)"
                :is-solve-path="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="buttons">
      <button type="button" class="tool-button" @click="emit('close')">
        OK
      </button>
    </div>
  </div>
</template>

<style scoped>
.games-table {
  --modal-width: 1000px;
  display: flex;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  width: var(--modal-width);
  position: fixed;
  z-index: 2005;
  top: 40px;
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
.table-wrapper {
  display: block;
  margin: 5px auto;
  width: 100%;
  max-width: 95%;
  max-height: 418px;
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
  padding: 8px 4px;
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
  max-height: 50px;
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
  display: flex;
  align-items: center;
  gap: 5px;
  flex-direction: column;
}
@media screen and (max-width: 1000px) {
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
    border-bottom: solid 0px var(--table-border-color);
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
  .w-70 {
    max-width: 180px;
    min-width: 180px;
  }
  .w-95 {
    max-width: 180px;
    min-width: 180px;
  }
  .flex-row span {
    max-width: 180px;
    min-width: 180px;
  }
  .smaller-font span {
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
