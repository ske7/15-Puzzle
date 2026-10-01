<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import { type LiveRecord, type UserStats } from '@/types';
import { baseUrl } from '@/const';
import { createLinkAndClick, displayedTime, timeAgo } from '@/utils';
import { useBaseStore } from '../stores/base';
import { getErrorMessage, useGetFetchAPI } from '../composables/useFetchAPI';
import { usePaginatedFetch } from '../composables/usePaginatedFetch';
import { useCloseOnClickOutside } from '../composables/useCloseOnClickOutside';
import { useLazyComponent } from '../composables/useLazyComponent';
const GamesTable = useLazyComponent(() => import('./GamesTable.vue'));

const REFRESH_MS = 30000;

const emit = defineEmits<{ close: [] }>();

const baseStore = useBaseStore();
const liveRecords = ref<HTMLElement>();
const showGamesTable = ref(false);
useCloseOnClickOutside(liveRecords, () => emit('close'), () => showGamesTable.value);

const { records, errorMsg, isFetching, fetched, formatDate } = usePaginatedFetch<LiveRecord, LiveRecord>(
  (offset, limit) => `sorted_records?offset=${offset}&limit=${limit}`,
  (res) => res.records ?? [],
  'live-records-list',
  true,
  false,
  100
);

// Records that arrived while the list was open: shown ones on top, held ones behind the
// "new records" line so the rows under the reader's eyes never jump.
const arrived = ref<LiveRecord[]>([]);
const held = ref<LiveRecord[]>([]);
const now = ref(Date.now());

const shownRecords = computed((): LiveRecord[] => {
  const seen = new Set<number>();
  // Later pages can repeat a record once new ones shift the server-side offsets.
  return [...arrived.value, ...records.value].filter((record) => {
    if (seen.has(record.record_id)) {
      return false;
    }
    seen.add(record.record_id);
    return true;
  });
});

// Reads, and with an argument sets, how far the list is scrolled. The element is there for as
// long as the modal is, so the missing-element path cannot be reached from the app.
const listScroll = (to?: number): number => {
  const list = document.getElementById('live-records-list');
  /* v8 ignore next 3 */
  if (list === null) {
    return 0;
  }
  if (to !== undefined) {
    list.scrollTop = to;
  }
  return list.scrollTop;
};
const isAtTop = (): boolean => listScroll() <= 4;

const visibility = useDocumentVisibility();

const refresh = async (): Promise<void> => {
  now.value = Date.now();
  if (visibility.value !== 'visible' || shownRecords.value.length === 0) {
    return;
  }
  const newest = shownRecords.value[0];
  try {
    const res = await useGetFetchAPI<UserStats, LiveRecord>('sorted_records?offset=0&limit=20', baseStore.token);
    const known = new Set(shownRecords.value.map((record) => record.record_id));
    const fresh = (res.records ?? []).filter((record) => {
      return !known.has(record.record_id) && record.effective_updated_at > newest.effective_updated_at;
    });
    if (fresh.length === 0) {
      return;
    }
    if (isAtTop()) {
      arrived.value = [...fresh, ...arrived.value];
    } else {
      held.value = [...fresh, ...held.value];
    }
  } catch {
    // A failed refresh keeps the records already listed; the next one tries again.
  }
};
useIntervalFn(() => { void refresh() }, REFRESH_MS);

const showHeld = (): void => {
  arrived.value = [...held.value, ...arrived.value];
  held.value = [];
  listScroll(0);
};

const recordKind = (record: LiveRecord): string => {
  if (record.record_type === 'time' || record.record_type === 'moves') {
    return 'single';
  }
  if (record.record_type === 'fmc_blitz_moves') {
    return 'FMC blitz';
  }
  return record.record_type;
};

// Marathon is marked "M" to keep the column narrow; the cell's title spells it out.
const recordLabel = (record: LiveRecord): string => {
  const marathon = record.puzzle_type === 'marathon' ? ' M' : '';
  return `${record.puzzle_size}x${record.puzzle_size}${marathon} ${recordKind(record)}`;
};

const recordTitle = (record: LiveRecord): string => {
  const marathon = record.puzzle_type === 'marathon' ? ' marathon' : '';
  return `${record.puzzle_size}x${record.puzzle_size}${marathon} ${recordKind(record)}`;
};

const isAverage = (record: LiveRecord): boolean => record.record_type.startsWith('ao');

const improvedValue = (record: LiveRecord, field: string): string => {
  if (field === 'time') {
    return `${isAverage(record) ? record.avg_time : displayedTime(Number(record.time))}s`;
  }
  if (field === 'moves') {
    return `${isAverage(record) ? record.avg_moves : record.moves} moves`;
  }
  return `${record.avg_tps} TPS`;
};

// update_info names what the record improved, e.g. "single: time" or "average: time, moves, tps".
const improvedValues = (record: LiveRecord): { field: string; text: string }[] => {
  return record.update_info.replace(/^[^:]*:\s*/, '').split(/,\s*/)
    .map((field) => ({ field, text: improvedValue(record, field) }));
};

const isFmcBlitz = (record: LiveRecord): boolean => record.record_type === 'fmc_blitz_moves';
// Averages and fmc blitz open their games; a single opens its own game, like on the leaderboard.
const opensGamesTable = (record: LiveRecord): boolean => isAverage(record) || isFmcBlitz(record);

