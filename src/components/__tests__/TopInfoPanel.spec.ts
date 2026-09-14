import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import TopInfoPanel from '../TopInfoPanel.vue';
import { useBaseStore } from '../../stores/base';
import { baseUrl } from '@/const';
import type { RepGame } from '@/types';

// A real, solvable-but-unsolved 3x3 scramble.
const mixedOrders = [2, 1, 4, 3, 5, 6, 7, 8, 0];

function realRepGame(overrides: Partial<RepGame> = {}): RepGame {
  return {
    time: 45678,
    moves: 55,
    puzzle_size: 3,
    puzzle_type: 'standard',
    control_type: 'mouse',
    consecutive_solves: 3,
    scramble: '2,1,4,3,5,6,7,8,0',
    solve_path: 'RUDLRUDL',
    name: 'someone',
    tps: '1.204',
    created_at: '2024-01-15T10:30:00Z',
    opt_moves: 48,
    ...overrides
  };
}

// Resolving the lazily-imported children up front: defineAsyncComponent loads them on
// first render, so a vi.waitFor for one is really timing module resolution (~350ms cold,
// against waitFor's 1000ms default). See ActionPanel.spec.ts for the full note.
beforeAll(async () => {
  await import('../CopyButton.vue');
});

describe('TopInfoPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows only the time/moves/tps row outside replay and playground modes', () => {
    const wrapper = mount(TopInfoPanel);
    expect(wrapper.find('.replay-row-info').exists()).toBe(false);
    expect(wrapper.find('.playground-row-info').exists()).toBe(false);
    expect(wrapper.find('.info-wrapper').exists()).toBe(true);
  });

  it('shows the solver name, date, and time/moves/tps line in replay mode', () => {
    const store = useBaseStore();
    store.replayMode = true;
    store.repGame = realRepGame();
    const wrapper = mount(TopInfoPanel);
    const paragraphs = wrapper.findAll('.replay-row-info p');
    expect(paragraphs[0].text()).toBe('Solved by someone');
    expect(paragraphs[1].text()).toMatch(/^Date: 2024-01-15 \d{2}:\d{2}:\d{2}$/);
    expect(paragraphs[2].text()).toBe('45.678s | 55 | 1.204');
  });

  it('shows the other player and their created date in a shared-playground link, without the time/moves/tps line', () => {
    const store = useBaseStore();
    store.playgroundMode = true;
    store.publicId = 'shared-scramble-1';
    store.userName = 'me';
    store.otherUserName = 'other-player';
    store.playgroundCreatedAt = '2024-03-20T08:00:00Z';
    const wrapper = mount(TopInfoPanel);
    const paragraphs = wrapper.findAll('.replay-row-info p');
    expect(paragraphs[0].text()).toBe('Solved by other-player');
    expect(paragraphs[1].text()).toMatch(/^Date: 2024-03-20 \d{2}:\d{2}:\d{2}$/);
    expect(paragraphs).toHaveLength(2);
  });

  it('shows an empty date when the shared scramble has no created date yet', () => {
    const store = useBaseStore();
    store.playgroundMode = true;
    store.publicId = 'shared-scramble-1';
    store.userName = 'me';
    store.otherUserName = 'other-player';
    const wrapper = mount(TopInfoPanel);
    expect(wrapper.findAll('.replay-row-info p')[1].text()).toBe('Date:');
  });

  it('shows the Manhattan distance and formatted scramble with a copy button in playground mode', async () => {
    const store = useBaseStore();
    store.playgroundMode = true;
    store.mixedOrders = mixedOrders;
    const wrapper = mount(TopInfoPanel);
    expect(wrapper.find('.playground-row-info span').text()).toBe('md:8; 2 1 4/3 5 6/7 8 0');
    // CopyButton is loaded via defineAsyncComponent with a real 150ms delay before it
    // commits to rendering, even once the import itself has resolved.
    await vi.waitFor(() => {
      expect(wrapper.find('.playground-row-info .copy-button').exists()).toBe(true);
    });
  });

  it('links the elapsed time to the finished game when it has a public id and is done outside cage mode', () => {
    const store = useBaseStore();
    store.lastGameID = 'abc123';
    store.numLines = 3;
    store.inPlaceCount = 8;
    store.time = 45678;
    const wrapper = mount(TopInfoPanel);
    const link = wrapper.find('.factor-wrapper a');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe(`${baseUrl}?game_id=abc123`);
    expect(link.text()).toBe('45.678s');
  });

  it('shows the elapsed time as plain text when there is no game link to show', () => {
    const store = useBaseStore();
    store.time = 45678;
    const wrapper = mount(TopInfoPanel);
    expect(wrapper.find('.factor-wrapper a').exists()).toBe(false);
    expect(wrapper.findAll('.factor-wrapper')[0].find('span.ml-5').text()).toBe('45.678s');
  });

  it('shows the optimal-moves difference once a solve has an opt_m and at least one move', () => {
    const store = useBaseStore();
    store.movesCount = 26;
    store.opt_m = 22;
    const wrapper = mount(TopInfoPanel);
    const optSpan = wrapper.find('.opt-moves');
    expect(optSpan.isVisible()).toBe(true);
    expect(optSpan.text()).toBe('+4');
  });

  it('hides the optimal-moves difference before any move has been made outside playground mode', () => {
    const store = useBaseStore();
    store.movesCount = 0;
    store.opt_m = 48;
    const wrapper = mount(TopInfoPanel);
    expect(wrapper.find('.opt-moves').isVisible()).toBe(false);
  });

  it('shows the tps value', () => {
    const store = useBaseStore();
    store.movesCount = 55;
    store.time = 45678;
    const wrapper = mount(TopInfoPanel);
    expect(wrapper.findAll('.factor-wrapper')[2].find('span.ml-5').text()).toBe(store.tps);
  });
});
