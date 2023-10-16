<script setup lang="ts">
import { ref, computed, defineAsyncComponent, type AsyncComponentLoader } from 'vue';
import { useBaseStore } from '../stores/base';
import { CORE_NUM } from '@/const';
import { type RepGame } from '@/types';
import { useEventBus } from '@vueuse/core';
import { convertScramble, calculateTPS, displayedTime, shortenSolutionStr } from '@/utils';
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
  return baseStore.marathonMode && baseStore.doneFirstMove && !baseStore.isDone;
});
const cannotClick = computed(() => {
  return baseStore.showModal || disableDuringMarathon.value;
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
</script>

<template>
  <div class="bottom-info-panel">
    <div v-if="!(baseStore.replayMode || baseStore.playgroundMode)" class="records-row">
      <p>
        <span>PB time / moves: </span>
        <span class="italic" :class="{ red: baseStore.newTimeRecord }">
          {{ baseStore.timeRecord === 0 ? '?' : baseStore.timeMRecord }}s
        </span>
        <span>| </span>
        <span class="italic" :class="{ red: baseStore.newMovesRecord }">
          {{ baseStore.movesRecord || '?' }}
        </span>
      </p>
    </div>
    <div class="info-row" :style="{ 'min-height': getMinHeight }">
      <div v-if="baseStore.replayMode" class="copy-button-wrapper">
        <span>{{ convertScramble(baseStore.repGame.scramble) }}</span>
        <CopyButton
          :item-to-copy="String(baseStore.repGame.scramble)"
          :is-solve-path="false"
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
      </div>
      <div v-if="baseStore.replayMode && baseStore.solvePath.length > 0" class="copy-button-wrapper mt-10">
        <div>
          <span class="solution-label">
            New solution <label v-if="baseStore.repGame.name !== baseStore.userName" class="improved-user">(by {{ baseStore.userName }})</label>:
          </span>
          <span>{{ baseStore.solvePath.join('') }}</span>
        </div>
        <CopyButton
          :item-to-copy="String(baseStore.solvePath.join(''))"
          :is-solve-path="true"
        />
      </div>
      <div v-if="baseStore.playgroundMode">
        Best speed: <span :class="{ 'red bold': baseStore.newPlaygroundTimeRecord }">{{ displayedTime(baseStore.playgroundBestTime) }}s | {{ baseStore.playgroundBestTimeMoves }} | {{ calculateTPS(baseStore.playgroundBestTimeMoves, baseStore.playgroundBestTime) }}</span>
      </div>
      <div v-if="baseStore.playgroundMode" class="best-solution">
        Best solution: <span :class="{ 'red bold': baseStore.newPlaygroundMovesRecord}">{{ baseStore.playgroundBestMoves }}</span>
        <CopyButton
          v-if="baseStore.playgroundSolvePath.length > 0"
          :item-to-copy="shortenSolutionStr(String(baseStore.playgroundSolvePath.join('')))"
          :is-solve-path="true"
        />
        <button
          v-if="baseStore.playgroundSolvePath.length > 0"
          type="button"
          class="tool-button walk-button"
          @click="doWalk"
        >
          {{ baseStore.inReplay ? 'Stop' : 'Walk' }}
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
      <p v-if="baseStore.marathonMode && !(baseStore.replayMode || baseStore.playgroundMode)">
        Solved
        <span class="italic">
          {{ baseStore.solvedPuzzlesInMarathon }}
        </span> out of 5 puzzles
      </p>
    </div>
    <div v-if="!(baseStore.replayMode || baseStore.playgroundMode)" class="reg-wrapper" :class="{ paused: cannotClick }">
      <p v-if="baseStore.isNetworkError" class="no-connect">
        Local mode (no server connection)
      </p>
      <div v-if="!baseStore.isNetworkError">
        <Transition name="fade2">
          <div v-if="!baseStore.isFetching" class="registered-block">
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
            >Your stats</span>
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
.mt-10 {
  margin-top: 10px;
}
.copy-button-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-direction: row;
  line-height: 1;
}
.solution-label {
  display: flex;
}
.copy-button-wrapper :deep(.copy-button) {
  display: inline;
  --vd-font-size: 13px;
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
  gap: 15px;
  justify-content: center;
  align-content: center;
  align-items: center;
}
@media screen and (max-width: 420px) {
  .reg-wrapper {
    max-width: 300px;
  }
  .info-row {
    font-size: 15px;
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
