import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PuzzleModeGroup from '../PuzzleModeGroup.vue';

describe('PuzzleModeGroup', () => {
  it('renders the header and a capitalized radio per choice, checking the current modelValue', () => {
    const wrapper = mount(PuzzleModeGroup, {
      props: { modelValue: 'marathon', choices: ['standard', 'marathon'], header: 'Puzzle Mode' }
    });
    expect(wrapper.find('p').text()).toBe('Puzzle Mode');
    const labels = wrapper.findAll('label');
    expect(labels.map((l) => l.text())).toEqual(['Standard', 'Marathon']);
    const radios = wrapper.findAll('input[type="radio"]').map((i) => i.element as HTMLInputElement);
    expect(radios.map((r) => r.checked)).toEqual([false, true]);
  });

  it('leaves choice text uncapitalized when capitalize is false', () => {
    const wrapper = mount(PuzzleModeGroup, {
      props: {
        modelValue: 'ao5', choices: ['ao5', 'ao12', 'ao50', 'ao100'], header: 'Average Type', capitalize: false
      }
    });
    const labels = wrapper.findAll('label');
    expect(labels.map((l) => l.text())).toEqual(['ao5', 'ao12', 'ao50', 'ao100']);
  });

  it('uses the names prop for display text, overriding capitalize', () => {
    const wrapper = mount(PuzzleModeGroup, {
      props: {
        modelValue: 'time', choices: ['time', 'moves'], header: 'Best Factor', capitalize: false,
        names: ['Time', 'Moves']
      }
    });
    const labels = wrapper.findAll('label');
    expect(labels.map((l) => l.text())).toEqual(['Time', 'Moves']);
  });

  it('emits update:modelValue when a radio input changes', async () => {
    const wrapper = mount(PuzzleModeGroup, {
      props: { modelValue: 'standard', choices: ['standard', 'marathon'], header: 'Puzzle Mode' }
    });
    const radios = wrapper.findAll('input[type="radio"]');
    await radios[1].trigger('change');
    expect(wrapper.emitted('update:modelValue')).toEqual([['marathon']]);
  });

  it('emits update:modelValue when the label text is clicked', async () => {
    const wrapper = mount(PuzzleModeGroup, {
      props: { modelValue: 'standard', choices: ['standard', 'marathon'], header: 'Puzzle Mode' }
    });
    await wrapper.findAll('span')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['marathon']]);
  });

  it('formats the gap prop as a pixel value', () => {
    const wrapper = mount(PuzzleModeGroup, {
      props: { modelValue: 'standard', choices: ['standard', 'marathon'], header: 'Puzzle Mode', gap: 15 }
    });
    expect((wrapper.vm as unknown as { gapValue: string }).gapValue).toBe('15px');
  });
});