const gamesFormType = ref('');
const gamesRecordId = ref(0);
const gamesAvgType = ref('');
const gamesPuzzleSize = ref(0);
const showGames = (record: LiveRecord, field: string): void => {
  gamesFormType.value = isFmcBlitz(record) ? 'fmcBlitzGames' : 'avgGames';
  gamesRecordId.value = record.record_id;
  gamesAvgType.value = field;
  gamesPuzzleSize.value = record.puzzle_size;
  showGamesTable.value = true;
};
const closeGamesTable = (): void => {
  showGamesTable.value = false;
};

const openingGame = ref(false);
// A single record's game is only known by public_id, which is fetched when the row is clicked.
const openGame = async (record: LiveRecord): Promise<void> => {
  if (openingGame.value) {
    return;
  }
  openingGame.value = true;
  errorMsg.value = '';
  try {
    const res = await useGetFetchAPI(`record_public_id?record_id=${record.record_id}`, baseStore.token);
    if (res.public_id == null) {
      errorMsg.value = 'Could not find the game of this record';
      return;
    }
    createLinkAndClick(`${baseUrl}?game_id=${res.public_id}`, true, liveRecords.value);
  } catch (error: unknown) {
    errorMsg.value = getErrorMessage(error);
  } finally {
    openingGame.value = false;
  }
};

const openRecord = (record: LiveRecord, field: string): void => {
  if (opensGamesTable(record)) {
    showGames(record, field);
    return;
  }
  void openGame(record);
};
</script>

<template>
  <Teleport to="body">
    <div ref="liveRecords" class="live-records modal-shell modal-centered">
      <p class="header modal-header">
        <span id="live-records-caption">Live Records</span>
      </p>
      <p v-if="errorMsg" class="error-msg">
        {{ errorMsg }}
      </p>
      <p v-if="held.length > 0" class="new-records">
        <span class="link-item" @click="showHeld">
          {{ held.length }} new record{{ held.length === 1 ? '' : 's' }} - show
        </span>
      </p>
      <div id="live-records-list" class="records-list">
        <table class="items-table" aria-describedby="live-records-caption">
          <colgroup>
            <col class="w-when">
            <col>
            <col class="w-record">
            <col class="w-result">
          </colgroup>
          <thead>
            <tr>
              <th>When</th>
              <th>Player</th>
              <th>Record</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in shownRecords" :key="record.record_id">
              <td class="when" :title="formatDate(record.effective_updated_at)">
                {{ timeAgo(record.effective_updated_at, now) }}
              </td>
              <td>
                {{ record.name }}
              </td>
              <td :title="recordTitle(record)">
                {{ recordLabel(record) }}
              </td>
              <td>
                <span
                  v-for="value in improvedValues(record)"
                  :key="value.field"
                  class="result-value link-item"
                  @click="openRecord(record, value.field)"
                >{{ value.text }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="isFetching && shownRecords.length === 0" class="list-note">
          Loading...
        </p>
        <p v-if="fetched && shownRecords.length === 0" class="list-note">
          No records yet
        </p>
      </div>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
    </div>
    <GamesTable
      v-if="showGamesTable"
      :form-type="gamesFormType"
      :record-id="gamesRecordId"
      :avg-type="gamesAvgType"
      :record-puzzle-size="gamesPuzzleSize"
      @close="closeGamesTable"
    />
  </Teleport>
</template>

<style scoped>
.live-records {
  --modal-width: min(500px, calc(100% - 20px));
  width: var(--modal-width);
  z-index: var(--z-modal);
  left: calc(50% - var(--modal-width) / 2);
  padding: 20px;
}
.new-records {
  text-align: center;
  font-size: 14px;
  margin-bottom: 5px;
}
.records-list {
  height: min(430px, 60dvh);
  overflow-y: auto;
  border-bottom: 1px solid var(--table-border-color);
}
.items-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-mono);
  font-kerning: none;
  font-size: 14px;
  line-height: 1.2;
  text-align: left;
}
.items-table th {
  position: sticky;
  top: 0;
  padding: 5px;
  font-size: 16px;
  line-height: 1.1;
  color: black;
  background-color: gold;
  border-top: 1px solid var(--table-border-color);
}
.items-table td {
  padding: 4px;
  vertical-align: top;
  overflow-wrap: anywhere;
}
.items-table th, .items-table td {
  border-right: 1px solid var(--table-border-color);
  border-bottom: 1px solid var(--table-border-color);
}
.items-table th:first-child, .items-table td:first-child {
  border-left: 1px solid var(--table-border-color);
}
.w-when {
  width: calc(9ch + 9px);
}
.when {
  white-space: nowrap;
}
.w-record {
  width: calc(13ch + 9px);
}
.w-result {
  width: calc(14ch + 9px);
}
.result-value {
  display: block;
}
@media (pointer: coarse) {
  .result-value {
    padding: 0 4px;
    margin: 0 -4px;
  }
  .result-value:first-child {
    padding-top: 4px;
    margin-top: -4px;
  }
  .result-value:last-child {
    padding-bottom: 4px;
    margin-bottom: -4px;
  }
}
.list-note {
  text-align: center;
  margin-top: 10px;
}
.error-msg {
  color: var(--error-color);
  text-align: center;
  font-size: 14px;
  margin-bottom: 10px;
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
@media screen and (max-width: 450px) {
  .live-records {
    --modal-width: calc(100% - 20px);
    padding: 15px 10px;
  }
  .items-table {
    font-size: 13px;
  }
  .w-when {
    width: calc(8ch + 9px);
  }
  .w-record {
    width: calc(10ch + 9px);
  }
  .w-result {
    width: calc(9ch + 9px);
  }
}
@media screen and (max-width: 420px) {
  .items-table th {
    font-size: 15px;
  }
}
</style>
