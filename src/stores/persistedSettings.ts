import { useBaseStore } from './base';

export type PersistedSetting =
  | 'cageHardcoreMode' | 'noBordersInCageMode' | 'darkMode' | 'disableWinMessage'
  | 'resetUnsolvedPuzzleWithEsc' | 'hideCurrentAverages' | 'hoverOnControl' | 'keepSession'
  | 'enableCageMode' | 'marathonMode' | 'fmcBlitz' | 'proMode' | 'proBeforeCage';

export function setSetting(key: PersistedSetting, value: boolean): void {
  useBaseStore()[key] = value;
  localStorage.setItem(key, value.toString());
}

export function toggleSetting(key: PersistedSetting): void {
  setSetting(key, !useBaseStore()[key]);
}
