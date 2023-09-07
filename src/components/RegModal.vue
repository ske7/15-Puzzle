<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useWindowSize } from '@vueuse/core';
import { usePostFetchAPI } from '../composables/useFetchAPI';
import {
  type GameData, type Record, type UserData, type UserStats, type InvalidFields
} from '../stores/const';

const props = defineProps<{ formType: string }>();
const emit = defineEmits<{ close: [] }>();
const baseStore = useBaseStore();
const regModal = ref<HTMLElement>();
onClickOutside(regModal, (event) => {
  event.stopPropagation();
});

const isRegisterForm = computed(() => {
  return props.formType === 'register';
});

const { width: windowWidth } = useWindowSize();
const recordGames = ref<GameData[]>([]);
const fillRecordGames = (): void => {
  recordGames.value = [];
  const recordControlType = windowWidth.value <= 800 ? 'touch' : 'mouse';
  let record: Record = { record: 0, adding: 0 };
  let time = 0;
  let moves = 0;
  const loadAndPush = (size: number, isMarathon: boolean, isMovesMain = false): void => {
    if (isMovesMain) {
      record = baseStore.loadMovesRecord(isMarathon, size);
      time = record.adding;
      moves = record.record;
    } else {
      record = baseStore.loadTimeRecord(isMarathon, size);
      time = record.record;
      moves = record.adding;
    }
    recordGames.value.push({
      time,
      moves,
      puzzle_size: size,
      puzzle_type: isMarathon ? 'marathon' : 'standard',
      control_type: recordControlType,
      pro_game: false
    });
  };
  if (localStorage.getItem('timeRecord') != null) {
    loadAndPush(4, false);
  }
  if (localStorage.getItem('timeRecord3') != null) {
    loadAndPush(3, false);
  }
  if (localStorage.getItem('timeRecord5') != null) {
    loadAndPush(5, false);
  }
  if (localStorage.getItem('timeMRecord') != null) {
    loadAndPush(4, true);
  }
  if (localStorage.getItem('timeMRecord3') != null) {
    loadAndPush(3, true);
  }
  if (localStorage.getItem('timeMRecord5') != null) {
    loadAndPush(5, true);
  }
  if (localStorage.getItem('movesRecord') != null) {
    loadAndPush(4, false, true);
  }
  if (localStorage.getItem('movesRecord3') != null) {
    loadAndPush(3, false, true);
  }
  if (localStorage.getItem('movesRecord5') != null) {
    loadAndPush(5, false, true);
  }
  if (localStorage.getItem('movesMRecord') != null) {
    loadAndPush(4, true, true);
  }
  if (localStorage.getItem('movesMRecord3') != null) {
    loadAndPush(3, true, true);
  }
  if (localStorage.getItem('movesMRecord5') != null) {
    loadAndPush(5, true, true);
  }
};

const syncUserRecordsAfterLogin = (stats?: UserStats): void => {
  if ((stats == null) || stats.user_records.length === 0) {
    return;
  }
  const updateLocalRecord = (puzzleSize: number, puzzleType: string): void => {
    const filtered = stats.user_records.filter(item => {
      return item.puzzle_size === puzzleSize && item.puzzle_type === puzzleType;
    });
    const marathonMode = puzzleType === 'marathon';
    let record: Record = { record: 0, adding: 0 };
    if (filtered.length !== 0) {
      record = baseStore.loadTimeRecord(marathonMode, puzzleSize);
      if (filtered[0].time < record.record ||
        filtered[0].time === record.record && filtered[0].moves < record.adding) {
        baseStore.setTimeRecord(filtered[0].time, filtered[0].moves, puzzleSize, marathonMode);
      }
      record = baseStore.loadMovesRecord(marathonMode, puzzleSize);
      if (filtered[1].moves < record.record ||
        filtered[1].moves === record.record && filtered[1].time < record.adding) {
        baseStore.setMovesRecord(filtered[1].moves, filtered[1].time, puzzleSize, marathonMode);
      }
    }
  };
  updateLocalRecord(3, 'standard');
  updateLocalRecord(3, 'marathon');
  updateLocalRecord(4, 'standard');
  updateLocalRecord(4, 'marathon');
  updateLocalRecord(5, 'standard');
  updateLocalRecord(5, 'marathon');
};

const user: UserData = reactive({} as unknown as UserData);
const errorMsg = ref<string[]>([]);
const isFetching = ref(false);
const fetch = (endpoint: string): void => {
  errorMsg.value = [];
  if (isFetching.value) {
    return;
  }
  if (!checkFields()) {
    return;
  }
  fillRecordGames();
  isFetching.value = true;
  usePostFetchAPI(endpoint, JSON.stringify({ user, games: recordGames.value }) as BodyInit)
    .then(res => {
      baseStore.token = res.token;
      localStorage.setItem('token', String(baseStore.token));
      baseStore.userName = res.name;
      syncUserRecordsAfterLogin(res.stats);
      isFetching.value = false;
      emit('close');
    })
    .catch(error => {
      errorMsg.value.push(error as string);
      isFetching.value = false;
    });
};

