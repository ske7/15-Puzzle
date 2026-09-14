import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEventBus } from '@vueuse/core';
import WinModal from '../WinModal.vue';
import { useBaseStore } from '../../stores/base';
import { CAGES_PATH_ARR } from '@/const';

function mountModal() {
  return mount(WinModal, { attachTo: document.body });
}

describe('WinModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows the congrats message', () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain("Congrats! You've done it.");
    wrapper.unmount();
  });

  it('shows both the new time and moves record when both were broken', () => {
    const store = useBaseStore();
    store.newTimeRecord = true;
    store.newMovesRecord = true;
    store.timeRecord = 12340;
    store.movesRecord = 42;
    const wrapper = mountModal();
    const spans = wrapper.findAll('.unlock-message span');
    expect(spans[0].text()).toBe('12.340s');
    expect(spans[0].isVisible()).toBe(true);
    expect(spans[1].text()).toBe('/');
    expect(spans[1].isVisible()).toBe(true);
    expect(spans[2].text()).toBe('42 moves');
    expect(spans[2].isVisible()).toBe(true);
    wrapper.unmount();
  });

  it('shows only the time record and hides the separator when only the time record was broken', () => {
    const store = useBaseStore();
    store.newTimeRecord = true;
    store.newMovesRecord = false;
    store.timeRecord = 12340;
    const wrapper = mountModal();
    const spans = wrapper.findAll('.unlock-message span');
    expect(spans[0].isVisible()).toBe(true);
    expect(spans[1].isVisible()).toBe(false);
    expect(spans[2].isVisible()).toBe(false);
    wrapper.unmount();
  });

  it('hides the record message entirely when no record was broken', () => {
    const wrapper = mountModal();
    expect(wrapper.find('.unlock-message').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the completed cage number in cage mode', () => {
    const store = useBaseStore();
    store.cageMode = true;
    store.numLines = 3;
    store.inPlaceCount = 8;
    store.cagePath = CAGES_PATH_ARR[2];
    const wrapper = mountModal();
    expect(wrapper.text()).toContain(`You've completed Cage game (#${CAGES_PATH_ARR.indexOf(CAGES_PATH_ARR[2]) + 1})`);
    wrapper.unmount();
  });

  it('shows "New Game" outside cage mode and "OK" in cage mode', () => {
    const outside = mountModal();
    expect(outside.find('button').text()).toBe('New Game');
    outside.unmount();

    const store = useBaseStore();
    store.cageMode = true;
    const cage = mountModal();
    expect(cage.find('button').text()).toBe('OK');
    cage.unmount();
  });

  it('closes and restarts on button click outside cage mode', async () => {
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    const wrapper = mountModal();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(events).toEqual(['restart']);
    stop();
    wrapper.unmount();
  });

  it('closes without restarting on button click in cage mode', async () => {
    const store = useBaseStore();
    store.cageMode = true;
    const bus = useEventBus<string>('event-bus');
    const events: string[] = [];
    const stop = bus.on((event) => events.push(event));
    const wrapper = mountModal();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(events).toEqual([]);
    stop();
    wrapper.unmount();
  });

  it('closes when clicking outside the modal', async () => {
    const wrapper = mountModal();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('resets showWinModal on unmount', () => {
    const store = useBaseStore();
    store.showWinModal = true;
    const wrapper = mountModal();
    wrapper.unmount();
    expect(store.showWinModal).toBe(false);
  });
});
