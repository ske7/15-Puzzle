<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside, useDateFormat } from '@vueuse/core';
import { useBaseStore } from '../stores/base';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import { type UserStats } from '../stores/const';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';

const emit = defineEmits<{ close: [] }>();

const userAccount = ref<HTMLElement>();
onClickOutside(userAccount, (event) => {
  event.stopPropagation();
  emit('close');
});

const baseStore = useBaseStore();

const errorMsg = ref('');
const userData = ref<UserStats>();
const fetch = (endpoint: string): void => {
  errorMsg.value = '';
  if (baseStore.isFetching) {
    return;
  }
  baseStore.isFetching = true;
  useGetFetchAPI(endpoint, baseStore.token as (string | undefined))
    .then(res => {
      baseStore.isFetching = false;
      userData.value = res.stats;
    })
    .catch(error => {
      errorMsg.value = error as string;
      if (String(errorMsg.value).toLowerCase().includes('networkerror')) {
        baseStore.isNetworkError = true;
      }
      baseStore.isFetching = false;
    });
};
fetch('current_user_stats');

const formatDate = (date: string): string => {
  return useDateFormat(date, 'MMM D, YYYY').value;
};
const formatDate2 = (date: string): string => {
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

const puzzleSize = ref<number>(baseStore.numLines);
const puzzleMode = ref<string>(baseStore.marathonMode ? 'marathon' : 'standard');
const filteredRecords = computed(() => {
  return userData.value?.user_records.filter((value) => {
    return value.puzzle_size === Number(puzzleSize.value) && value.puzzle_type === puzzleMode.value;
  });
});
const bestRecords = computed(() => {
  return filteredRecords.value?.filter((value) => {
    return ['time', 'moves'].includes(value.record_type);
  });
});
const averagesRecords = computed(() => {
  return filteredRecords.value?.filter((value) => {
    return ['ao5', 'ao12', 'ao50', 'ao100'].includes(value.record_type);
  })
    .sort((a, b) => {
      const avgTypeOrder = ['ao5', 'ao12', 'ao50', 'ao100'];
      const getTypeIndex = (record_type: string): number => {
        return avgTypeOrder.indexOf(record_type);
      };
      return (getTypeIndex(a.record_type) - getTypeIndex(b.record_type));
    });
});
</script>

<template>
  <Teleport to="body">
    <div v-if="!baseStore.isFetching && userData" ref="userAccount" class="user-account">
      <p class="header">
        <span>Your stats and personal records</span>
      </p>
      <div v-if="!baseStore.isFetching && userData">
        <p><strong>Name:</strong> {{ baseStore.userName }}</p>
        <p><strong>Registration date:</strong> {{ formatDate(userData.user_data.created_at) }}</p>
        <p><strong>Num games:</strong> {{ userData?.user_data.num_finished_games || 0 }}</p>
        <p><strong>Play time:</strong> {{ formatPlayTime }}</p>
      </div>
      <PuzzleSizeSlider v-model="puzzleSize" />
      <PuzzleModeGroup v-model="puzzleMode" :choices="['standard', 'marathon']" :header="'Puzzle Mode'" />
      <div class="table-container">
        <table class="items-table">
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
                {{ item.record_type }}
              </td>
              <td class="w-75">
                {{ item.record_type === 'time' ? (item.time / 1000) : item.moves }}
              </td>
              <td class="w-65">
                {{ item.tps }}
              </td>
              <td>{{ formatDate2(item.created_at) }}</td>
              <td class="w-28">
                {{ item.control_type.slice(0, 1) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-container">
        <table class="items-table">
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
              <td>{{ item.avg_time }}</td>
              <td>{{ item.avg_moves }}</td>
              <td>{{ item.avg_tps }}</td>
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
.user-account {
  --modal-width: 360px;
  display: flex;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  min-height: 500px;
  width: var(--modal-width);
  position: fixed;
  z-index: 2000;
  top: 40px;
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
  box-shadow: 0 8px 16px var(--shadow-color);
}
.user-account strong {
  font-weight: 600;
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
  min-height: 58px;
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
}
.items-table td {
  padding: 5px 0 5px 5px;
  min-width: 55px;
  border: 1px solid var(--table-border-color);
  border-top: 0px;
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
  min-width: 65px;
  width: 65px;
}
.puzzle-size-slider-container {
  max-width: 250px;
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
  .user-account {
    top: 0px;
  }
  .items-table tbody {
    max-height: 55px;
    overflow-y: auto;
  }
}
</style>