const doSubmit = (): void => {
  if (isRegisterForm.value) {
    user.password_confirmation = user.password;
    fetch('register');
  } else {
    fetch('login');
  }
};

const invalidFields = reactive({
  name: false,
  email: false,
  password: false
} as unknown as InvalidFields);
const resetInvalidFields = (): void => {
  invalidFields.email = false;
  invalidFields.name = false;
  invalidFields.password = false;
};
const checkFields = (): boolean => {
  resetInvalidFields();
  if (isRegisterForm.value) {
    if (user.name.trim() === '') {
      invalidFields.name = true;
    }
    if (!(/^[a-z-_0-9]+$/gi).test(user.name)) {
      errorMsg.value.push('Allowed characters for username: letters (a-z), numbers, underscores(_) and hyphens(-)');
      invalidFields.name = true;
    }
  }
  if (user.email.trim() === '') {
    invalidFields.email = true;
  }
  if (user.password.trim() === '') {
    invalidFields.password = true;
  }
  if (!(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/g).test(user.email)) {
    errorMsg.value.push('Invalid email address');
    invalidFields.email = true;
  }
  if (user.password.trim().length < 6) {
    invalidFields.password = true;
  }
  if (invalidFields.name || invalidFields.email || invalidFields.password) {
    return false;
  }
  resetInvalidFields();
  return true;
};
</script>

<template>
  <div
    ref="regModal"
    class="reg-modal"
  >
    <p class="header">
      <span>{{ isRegisterForm ? 'Register your account' : 'Login into your account' }}</span>
    </p>
    <form @submit.prevent="doSubmit">
      <fieldset :disabled="isFetching" class="fields">
        <label v-if="isRegisterForm" for="username">
          <span>Username</span>
          <input
            id="username"
            v-model="user.name"
            type="text"
            name="username"
            minlength="2"
            maxlength="20"
            required
            :class="{ 'invalid-data': invalidFields.name }"
            @focus="invalidFields.name = false"
          >
        </label>
        <label for="email">
          <span>Email</span>
          <input
            id="email"
            v-model="user.email"
            type="email"
            name="email"
            maxlength="255"
            required
            :class="{ 'invalid-data': invalidFields.email }"
            @focus="invalidFields.email = false"
          >
        </label>
        <label for="password">
          <span>Password</span>
          <input
            id="password"
            v-model="user.password"
            type="password"
            name="password"
            minlength="6"
            maxlength="20"
            autocomplete="new-password"
            required
            :class="{ 'invalid-data': invalidFields.password }"
            @focus="invalidFields.password = false"
          >
        </label>
      </fieldset>
      <div class="error-msg-wrapper">
        <p
          v-for="(error, index) in errorMsg"
          v-show="errorMsg.length > 0"
          :key="index"
          class="error-msg"
        >
          {{ error }}
        </p>
      </div>
      <div class="buttons">
        <button type="submit" class="tool-button" :disabled="isFetching">
          {{ isRegisterForm ? 'Register' : 'Login' }}
        </button>
        <button
          type="button"
          class="tool-button"
          :disabled="isFetching"
          @click="emit('close')"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.reg-modal {
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: auto;
  width: 370px;
  position: fixed;
  z-index: 2001;
  top: calc(40% - 170px);
  left: calc(50% - 185px);
  padding: 20px;
  box-shadow: 0 8px 16px var(--shadow-color);
}
@media screen and (max-width: 420px) {
  .reg-modal {
    width: 310px;
    left: calc(50% - 155px);
  }
}
.header {
  text-align: center;
  margin-bottom: 30px;
  margin-top: 5px;
}
.header span {
  font-weight: 600;
  font-size: 21px;
}
.fields {
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;
  padding: 0;
  border: none;
}
label {
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-content: flex-start;
}
label input {
  max-width: 100%;
  width: 100%;
  border: 1px solid #ccc;
  background-color: var(--background-color);
  color: var(--text-color);
  height: auto;
  padding: 3px 7px;
  border-radius: 8px;
  line-height: 1.6;
}
.buttons {
  margin-top: 10px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  gap: 20px;
}
.invalid-data {
  border-color: var(--error-color);
  border-width: 2px;
}
.tool-button {
  width: 80px;
}
.tool-button:disabled, .fields:disabled {
  opacity: 0.7;
}
.error-msg-wrapper {
  min-height: 27px;
}
.error-msg {
  color: var(--error-color);
  margin-top: -5px;
  margin-bottom: 15px;
  font-size: 14px;
}
</style>
