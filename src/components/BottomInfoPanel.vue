<script setup lang="ts">
import { ref, computed, defineAsyncComponent, type AsyncComponentLoader } from 'vue';
import { useBaseStore } from '../stores/base';
import { CORE_NUM } from '@/stores/const';
import { useEventBus } from '@vueuse/core';
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
</script>

<template>
  <div class="bottom-info-panel">
    <div class="records-row">
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
    <div class="info-row">
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
      <p v-if="baseStore.marathonMode">
        Solved
        <span class="italic">
          {{ baseStore.solvedPuzzlesInMarathon }}
        </span> out of 5 puzzles
      </p>
    </div>
    <div class="reg-wrapper" :class="{ paused: cannotClick }">
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
    <RegModal v-if="baseStore.showRegModal" :form-type="formType" @close="closeRegModal" />
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
.records-row, .info-row, .reg-wrapper {
  font-family: 'consolas', sans-serif;
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
.italic {
  font-style: italic;
}
.reg-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 5px;
  min-height: 27px;
  text-align: center;
}
@media screen and (max-width: 420px) {
  .reg-wrapper {
    max-width: 300px;
  }
}
@media screen and (max-height: 650px) and (max-width: 420px) {
  .records-row {
    line-height: 1.3;
    margin-top: -5px;
  }
}
.no-connect {
  opacity: 0.8;
  font-size: 12px;
}
</style>
