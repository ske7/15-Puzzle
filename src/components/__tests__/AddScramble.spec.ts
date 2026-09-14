import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import AddScramble from '../AddScramble.vue';

function mountForm() {
  return mount(AddScramble, { attachTo: document.body });
}

async function submitScramble(wrapper: ReturnType<typeof mountForm>, scramble: string) {
  await wrapper.find('input#scramble').setValue(scramble);
  await wrapper.find('form').trigger('submit');
}

describe('AddScramble', () => {
  it('rejects a submit with nothing typed at all', async () => {
    // scramble starts as a real empty string, so convertToNumbersArray can call
    // .replaceAll() on it instead of throwing on undefined.
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    await nextTick();
    expect(wrapper.find('.error-text').text()).toBe('Wrong scramble format!');
    expect(wrapper.emitted('set')).toBeUndefined();
    wrapper.unmount();
  });

  it.each([
    { description: 'non-numeric input', scramble: 'not,a,scramble', error: 'Wrong scramble format!' },
    { description: 'a size that is not a valid puzzle size', scramble: '1,2,3,4', error: 'Wrong scramble format!' },
    {
      // 1 inversion (2,1) among an otherwise-sorted 3x3 board - a genuinely
      // unsolvable permutation, not just an arbitrary bad string.
      description: 'a mathematically unsolvable 3x3 scramble',
      scramble: '2,1,3,4,5,6,7,8,0',
      error: 'The scramble is not solvable!'
    },
    { description: 'an already-solved board', scramble: '1,2,3,4,5,6,7,8,0', error: 'The scramble already solved!' },
    {
      // Right length, solvable-looking inversion parity, and not sorted, but a
      // repeated 8 (and a missing 7) means the value set itself is invalid.
      description: 'a scramble whose values do not form a valid permutation',
      scramble: '3,1,2,4,5,6,8,8,0',
      error: 'Wrong scramble format!'
    }
  ])('rejects $description', async ({ scramble, error }) => {
    const wrapper = mountForm();
    await submitScramble(wrapper, scramble);
    expect(wrapper.find('.error-text').text()).toBe(error);
    expect(wrapper.emitted('set')).toBeUndefined();
    wrapper.unmount();
  });

  it('emits set with the parsed scramble for a real solvable, unsolved board', async () => {
    const wrapper = mountForm();
    await submitScramble(wrapper, '2,1,4,3,5,6,7,8,0');
    expect(wrapper.emitted('set')).toEqual([[[2, 1, 4, 3, 5, 6, 7, 8, 0]]]);
    wrapper.unmount();
  });

  it('parses a scramble written in row-separated form', async () => {
    const wrapper = mountForm();
    await submitScramble(wrapper, '2 1 4/3 5 6/7 8 0');
    expect(wrapper.emitted('set')).toEqual([[[2, 1, 4, 3, 5, 6, 7, 8, 0]]]);
    wrapper.unmount();
  });

  it('shows no error text before any submission', () => {
    const wrapper = mountForm();
    expect(wrapper.find('.error-text').exists()).toBe(false);
    wrapper.unmount();
  });

  it('emits close when Cancel is clicked', async () => {
    const wrapper = mountForm();
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('emits close when clicking outside the form', async () => {
    const wrapper = mountForm();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('does not throw when the scramble input is focused', async () => {
    const wrapper = mountForm();
    await expect(wrapper.find('input#scramble').trigger('focus')).resolves.not.toThrow();
    wrapper.unmount();
  });
});
