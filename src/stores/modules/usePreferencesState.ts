import { ref } from 'vue';

export function usePreferencesState() {
  const darkMode = ref(localStorage.getItem('darkMode') === 'true');
  const hoverOnControl = ref(localStorage.getItem('hoverOnControl') === 'true');
  const disableWinMessage = ref(localStorage.getItem('disableWinMessage') === 'true');
  const hideCurrentAverages = ref(localStorage.getItem('hideCurrentAverages') === 'true');
  const resetUnsolvedPuzzleWithEsc = ref(localStorage.getItem('resetUnsolvedPuzzleWithEsc') === 'true');

  return {
    darkMode,
    hoverOnControl,
    disableWinMessage,
    hideCurrentAverages,
    resetUnsolvedPuzzleWithEsc
  };
}
