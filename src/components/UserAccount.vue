<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDateFormat } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';
import { useLazyComponent } from '../composables/useLazyComponent';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';
import { useSingleFetch } from '../composables/useSingleFetch';
import { isSingleUserRecord, isAverageUserRecord } from '@/types';
const GamesTable = useLazyComponent(() => import('./GamesTable.vue'));

const emit = defineEmits<{ close: [] }>();

const userAccount = ref<HTMLElement>();
const showGamesTable = ref(false);
useCloseOnClickOutside(userAccount, () => emit('close'), () => showGamesTable.value);

const baseStore = useBaseStore();

const { data: userData } = useSingleFetch('current_user_stats', (res) => res.stats);

const formatDate = (date: string): string => {
  return useDateFormat(date, 'MMM D, YYYY').value;
};
const formatDate2 = (date?: string): string => {
  if (date == null) {
    return '';
  }
  return useDateFormat(date, 'DD/MM/YY').value;
};
const formatPlayTime = computed(() => {
  let playTime = userData.value?.user_data.play_time;
  if (playTime == null) {
    return '0';
  }
  const hour = Math.floor(playTime / (1000 * 60 * 60)).toFixed(0);
  playTime = playTime - Number(hour) * 1000 * 60 * 60;
  const min = Math.floor(playTime / (1000 * 60)).toFixed(0);
  playTime = playTime - Number(min) * 1000 * 60;
  const sec = Math.floor(playTime / 1000).toFixed(0);
  playTime = playTime - Number(sec) * 1000;
  const ms = playTime;
  return `${hour}h ${min}m ${sec}s ${ms}ms`;
});

const puzzleSize = ref(baseStore.numLines);
const puzzleMode = ref(baseStore.marathonMode ? 'marathon' : 'standard');
const filteredRecords = computed(() => {
  return userData.value?.user_records.filter((value) => {
    return value.puzzle_size === puzzleSize.value && value.puzzle_type === puzzleMode.value;
  });
});
const bestRecords = computed(() => {
  return filteredRecords.value?.filter(isSingleUserRecord);
});
const averagesRecords = computed(() => {
  return filteredRecords.value?.filter(isAverageUserRecord)
    .sort((a, b) => {
      const avgTypeOrder = ['ao5', 'ao12', 'ao50', 'ao100'];
      const getTypeIndex = (record_type: string): number => {
        return avgTypeOrder.indexOf(record_type);
      };
      return (getTypeIndex(a.record_type) - getTypeIndex(b.record_type));
    });
});
const closeGamesTable = (): void => {
  showGamesTable.value = false;
};
</script>

<template>
  <Teleport to="body">
    <div v-if="!baseStore.isFetching && userData" ref="userAccount" class="user-account modal-shell modal-centered">
      <p class="header modal-header">
        <span id="user-account-caption">Your personal records</span>
      </p>
      <div v-if="!baseStore.isFetching && userData" class="user-info">
        <p><strong>Name:</strong> {{ baseStore.userName }}</p>
        <p><strong>Registration date:</strong> {{ formatDate(userData.user_data.created_at) }}</p>
        <p>
          <strong>Num games:</strong> {{ userData?.user_data.num_finished_games || 0 }}
          <span class="last-games" @click="showGamesTable=true">(your games)</span>
        </p>
        <p><strong>Play time:</strong> {{ formatPlayTime }}</p>
      </div>
      <PuzzleSizeSlider v-model="puzzleSize" />
      <PuzzleModeGroup v-model="puzzleMode" :choices="['standard', 'marathon']" header="Puzzle Mode" />
      <div class="table-container">
        <table class="items-table" aria-describedby="user-account-caption">
          <thead>
            <tr>
              <th class="w-65">
                Best
              </th>
              <th class="w-75">
                Value
              </th>
              <th class="w-65">
                TPS
              </th>
              <th>Date</th>
              <th class="w-28">
                By
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item) in bestRecords" :key="item.id">
              <td class="w-65">
                {{ item.record_type === 'fmc_blitz_moves' ? 'FMC' : item.record_type }}
              </td>
              <td class="w-75">
                {{ item.record_type === 'time' ? (item.time / 1000) : item.moves }}
              </td>
              <td class="w-65">
                {{ item.tps }}
              </td>
              <td>{{ formatDate2(item.created_at) }}</td>
              <td class="w-28">
                {{ item.control_type?.slice(0, 1) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-container">
        <table class="items-table" aria-describedby="user-account-caption">
          <thead>
            <tr>
              <th>Best Avg</th>
              <th>Time</th>
              <th>Moves</th>
              <th>TPS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item) in averagesRecords" :key="item.id">
              <td>{{ item.record_type }}</td>
              <td>
                {{ item.avg_time }}
              </td>
              <td>
                {{ item.avg_moves }}
              </td>
              <td>
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
  <GamesTable v-if="showGamesTable" form-type="userGames" @close="closeGamesTable" />
</template>

<style scoped>
.user-account {
  --modal-width: 390px;
  min-height: min(500px, 100dvh);
  width: var(--modal-width);
  z-index: var(--z-modal);
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
}
.user-account strong {
  font-weight: 600;
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
  min-height: 58px;
}
.items-table {
  max-width: 100%;
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  margin-bottom: 10px;
  font-family: var(--font-mono);
  font-kerning: none;
  line-height: 1.1;
}
.items-table thead {
  font-size: 16px;
  text-align: left;
  background-color: gold;
}
.items-table thead th {
  padding: 5px 3px 5px 5px;
  color: black;
  min-width: 55px;
  border: 1px solid var(--table-border-color);
}
.table-container table thead, table tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.items-table tbody {
  font-size: 16px;
  text-align: left;
  display: block;
  min-height: 57px;
}
.items-table td {
  padding: 5px 0 5px 5px;
  min-width: 55px;
  border: 1px solid var(--table-border-color);
  border-top: 0;
}
.items-table .w-28 {
  min-width: 28px;
  width: 28px;
}
.items-table .w-75 {
  min-width: 75px;
  width: 75px;
}
.items-table .w-65 {
  min-width: 66px;
  width: 66px;
}
.puzzle-size-slider-container {
  max-width: 250px;
}
.last-games {
  color: var(--link-color);
  text-decoration: underline;
}
.last-games:hover {
  color: var(--text-color);
  cursor: pointer;
}
@media screen and (max-width: 420px) {
  .user-account {
    --modal-width: 340px;
  }
  .items-table thead {
    font-size: 15px;
  }
  .items-table tbody {
    font-size: 15px;
  }
  .items-table .w-65 {
    min-width: 63px;
    width: 63px;
  }
  .items-table .w-75 {
    min-width: 65px;
    width: 65px;
  }
}
@media screen and (max-height: 650px) and (max-width: 950px) {
  .items-table tbody {
    max-height: 57px;
    overflow-y: auto;
  }
}
@media screen and (max-width: 350px) {
  .user-account {
    padding: 10px 20px;
  }
  .user-info p {
    line-height: 1.5;
    font-size: 15px;
  }
}
</style>
