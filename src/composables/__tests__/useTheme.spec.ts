import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { withSetup } from '../../../tests/withSetup';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.documentElement.dataset['theme'] = '';
  });

  it('applies the stored dark theme straight away', () => {
    localStorage.setItem('darkMode', 'true');
    const [, unmount] = withSetup(() => useTheme());
    expect(document.documentElement.dataset['theme']).toBe('dark');
    unmount();
  });

  it('defaults to the light theme', () => {
    const [, unmount] = withSetup(() => useTheme());
    expect(document.documentElement.dataset['theme']).toBe('light');
    unmount();
  });

  it('follows every later change to dark mode, whoever makes it', async () => {
    const store = useBaseStore();
    const [, unmount] = withSetup(() => useTheme());

    store.darkMode = true;
    await nextTick();
    expect(document.documentElement.dataset['theme']).toBe('dark');

    store.darkMode = false;
    await nextTick();
    expect(document.documentElement.dataset['theme']).toBe('light');
    unmount();
  });
});
