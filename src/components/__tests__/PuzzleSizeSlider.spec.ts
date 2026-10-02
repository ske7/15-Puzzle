import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PuzzleSizeSlider from '../PuzzleSizeSlider.vue';
import { cores, CORE_NUM } from '@/const';

describe('PuzzleSizeSlider', () => {
  it('renders the range input bound to modelValue, spanning the full cores range', () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 5 } });
    const input = wrapper.find('input');
    expect(input.element.value).toBe('5');
    expect(input.attributes('min')).toBe(String(cores[0]));
    expect(input.attributes('max')).toBe(String(cores.at(-1)));
  });

  it('renders a datalist option and a marker span for every puzzle size', () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    const options = wrapper.findAll('option');
    expect(options.map((o) => o.attributes('value'))).toEqual(cores.map(String));
    const marks = wrapper.findAll('.slider-marks span');
    expect(marks.map((m) => m.text())).toEqual(cores.map(String));
  });

  it('emits update:modelValue with the numeric value when dragged to a size', async () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    await wrapper.find('input').setValue('7');
    expect(wrapper.emitted('update:modelValue')).toEqual([[7]]);
  });

  it('falls back to the default size when the slider\'s range was edited in the browser', async () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    const input = wrapper.find('input');
    input.element.max = '12';
    await input.setValue('12');
    expect(wrapper.emitted('update:modelValue')).toEqual([[CORE_NUM]]);
  });

  it('emits update:modelValue with the clicked size when a marker is clicked', async () => {
    const wrapper = mount(PuzzleSizeSlider, { props: { modelValue: 4 } });
    const marks = wrapper.findAll('.slider-marks span');
    await marks[3].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[cores[3]]]);
  });
});
