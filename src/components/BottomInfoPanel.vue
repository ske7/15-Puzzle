<script setup lang="ts">
import { ref, computed, defineAsyncComponent, type AsyncComponentLoader } from 'vue';
import { useBaseStore } from '../stores/base';
import { CORE_NUM, baseUrl } from '@/const';
import { type RepGame } from '@/types';
import { useEventBus, useClipboard } from '@vueuse/core';
import {
  convertScrambles, calculateTPS, displayedTime,
  shortenSolutionStr, createLinkAndClick, calculateMD
} from '@/utils';
import { useGetFetchAPI } from '../composables/useFetchAPI';
import { postUserScramble } from '../composables/useFetching';
const CopyButton = defineAsyncComponent({
  loader: async () => await import('../components/CopyButton.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const RegModal = defineAsyncComponent({
  loader: async () => await import('../components/RegModal.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const UserAccount = defineAsyncComponent({
  loader: async () => await import('../components/UserAccount.vue') as unknown as AsyncComponentLoader,
  delay: 150
});
const LeaderBoard = defineAsyncComponent({
  loader: async () => await import('../components/LeaderBoard.vue') as unknown as AsyncComponentLoader,
  delay: 150
});

const baseStore = useBaseStore();
const eventBus = useEventBus<string>('event-bus');
const formType = ref<string>('');

const wasPausedBeforeOpenModal = ref(false);
const doShowRegModal = (type: string): void => {
  if (cannotClick.value) {
    return;
  }
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showRegModal = true;
  formType.value = type;
};
const doShowUserAccount = (): void => {
  if (cannotClick.value) {
    return;
  }
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  baseStore.showUserAccount = true;
};
const showDefaultLeaderBoard = ref(false);
const doShowLeaderBoard = (): void => {
  if (cannotClick.value) {
    return;
  }
  wasPausedBeforeOpenModal.value = baseStore.paused;
  if (!baseStore.paused && !baseStore.isDone) {
    baseStore.invertPaused();
  }
  showDefaultLeaderBoard.value = true;
  baseStore.showLeaderBoard = true;
};
const goMain = (): void => {
  createLinkAndClick(baseUrl, false);
};
const goPlayground = (): void => {
  createLinkAndClick(`${baseUrl}?playground`, false);
};
const closeRegModal = (): void => {
  baseStore.showRegModal = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const closeUserAccount = (): void => {
  baseStore.showUserAccount = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const closeLeaderBoard = (): void => {
  showDefaultLeaderBoard.value = false;
  baseStore.showLeaderBoard = false;
  if (baseStore.paused && !wasPausedBeforeOpenModal.value) {
    baseStore.invertPaused();
  }
};
const doShowImageGallery = (): void => {
  if (cannotClick.value) {
    return;
  }
  eventBus.emit('show-image-gallery');
};
const disableDuringMarathon = computed(() => {
  return baseStore.marathonMode && baseStore.time > 0 && !baseStore.isDone;
});
const cannotClick = computed(() => {
  return baseStore.showModal || disableDuringMarathon.value || baseStore.inReplay;
});

const resetToken = ref<string | null>(null);
const email = ref<string | null>(null);
if (location.href.toLowerCase().includes('reset_password&token=') && !baseStore.registered) {
  const searchParams = new URLSearchParams(location.search);
  resetToken.value = searchParams.get('token');
  email.value = searchParams.get('email');
  doShowRegModal('set-password');
}

const getMinHeight = computed(() => {
  if (baseStore.replayMode) {
    return '83px';
  }
  return '0px';
});
const doWalk = (): void => {
  baseStore.repGame = {} as unknown as RepGame;
  baseStore.repGame.solve_path = baseStore.playgroundSolvePath.join('');
  baseStore.repGame.moves = baseStore.playgroundBestMoves;
  baseStore.repGame.time = baseStore.playgroundBestTime;
  baseStore.repGame.control_type = 'mouse';
  eventBus.emit('walk');
};
const { copy } = useClipboard();
const doShare = (): void => {
  useGetFetchAPI(`public_id?user_scramble_id=${baseStore.userScrambleId}`, baseStore.token)
    .then(async (res) => {
      if (res.public_id != null) {
        baseStore.publicId = res.public_id;
        await copy(`${baseUrl}?playground&public_id=${baseStore.publicId}`);
      }
    })
    .catch(error => {
      console.log(error as string);
    });
};
const doSaveOriginal = async (): Promise<void> => {
  await postUserScramble({
    user_name: baseStore.userName,
    puzzle_size: baseStore.numLines,
    best_time: baseStore.repGame.time,
    best_moves: baseStore.repGame.moves,
    best_time_moves: baseStore.repGame.moves,
    solve_path: baseStore.repGame.solve_path,
    scramble: baseStore.mixedOrders.join(',')
  });
  localStorage.setItem('sharedPlaygroundScramble', String(baseStore.mixedOrders));
  createLinkAndClick(`${baseUrl}?playground`, false);
};
const doSave = async (): Promise<void> => {
  let time = baseStore.getTime;
  const isOriginal = baseStore.userName != null && baseStore.repGame.name === baseStore.userName;
  if (isOriginal && time > baseStore.repGame.time) {
    time = baseStore.repGame.time;
  }
  let movesCount = baseStore.movesCount;
  let solvePath = baseStore.solvePath;
  if (isOriginal && movesCount > baseStore.repGame.moves) {
    movesCount = baseStore.repGame.moves;
    solvePath = baseStore.repGame.solve_path.split('');
  }
  if (baseStore.playgroundBestTime === 0 || time < baseStore.playgroundBestTime) {
    baseStore.playgroundBestTime = time;
    baseStore.playgroundBestTimeMoves = movesCount;
    baseStore.newPlaygroundTimeRecord = true;
  }
  if (baseStore.playgroundBestMoves === 0 || movesCount < baseStore.playgroundBestMoves) {
    baseStore.playgroundBestMoves = movesCount;
    baseStore.playgroundSolvePath = solvePath;
    baseStore.newPlaygroundMovesRecord = true;
  }
  if (baseStore.newPlaygroundTimeRecord || baseStore.newPlaygroundMovesRecord) {
    await postUserScramble({
      user_name: baseStore.userName,
      puzzle_size: baseStore.numLines,
      best_time: baseStore.playgroundBestTime,
      best_moves: baseStore.playgroundBestMoves,
      best_time_moves: baseStore.playgroundBestTimeMoves,
      solve_path: baseStore.playgroundSolvePath.join(''),
      scramble: baseStore.mixedOrders.join(',')
    });
    localStorage.setItem('sharedPlaygroundScramble', String(baseStore.mixedOrders));
    createLinkAndClick(`${baseUrl}?playground`, false);
  }
};
const disableSave = computed(() => {
  if (!baseStore.isDone) {
    return true;
  }
  if (baseStore.userName !== baseStore.repGame.name) {
    if (baseStore.wasReplay) {
      return true;
    }
    const time = baseStore.getTime;
    if (baseStore.solvePath.join('') === baseStore.repGame.solve_path && time >= baseStore.repGame.time) {
      return true;
    }
  }
  return false;
});
</script>

<template>
  <div class="bottom-info-panel">
    <div v-if="!(baseStore.replayMode || baseStore.playgroundMode)" class="records-row">
      <p v-if="!baseStore.fmcBlitz">
        <span>PB time / moves: </span>
        <span class="italic" :class="{ red: baseStore.newTimeRecord }">
          {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeMRecord }}s
        </span>
        <span>| </span>
        <span class="italic" :class="{ red: baseStore.newMovesRecord }">
          {{ baseStore.movesRecord || '?' }}
        </span>
      </p>
      <p v-if="baseStore.fmcBlitz">
        <span>PB FMC blitz moves: </span>
        <span class="italic" :class="{ red: baseStore.newFMCBlitzMovesRecord }">
          {{ baseStore.fmcBlitzMovesRecord || '?' }}
        </span>
      </p>
    </div>
    <div class="info-row" :style="{ 'min-height': getMinHeight }">
      <div v-if="baseStore.replayMode" class="copy-button-wrapper center">
        <span class="solution-label"><em v-if="!baseStore.marathonReplay">md:{{ calculateMD(baseStore.repGame.scramble.split(',')) }}; </em><em v-if="baseStore.repGame.opt_moves !== null">om:{{ baseStore.repGame.opt_moves }}; </em>{{ convertScrambles(baseStore.repGame.scramble, baseStore.marathonReplay ? 'marathon' : 'standard') }}</span>
        <CopyButton
          :item-to-copy="String(baseStore.repGame.scramble)"
          :is-solve-path="false"
          :puzzle-type="baseStore.marathonReplay ? 'marathon' : 'standard'"
        />
      </div>
      <div v-if="baseStore.replayMode" class="copy-button-wrapper">
        <div>
          <span class="solution-label">
            Original solution:
          </span>
          <span>{{ baseStore.repGame.solve_path }}</span>
        </div>
        <CopyButton
          :item-to-copy="String(baseStore.repGame.solve_path)"
          :is-solve-path="true"
        />
        <button
          v-if="baseStore.registered && (baseStore.userName && baseStore.repGame.name === baseStore.userName) &&
            !baseStore.marathonReplay"
          type="button"
          class="tool-button save-button"
          @click="doSaveOriginal"
        >
          💾
        </button>
      </div>
      <div v-if="baseStore.replayMode && baseStore.solvePath.length > 0" class="copy-button-wrapper mt-5">
        <div>
          <span class="solution-label">
            New solution<label v-if="baseStore.userName && baseStore.repGame.name !== baseStore.userName" class="improved-user"> (by {{ baseStore.userName }})</label>:
          </span>
          <span>{{ baseStore.solvePath.join('') }}</span>
        </div>
        <CopyButton
          :item-to-copy="String(baseStore.solvePath.join(''))"
          :is-solve-path="true"
        />
        <button
          v-if="baseStore.registered"
          type="button"
          class="tool-button save-button"
          :disabled="disableSave"
          @click="doSave"
        >
          💾
        </button>
      </div>
      <div v-if="baseStore.playgroundMode">
        Best speed: <span :class="{ 'red bold': baseStore.newPlaygroundTimeRecord }">{{ displayedTime(baseStore.playgroundBestTime) }}s | {{ baseStore.playgroundBestTimeMoves }} | {{ calculateTPS(baseStore.playgroundBestTimeMoves, baseStore.playgroundBestTime) }}</span>
      </div>
      <div v-if="baseStore.playgroundMode" class="best-solution">
        Best solution:
        <a
          v-if="baseStore.userScrambleId !== 0 && baseStore.publicId !== '' && !baseStore.sharedPlaygroundMode"
          :class="{ 'red bold best-moves': baseStore.newPlaygroundMovesRecord }"
          :href="`${baseUrl}?playground&public_id=${baseStore.publicId}`"
          rel="noopener"
          target="_blank"
        >
          {{ baseStore.playgroundBestMoves }}
        </a>
        <span v-else :class="{ 'red bold best-moves': baseStore.newPlaygroundMovesRecord}">
          {{ baseStore.playgroundBestMoves }}
        </span>
        <CopyButton
          v-if="baseStore.playgroundSolvePath.length > 0 && !baseStore.sharedPlaygroundMode"
          :item-to-copy="shortenSolutionStr(String(baseStore.playgroundSolvePath.join('')))"
          :is-solve-path="true"
        />
        <button
          v-if="baseStore.playgroundSolvePath.length > 0 && !baseStore.sharedPlaygroundMode"
          type="button"
          class="tool-button walk-button"
          @click="doWalk"
        >
          {{ baseStore.inReplay ? 'Stop' : 'Walk' }}
        </button>
        <button
          v-if="baseStore.playgroundSolvePath.length > 0 &&
            baseStore.token != null &&
            baseStore.userName != null &&
            !baseStore.sharedPlaygroundMode"
          type="button"
          :disabled="baseStore.publicId !== ''"
          class="tool-button walk-button"
          @click="doShare"
        >
          Share
        </button>
      </div>
      <p
        v-if="baseStore.enableCageMode &&
          !(baseStore.marathonMode || baseStore.proMode) && baseStore.numLines === CORE_NUM"
      >
        <span
          class="link-item"
          :class="{ paused: cannotClick }"
          @click="doShowImageGallery"
        >
          Completed</span>  <span class="italic">
          {{ baseStore.unlockedCages.size }}
        </span> out of {{ baseStore.cagesCount }} "Cages"
      </p>
      <p v-if="(baseStore.marathonMode || baseStore.fmcBlitz) && !(baseStore.replayMode || baseStore.playgroundMode)">
        Solved
        <span class="italic">
          {{ baseStore.solvedPuzzlesInMarathon }}
        </span> out of {{ baseStore.marathonMode ? 5 : baseStore.blitzScrambleCount }} puzzles
      </p>
      <p v-if="baseStore.fmcBlitz && !(baseStore.replayMode || baseStore.playgroundMode)" class="center">
        T: {{ baseStore.blitzTimeStr }} | M: {{ baseStore.solvedPuzzlesInMarathon === baseStore.blitzScrambleCount || (baseStore.interval === 0 && baseStore.blitzInterval !== 0) ? baseStore.blitzMovesCount : baseStore.blitzMovesCount + baseStore.movesCount }}
      </p>
    </div>
    <div v-show="!baseStore.clearDisplay" class="reg-wrapper" :class="{ paused: cannotClick }">
      <p v-if="baseStore.isNetworkError" class="no-connect">
        Local mode (no server connection)
      </p>
      <div v-if="!baseStore.isNetworkError">
        <Transition name="fade2">
          <div v-if="!baseStore.isFetching" class="registered-block">
            <span
              v-if="baseStore.playgroundMode || baseStore.replayMode || baseStore.g1000Mode"
              class="link-item"
              :class="{ paused: cannotClick }"
              @click="goMain"
            >Main</span>
            <span
              v-if="!baseStore.playgroundMode && !baseStore.replayMode && !baseStore.g1000Mode"
              class="link-item"
              :class="{ paused: cannotClick }"
              @click="goPlayground"
            >Playground</span>
            <span> | </span>
            <span class="link-item" :class="{ paused: cannotClick }" @click="doShowLeaderBoard">Leaderboard</span>
            <span> | </span>
            <span v-if="!baseStore.registered">
              <span class="link-item" :class="{ paused: cannotClick }" @click="doShowRegModal('register')">Register</span>  or
              <span class="link-item" :class="{ paused: cannotClick }" @click="doShowRegModal('login')">login</span>
            </span>
            <span
              v-if="baseStore.registered"
              class="link-item"
              :class="{ paused: cannotClick }"
              @click="doShowUserAccount"
            >Profile</span>
          </div>
        </Transition>
      </div>
    </div>
    <RegModal
      v-if="baseStore.showRegModal"
      :form-type="formType"
      :reset-token="resetToken"
      :email="email"
      @close="closeRegModal"
    />
    <UserAccount v-if="baseStore.showUserAccount" @close="closeUserAccount" />
    <LeaderBoard
      v-if="baseStore.showLeaderBoard && showDefaultLeaderBoard"
      :form-type="'default'"
      @close="closeLeaderBoard"
    />
  </div>
</template>

<style scoped>
.bottom-info-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  line-height: 27px;
}
.mt-5 {
  margin-top: 5px;
}
.copy-button-wrapper {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-direction: row;
  line-height: 1;
}
.solution-label {
  display: flex;
  color: var(--link-color);
  font-weight: 600;
}
.copy-button-wrapper :deep(.copy-button) {
  display: inline;
  --vd-font-size: 12px;
  --vh-font-size: 14px;
}
.copy-button-wrapper .copy-button {
  margin-top: 0px;
}
.copy-button-wrapper span {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
  font-size: 12px;
  padding: 0px;
  display: block;
  white-space: nowrap;
}
.records-row, .info-row, .reg-wrapper {
  font-family: 'consolas', sans-serif;
}
.center {
  justify-content: center;
}
.improved-user {
  color: var(--link-color);
  font-weight: 600;
}
.link-item {
  color: var(--link-color);
  text-decoration: underline;
}
.link-item:hover:not(.paused) {
  text-decoration: underline;
  color: var(--text-color);
  cursor: pointer;
}
.link-item.paused {
  opacity: 0.5;
}
.red {
  color: red;
}
.bold {
  font-weight: 600;
}
.italic {
  font-style: italic;
}
.walk-button {
  display: inline;
  font-size: 14px;
  height: 24px;
  width: 52px;
  margin-left: 5px;
}
.reg-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 5px;
  min-height: 27px;
  text-align: center;
}
.best-solution {
  display: flex;
  gap: 5px;
  justify-content: center;
  align-content: center;
  align-items: center;
}
.best-moves {
  margin: 0 5px;
}
.save-button {
  cursor: auto;
  border: 0px;
  font-style: normal;
  height: 24px;
  width: 24px;
  min-width:24px;
  transition: 1ms all ease-out;
  font-size: 12px;
  background-color: transparent;
  display: inline;
}
.save-button:disabled {
  cursor: auto;
  opacity: 0.5;
}
.save-button:hover, .save-button:active {
  background-color: transparent;
}
.save-button:active:not([disabled]) {
  cursor: pointer;
  padding-top: 1px;
  font-size: 13px;
  font-style: italic;
}
.save-button:hover:not([disabled]) {
  cursor: pointer;
  padding-top: 1px;
  padding-left: 3px;
  font-size: 13px;
  background-color: transparent;
}
@media screen and (max-width: 420px) {
  .reg-wrapper {
    max-width: 300px;
  }
  .records-row, .info-row {
    font-size: 15px;
    line-height: 1.4;
  }
  .records-row {
    margin-bottom: 3px;
  }
  .registered-block {
    font-size: 14px;
  }
}
@media screen and (max-height: 650px) and (max-width: 420px) {
  .records-row {
    line-height: 1.3;
  }
}
.no-connect {
  opacity: 0.8;
  font-size: 12px;
}
</style>
