import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PuzzleSizeSlider from '../PuzzleSizeSlider.vue';
import { cores } from '@/const';

describe('PuzzleSizeSlider', () => {
  it('renders the range input bound to modelValue, spanning the full cores range', () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 5 } });
    const input = wrapper.find('input');
    expect(input.element.value).toBe('5');
    expect(input.attributes('min')).toBe(String(cores[0]));
    expect(input.attributes('max')).toBe(String(cores.at(-1)));
    expect(input.element.disabled).toBe(false);
  });

  it('renders a datalist option and a marker span for every puzzle size', () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    const options = wrapper.findAll('option');
    expect(options.map((o) => o.attributes('value'))).toEqual(cores.map(String));
    const marks = wrapper.findAll('.slider-marks span');
    expect(marks.map((m) => m.text())).toEqual(cores.map(String));
  });

  it('disables the input when disabled is true', () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4, disabled: true } });
    expect(wrapper.find('input').element.disabled).toBe(true);
  });

  it('emits update:modelValue with the numeric value when dragged to a valid size', async () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    await wrapper.find('input').setValue('7');
    expect(wrapper.emitted('update:modelValue')).toEqual([[7]]);
  });

  it('emits the default CORE_NUM when the raw input value is not a valid puzzle size', async () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    const input = wrapper.find('input');
    // In range (min 3, max 8) so the browser's own clamping leaves it untouched, but
    // not step-aligned - a range input's step is not enforced on direct assignment.
    input.element.value = '5.5';
    await input.trigger('input');
    expect(wrapper.emitted('update:modelValue')).toEqual([[4]]);
  });

  it('emits update:modelValue with the clicked size when a marker is clicked', async () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    const marks = wrapper.findAll('.slider-marks span');
    await marks[3].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[cores[3]]]);
  });
});
