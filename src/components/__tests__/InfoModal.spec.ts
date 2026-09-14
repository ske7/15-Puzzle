import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InfoModal from '../InfoModal.vue';

// InfoModal's entire template is a <Teleport to="body">, so its content is moved
// out of the component's own render tree into document.body directly - wrapper.find()
// only searches within the component's tree and never sees it, so assertions here
// query document.body directly instead.
function mountModal() {
  return mount(InfoModal, { attachTo: document.body });
}

describe('InfoModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the header, instructions, and repo link', () => {
    const wrapper = mountModal();
    expect(document.querySelector('.info-header')?.textContent).toBe('About the game');
    expect(document.querySelector('.instruction')?.textContent)
      .toContain('Move blocks until they are in regular order');
    const link = document.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://github.com/ske7/15-Puzzle');
    wrapper.unmount();
  });

  it('shows a single copyright year when the current year is the 2023 launch year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-06-15'));
    const wrapper = mountModal();
    expect(document.querySelector('.copyright')?.textContent).toContain('© 2023 SKE');
    wrapper.unmount();
  });

  it('shows a year range in the copyright once past the launch year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30'));
    const wrapper = mountModal();
    expect(document.querySelector('.copyright')?.textContent).toContain('© 2023 - 2026 SKE');
    wrapper.unmount();
  });

  it('emits close when the OK button is clicked', async () => {
    const wrapper = mountModal();
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('emits close when clicking outside the modal', async () => {
    const wrapper = mountModal();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });
});
