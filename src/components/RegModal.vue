<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside, useWindowSize } from '@vueuse/core';
import { usePostFetchAPI } from '../composables/useFetchAPI';
import { cores, CORE_NUM } from '@/const';
import {
  type GameData, type Record, type UserData,
  type UserStats, type InvalidFields
} from '@/types';

const props = defineProps<{ formType: string; resetToken?: string; email?: string }>();
const emit = defineEmits<{ close: [] }>();
const baseStore = useBaseStore();
const regModal = ref<HTMLElement>();
onClickOutside(regModal, (event) => {
  event.stopPropagation();
});

const registerForm = computed(() => {
  return props.formType === 'register';
});
const setPasswordForm = computed(() => {
  return props.formType === 'set-password';
});

const { width: windowWidth } = useWindowSize();
const recordGames = ref<GameData[]>([]);

const loadLocalRecordAndPush = (size: number, isMarathon: boolean, isMovesMain = false): void => {
  const recordControlType = windowWidth.value <= 800 ? 'touch' : 'mouse';
  let record: Record = { record: 0, adding: 0 };
  let time = 0;
  let moves = 0;
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
    consecutive_solves: 0
  });
};

const fillRecordGames = (): void => {
  recordGames.value = [];
  for (const item of cores) {
    let itemS = String(item);
    if (item === CORE_NUM) {
      itemS = '';
    }
    if (localStorage.getItem(`timeRecord${itemS}`) != null) {
      loadLocalRecordAndPush(item, false);
    }
    if (localStorage.getItem(`timeMRecord${itemS}`) != null) {
      loadLocalRecordAndPush(item, true);
    }
    if (localStorage.getItem(`movesRecord${itemS}`) != null) {
      loadLocalRecordAndPush(item, false, true);
    }
    if (localStorage.getItem(`movesMRecord${itemS}`) != null) {
      loadLocalRecordAndPush(item, true, true);
    }
  }
};

const updateLocalRecord = (stats: UserStats, puzzleSize: number, puzzleType: string): void => {
  const marathonMode = puzzleType === 'marathon';
  let record: Record = { record: 0, adding: 0 };
  let filtered = stats.user_records.filter(item => {
    return item.puzzle_size === puzzleSize && item.puzzle_type === puzzleType && item.record_type === 'time';
  });
  if (filtered.length !== 0) {
    record = baseStore.loadTimeRecord(marathonMode, puzzleSize);
    if (record.record === 0 || filtered[0].time < record.record ||
      filtered[0].time === record.record && filtered[0].moves < record.adding) {
      baseStore.setTimeRecord(filtered[0].time, filtered[0].moves, puzzleSize, marathonMode, true);
    }
  }
  filtered = stats.user_records.filter(item => {
    return item.puzzle_size === puzzleSize && item.puzzle_type === puzzleType && item.record_type === 'moves';
  });
  if (filtered.length !== 0) {
    record = baseStore.loadMovesRecord(marathonMode, puzzleSize);
    if (record.record === 0 || filtered[0].moves < record.record ||
      filtered[0].moves === record.record && filtered[0].time < record.adding) {
      baseStore.setMovesRecord(filtered[0].moves, filtered[0].time, puzzleSize, marathonMode, true);
    }
  }
};
const syncUserRecordsAfterLogin = (stats?: UserStats): void => {
  if ((stats == null) || stats.user_records.length === 0) {
    return;
  }
  for (const item of cores) {
    updateLocalRecord(stats, item, 'standard');
    updateLocalRecord(stats, item, 'marathon');
  }
  baseStore.setRecords();
};
const resetPasswordMode = ref<boolean>(false);
const sentResetEmail = ref<boolean>(false);

// Remember about useKeyDown
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
  if (resetPasswordMode.value) {
    usePostFetchAPI(endpoint, JSON.stringify({ email: user.email }) as BodyInit)
      .then(_res => {
        sentResetEmail.value = true;
        isFetching.value = false;
      })
      .catch(error => {
        errorMsg.value.push(error as string);
        isFetching.value = false;
      });
  } else {
    usePostFetchAPI(endpoint, JSON.stringify(
      { user, games: recordGames.value, reset_token: props.resetToken }
    ) as BodyInit)
      .then(res => {
        baseStore.token = res.token;
        localStorage.setItem('token', String(baseStore.token));
        syncUserRecordsAfterLogin(res.stats);
        if (window.location.search !== '') {
          isFetching.value = false;
          emit('close');
          location.reload();
          return;
        }
        baseStore.userName = res.name;
        baseStore.loadAverages();
        isFetching.value = false;
        emit('close');
      })
      .catch(error => {
        errorMsg.value.push(error as string);
        isFetching.value = false;
      });
  }
};

const doSubmit = (): void => {
  if (setPasswordForm.value) {
    fetch('set_password');
  } else if (resetPasswordMode.value) {
    fetch('reset_password');
  } else if (registerForm.value) {
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
  if (registerForm.value) {
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
  if (!resetPasswordMode.value) {
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
  }
  if (invalidFields.name || invalidFields.email || invalidFields.password) {
    return false;
  }
  resetInvalidFields();
  return true;
};
const doSetResetPasswordMode = (): void => {
  errorMsg.value = [];
  resetPasswordMode.value = true;
};
const headerText = computed(() => {
  if (setPasswordForm.value) {
    return 'Set new password';
  } else if (resetPasswordMode.value) {
    return 'Reset you password';
  } else {
    return registerForm.value ? 'Register your account' : 'Login into your account';
  }
});
const submitButtonText = computed(() => {
  if (setPasswordForm.value) {
    return 'Submit';
  } else if (resetPasswordMode.value) {
    return 'Reset';
  } else {
    return registerForm.value ? 'Register' : 'Login';
  }
});
onMounted(() => {
  if (setPasswordForm.value) {
    user.email = props.email ?? '';
  }
});
</script>

<template>
  <div
    ref="regModal"
    class="reg-modal"
  >
    <p class="header">
      <span>{{ headerText }}</span>
    </p>
    <div v-if="sentResetEmail">
      <p class="after-sent-email">
        Email sent with password reset instructions
      </p>
      <div class="buttons">
        <button
          type="button"
          class="tool-button"
          :disabled="isFetching"
          @click="emit('close')"
        >
          Close
        </button>
      </div>
    </div>
    <form v-if="!sentResetEmail" @submit.prevent="doSubmit">
      <fieldset :disabled="isFetching" class="fields">
        <legend v-if="registerForm && (!user.name || !user.email || !user.password)">
          * all fields are required
        </legend>
        <label v-if="registerForm" for="username">
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
        <label v-if="!resetPasswordMode" for="password">
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
        <button
          type="submit"
          class="tool-button"
          :disabled="isFetching"
        >
          {{ submitButtonText }}
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
      <p v-if="!registerForm && !setPasswordForm && !resetPasswordMode" class="forgot-password">
        <a @click="doSetResetPasswordMode">Forgot you password?</a>
      </p>
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
  top: calc(40% - 160px);
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
  margin-bottom: 20px;
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
.fields > legend {
  font-size: 14px;
  color: red;
}
label {
  margin-bottom: 5px;
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
  margin-bottom: 15px;
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
.forgot-password {
  display: flex;
  justify-content: center;
  margin-top: -10px;
  font-size: 14px;
}
a {
  color: var(--link-color);
  text-decoration: underline;
  cursor: pointer;
}
a:hover {
  text-decoration: underline;
  color: var(--text-color);
}
.after-sent-email {
  display: flex;
  justify-content: center;
  margin-top: -15px;
  margin-bottom: 15px;
}
</style>
