<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside } from '@vueuse/core';
import { getErrorMessage, usePostFetchAPI } from '../composables/useFetchAPI';
import { cores } from '@/const';
import { reloadPage } from '@/utils';
import { type PersonalBest, type SingleUserRecord, type UserData, type UserStats, isSingleUserRecord } from '@/types';

const props = defineProps<{ formType: string; resetToken?: string; email?: string }>();
const emit = defineEmits<{ close: [] }>();
const baseStore = useBaseStore();
const regModal = ref<HTMLElement>();
// Closes only via its own buttons, so an outside click cannot lose a half-filled form.
onClickOutside(regModal, (event) => {
  event.stopPropagation();
});

// Remember about useKeyDown
const user: UserData = reactive({ name: '', email: '', password: '', password_confirmation: '' });
const errorMsg = ref<string[]>([]);
const isFetching = ref(false);

const registerForm = computed(() => {
  return props.formType === 'register';
});
const setPasswordForm = computed(() => {
  return props.formType === 'set-password';
});

const updateLocalRecord = (stats: UserStats, puzzleSize: number, puzzleType: string): void => {
  const marathonMode = puzzleType === 'marathon';
  let record: PersonalBest;
  let filtered = stats.user_records.filter((item): item is SingleUserRecord => {
    return isSingleUserRecord(item) && item.puzzle_size === puzzleSize &&
      item.puzzle_type === puzzleType && item.record_type === 'time';
  });
  if (filtered.length !== 0) {
    record = baseStore.loadTimeRecord(marathonMode, puzzleSize);
    if (record.record === 0 || filtered[0].time < record.record ||
      filtered[0].time === record.record && filtered[0].moves < record.adding) {
      baseStore.setTimeRecord(filtered[0].time, filtered[0].moves, puzzleSize, marathonMode, true);
    }
  }
  filtered = stats.user_records.filter((item): item is SingleUserRecord => {
    return isSingleUserRecord(item) && item.puzzle_size === puzzleSize &&
      item.puzzle_type === puzzleType && item.record_type === 'moves';
  });
  if (filtered.length !== 0) {
    record = baseStore.loadMovesRecord(marathonMode, puzzleSize);
    if (record.record === 0 || filtered[0].moves < record.record ||
      filtered[0].moves === record.record && filtered[0].time < record.adding) {
      baseStore.setMovesRecord(filtered[0].moves, filtered[0].time, puzzleSize, marathonMode, true);
    }
  }
  filtered = stats.user_records.filter((item): item is SingleUserRecord => {
    return isSingleUserRecord(item) && item.puzzle_size === puzzleSize &&
      item.puzzle_type === puzzleType && item.record_type === 'fmc_blitz_moves';
  });
  if (filtered.length !== 0) {
    record = baseStore.loadFMCBlitzMovesRecord(puzzleSize);
    if (record.record === 0 || filtered[0].moves < record.record ||
      filtered[0].moves === record.record && filtered[0].time < record.adding) {
      baseStore.setFMCBlitzRecord(filtered[0].moves, filtered[0].time, puzzleSize, true);
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
const resetPasswordMode = ref(false);
const sentResetEmail = ref(false);
const invalidFields = reactive({
  name: false,
  email: false,
  password: false
});
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
    if (!(/^[\w-]+$/i).test(user.name)) {
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
    // Name parts allow + and ' with single dots between them; domain labels are letters and digits with
    // inner hyphens; the ending starts with a letter, which also covers xn-- internationalised names.
    if (!(/^[\w+'-]+(?:\.[\w+'-]+)*@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z][a-z\d-]*[a-z\d]$/i).test(user.email)) {
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

const fetch = (endpoint: string): void => {
  errorMsg.value = [];
  if (isFetching.value) {
    return;
  }
  if (!checkFields()) {
    return;
  }
  isFetching.value = true;
  if (resetPasswordMode.value) {
    usePostFetchAPI(endpoint, JSON.stringify({ email: user.email }))
      .then(_res => {
        sentResetEmail.value = true;
        isFetching.value = false;
      })
      .catch((error: unknown) => {
        errorMsg.value.push(getErrorMessage(error));
        isFetching.value = false;
      });
  } else {
    usePostFetchAPI(endpoint, JSON.stringify({ user, reset_token: props.resetToken }))
      .then(res => {
        baseStore.token = res.token;
        localStorage.setItem('token', String(baseStore.token));
        syncUserRecordsAfterLogin(res.stats);
        baseStore.initAfterNewPuzzleSize();
        if (location.search !== '') {
          isFetching.value = false;
          emit('close');
          reloadPage();
          return;
        }
        baseStore.userName = res.name;
        baseStore.loadAverages();
        isFetching.value = false;
        emit('close');
      })
      .catch((error: unknown) => {
        errorMsg.value.push(getErrorMessage(error));
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
  <div ref="regModal" class="reg-modal modal-shell">
    <p class="header modal-header">
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
          * all fields are required (please use a real email)
          <br>
          ** your offline records will not published to the leaderboard
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
        <button type="submit" class="tool-button" :disabled="isFetching">
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
  justify-content: center;
  width: 370px;
  z-index: var(--z-modal-above);
  top: calc(40% - 160px);
  left: calc(50% - 185px);
  padding: 20px;
}
@media screen and (max-width: 420px) {
  .reg-modal {
    width: 310px;
    left: calc(50% - 155px);
  }
}
.header {
  margin-bottom: 20px;
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
  font-size: 12px;
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
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
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
  color: var(--text-color);
}
.after-sent-email {
  display: flex;
  justify-content: center;
  margin-top: -15px;
  margin-bottom: 15px;
}
</style>
