import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '../base';
import { setSetting, toggleSetting } from '../persistedSettings';

describe('persistedSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('sets a setting on the store and saves it under its own name', () => {
    const store = useBaseStore();
    setSetting('marathonMode', true);
    expect(store.marathonMode).toBe(true);
    expect(localStorage.getItem('marathonMode')).toBe('true');
    setSetting('marathonMode', false);
    expect(store.marathonMode).toBe(false);
    expect(localStorage.getItem('marathonMode')).toBe('false');
  });

  it('toggles a setting from its current store value', () => {
    const store = useBaseStore();
    store.hoverOnControl = false;
    toggleSetting('hoverOnControl');
    expect(store.hoverOnControl).toBe(true);
    expect(localStorage.getItem('hoverOnControl')).toBe('true');
  });
});
