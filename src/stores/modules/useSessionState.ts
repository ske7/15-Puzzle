import { ref, computed, type Ref } from 'vue';
import { generateRand } from '../../utils';

export function useSessionState(g1000Mode: Ref<boolean>) {
  const token = ref(localStorage.getItem('token') ?? undefined);
  const userName = ref<string | undefined>(undefined);
  const sessionId = ref<string | undefined>(undefined);
  const keepSession = ref(localStorage.getItem('keepSession') === 'true');
  const consecutiveSolves = ref(0);

  const canKeepSession = computed((): boolean => {
    return !g1000Mode.value && keepSession.value;
  });

  const registered = computed((): boolean => {
    return token.value != null;
  });

  function setSessionId(): void {
    if (token.value == null || userName.value === undefined) {
      return;
    }
    if (consecutiveSolves.value === 1) {
      const rand = generateRand().toString().slice(-4);
      sessionId.value = (`${userName.value.slice(0, 2)}${rand}_${btoa(Date.now().toString())}`).toLowerCase().split('=').join('');
    }
    if (canKeepSession.value) {
      if (sessionId.value !== undefined) {
        localStorage.setItem('_xss', btoa(sessionId.value));
      }
      localStorage.setItem('_xcs', btoa(consecutiveSolves.value.toString()));
    }
  }

  function restoreStoredSession(): void {
    const cs = localStorage.getItem('_xcs');
    const storedSessionId = localStorage.getItem('_xss');
    if (cs !== null && storedSessionId !== null) {
      consecutiveSolves.value = Number(atob(cs));
      sessionId.value = atob(storedSessionId);
    }
  }

  function clearStoredSession(): void {
    localStorage.removeItem('_xss');
    localStorage.removeItem('_xcs');
  }

  return {
    token,
    userName,
    sessionId,
    keepSession,
    consecutiveSolves,
    canKeepSession,
    registered,
    setSessionId,
    restoreStoredSession,
    clearStoredSession
  };
}
