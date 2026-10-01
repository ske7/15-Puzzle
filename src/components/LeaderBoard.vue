<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useBaseStore } from '../stores/base';
import PuzzleSizeSlider from './PuzzleSizeSlider.vue';
import PuzzleModeGroup from './PuzzleModeGroup.vue';
import {
  type UserRecord, type SingleUserRecord, type AverageUserRecord,
  isSingleUserRecord, isAverageUserRecord
} from '@/types';
import { baseUrl, fmcBlitzCores } from '@/const';
import { useLazyComponent } from '../composables/useLazyComponent';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';
import { useSingleFetch } from '../composables/useSingleFetch';
const GamesTable = useLazyComponent(() => import('./GamesTable.vue'));

const props = defineProps<{ formType: string }>();
const emit = defineEmits<{ close: [] }>();

const leaderBoard = ref<HTMLElement>();
const showGamesTable = ref(false);
useCloseOnClickOutside(leaderBoard, () => emit('close'), () => showGamesTable.value);

const baseStore = useBaseStore();

const isDefault = computed(() => {
  return props.formType === 'default';
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const { data: userRecords } = useSingleFetch(
  props.formType === 'default' ? 'stats' : 'stats?avg=1',
  (res) => res.records
);

const puzzleSize = ref(baseStore.numLines);
const puzzleMode = ref(baseStore.marathonMode ? 'marathon' : 'standard');
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const bestType = ref(props.formType === 'default' ? 'time' : 'ao5');
const bestAverage = ref('time');

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
const compare = (x: number, y: number): number => {
  if (x === y) {
    return 0;
  } else {
    return x > y ? -1 : 1;
  }
};

const sortSingleRecords = (a: SingleUserRecord, b: SingleUserRecord): number => {
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
const sortTimeAverages = (a: AverageUserRecord, b: AverageUserRecord): number => {
  const diff = compare(infNumber(b.avg_time), infNumber(a.avg_time));
  if (diff !== 0) {
    return diff;
  }
  return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
};
const sortMovesAverages = (a: AverageUserRecord, b: AverageUserRecord): number => {
  const diff = compare(infNumber(b.avg_moves), infNumber(a.avg_moves));
  if (diff !== 0) {
    return diff;
  }
  return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
};
const sortTPSAverages = (a: AverageUserRecord, b: AverageUserRecord): number => {
  const diff = compare(infNumber(a.avg_tps, true), infNumber(b.avg_tps, true));
  if (diff !== 0) {
    return diff;
  }
  return compare(new Date(b.updated_at!).getTime(), new Date(a.updated_at!).getTime());
};
const sortAveragesRecords = (a: AverageUserRecord, b: AverageUserRecord): number => {
  if (bestAverage.value === 'time') {
    return sortTimeAverages(a, b);
  } else if (bestAverage.value === 'moves') {
    return sortMovesAverages(a, b);
  } else if (bestAverage.value === 'TPS') {
    return sortTPSAverages(a, b);
  }
  return Number(a.avg_time) - Number(b.avg_time);
};
const singleRecords = computed(() => {
  if (userRecords.value == null || userRecords.value.length === 0) {
    return [];
  }
  return userRecords.value.filter((value): value is SingleUserRecord => {
    return isSingleUserRecord(value) &&
      value.puzzle_size === puzzleSize.value &&
      value.puzzle_type === puzzleMode.value &&
      value.record_type === bestType.value;
  }).sort(sortSingleRecords);
});
const averageRecords = computed(() => {
  if (userRecords.value == null || userRecords.value.length === 0) {
    return [];
  }
  return userRecords.value.filter((value): value is AverageUserRecord => {
    return isAverageUserRecord(value) &&
      value.puzzle_size === puzzleSize.value &&
      value.puzzle_type === puzzleMode.value &&
      value.record_type === bestType.value;
  }).sort(sortAveragesRecords);
});
const filteredRecords = computed((): UserRecord[] => {
  return isDefault.value ? singleRecords.value : averageRecords.value;
});
let scrollbarWidth = 17;
onMounted(() => {
  const tbody = document.querySelector<HTMLElement>('.records-tbody');
  if (tbody) {
    scrollbarWidth = tbody.offsetWidth - tbody.clientWidth;
  }
});
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
const recordId = ref(0);
const avgType = ref('');
const recordFormType = ref('');
const doShowAvgGames = (id: number, type: string): void => {
  recordId.value = id;
  recordFormType.value = 'avgGames';
  avgType.value = type;
  showGamesTable.value = true;
};
const doShowFMCBlitzGames = (id: number): void => {
  recordId.value = id;
  recordFormType.value = 'fmcBlitzGames';
  showGamesTable.value = true;
};
const closeGamesTable = (): void => {
  showGamesTable.value = false;
};
</script>

<template>
  <Teleport to="body">
    <div v-if="!baseStore.isFetching" ref="leaderBoard" class="leaderboard modal-shell modal-centered">
      <p class="header modal-header">
        <span id="leaderboard-caption">
          {{ isDefault ? 'Leaderboard' : 'Best Averages' }}
        </span>
      </p>
      <PuzzleSizeSlider v-model="puzzleSize" />
      <PuzzleModeGroup v-model="puzzleMode" :choices="['standard', 'marathon']" header="Puzzle Mode" />
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
          <tbody class="records-tbody">
            <tr v-for="(item, index) in singleRecords.slice(0, 1000)" :key="item.id">
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
              <td v-if="bestType === 'moves'" class="min-width w-70">
                <a v-if="item.scramble" :href="`${baseUrl}?game_id=${item.public_id}`" class="link-item">
                  {{ item.moves }}
                </a>
                <span v-else>
                  {{ item.moves }}
                </span>
              </td>
              <td
                v-if="bestType === 'fmc_blitz_moves'"
                class="min-width w-70 link-item"
                @click="doShowFMCBlitzGames(item.record_id)"
              >
                {{ item.moves }}
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
              <th class="w-35">
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
          <tbody class="records-tbody">
            <tr v-for="(item, index) in averageRecords.slice(0, 1000)" :key="item.id">
              <td class="w-35">
                {{ index + 1 }}
              </td>
              <td class="w-160 t-overflow">
                {{ item.name }}
              </td>
              <td
                v-if="bestAverage === 'time'"
                class="min-width link-item"
                @click="doShowAvgGames(item.record_id, 'time')"
              >
                {{ item.avg_time }}
              </td>
              <td
                v-if="bestAverage === 'moves'"
                class="min-width link-item"
                @click="doShowAvgGames(item.record_id, 'moves')"
              >
                {{ item.avg_moves }}
              </td>
              <td
                v-if="bestAverage === 'TPS'"
                class="min-width link-item"
                @click="doShowAvgGames(item.record_id, 'tps')"
              >
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
    <GamesTable
      v-if="showGamesTable"
      :form-type="recordFormType"
      :record-id="recordId"
      :avg-type="avgType"
      :record-puzzle-size="puzzleSize"
      @close="closeGamesTable"
    />
  </Teleport>
</template>

<style scoped>
.leaderboard {
  --modal-width: 400px;
  justify-content: center;
  min-height: min(v-bind(minHeight), 100dvh);
  width: var(--modal-width);
  z-index: var(--z-modal);
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
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
  border-collapse: collapse;
  border-spacing: 0;
  margin-bottom: 10px;
  font-family: var(--font-mono);
  font-kerning: none;
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
}
.items-table td {
  padding: 3px 4px;
  border: 1px solid var(--table-border-color);
  border-top: 0;
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
.w-35 {
  width: 35px;
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
@media (pointer: coarse) {
  td > .link-item {
    padding: 2px 6px;
    margin: 0 -6px;
  }
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
    min-height: min(488px, 100dvh);
  }
  .table-container {
    min-height: 156.4px;
  }
  .table-container .items-table tbody {
    max-height: 117px;
  }
}
</style>
