import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const copyMock = vi.fn();
const copiedRef = ref(false);

vi.mock('@vueuse/core', () => ({
  useClipboard: () => ({ copy: copyMock, copied: copiedRef })
}));

import CopyButton from '../CopyButton.vue';

// A real, solvable-but-unsolved 3x3 scramble (not the sorted 1..8,0 state).
const scramble = '4,1,3,2,0,6,7,5,8';
// Five real per-scramble marathon segments, semicolon-joined - the format
// marathonScrambles/marathonSolves are actually stored in.
const marathonScrambles = [
  '5,1,0,8,4,3,2,6,7',
  '6,5,7,3,0,8,2,4,1',
  '3,8,6,7,5,2,1,4,0',
  '0,1,3,2,4,8,7,5,6',
  '6,4,0,1,3,5,8,2,7'
].join(';');
const solvePath = 'RRRUULDD';

describe('CopyButton', () => {
  beforeEach(() => {
    copiedRef.value = false;
  });

  it('copies the shortened solve path when isSolvePath is true', async () => {
    const wrapper = mount(CopyButton, { props: { itemToCopy: solvePath, isSolvePath: true } });
    await wrapper.find('button').trigger('click');
    expect(copyMock).toHaveBeenCalledWith('R3U2LD2');
  });

  it('copies all five converted scrambles when puzzleType starts with "m"', async () => {
    const wrapper = mount(CopyButton, {
      props: { itemToCopy: marathonScrambles, isSolvePath: false, puzzleType: 'marathon' }
    });
    await wrapper.find('button').trigger('click');
    expect(copyMock).toHaveBeenCalledWith(
      '5 1 0/8 4 3/2 6 7;6 5 7/3 0 8/2 4 1;3 8 6/7 5 2/1 4 0;0 1 3/2 4 8/7 5 6;6 4 0/1 3 5/8 2 7'
    );
  });

  it('copies a single converted scramble when puzzleType does not start with "m"', async () => {
    const wrapper = mount(CopyButton, {
      props: { itemToCopy: scramble, isSolvePath: false, puzzleType: 'standard' }
    });
    await wrapper.find('button').trigger('click');
    expect(copyMock).toHaveBeenCalledWith('4 1 3/2 0 6/7 5 8');
  });

  it('copies a single converted scramble when no puzzleType is given', async () => {
    const wrapper = mount(CopyButton, { props: { itemToCopy: scramble, isSolvePath: false } });
    await wrapper.find('button').trigger('click');
    expect(copyMock).toHaveBeenCalledWith('4 1 3/2 0 6/7 5 8');
  });

  it('disables the button while copied is true', () => {
    copiedRef.value = true;
    const wrapper = mount(CopyButton, { props: { itemToCopy: scramble, isSolvePath: false } });
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('leaves the button enabled while copied is false', () => {
    const wrapper = mount(CopyButton, { props: { itemToCopy: scramble, isSolvePath: false } });
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
  });
});
