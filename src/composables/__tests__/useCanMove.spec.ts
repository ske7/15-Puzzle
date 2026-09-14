import { createPinia, setActivePinia } from 'pinia';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCanMove } from '../useCanMove';
import { useBaseStore } from '../../stores/base';
import { Direction } from '@/const';

// 4x4 board, blank (0) at the last slot (col 4, row 4).
function setup4x4BlankAtEnd() {
  const store = useBaseStore();
  store.numLines = 4;
  store.spaceBetween = 8;
  store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
  return store;
}

describe('useCanMove', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('allows moving right when the blank is later in the same row', () => {
    setup4x4BlankAtEnd();
    const sid = ref(15);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.elementCol.value).toBe(3);
    expect(result.elementRow.value).toBe(4);
    expect(result.canMoveRight.value).toBe(true);
    expect(result.canMoveLeft.value).toBe(false);
    expect(result.canMove.value).toBe(true);
    expect(result.moveDirection.value).toBe(Direction.Right);
    expect(result.isFreeElement.value).toBe(false);
  });

  it('allows moving down when the blank is later in the same column', () => {
    setup4x4BlankAtEnd();
    const sid = ref(12);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.canMoveDown.value).toBe(true);
    expect(result.canMoveUp.value).toBe(false);
    expect(result.moveDirection.value).toBe(Direction.Down);
  });

  it('allows moving left when the blank is earlier in the same row', () => {
    const store = setup4x4BlankAtEnd();
    store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 13, 14, 15];
    const sid = ref(14);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.canMoveLeft.value).toBe(true);
    expect(result.canMoveRight.value).toBe(false);
    expect(result.moveDirection.value).toBe(Direction.Left);
  });

  it('allows moving up when the blank is earlier in the same column', () => {
    const store = setup4x4BlankAtEnd();
    store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 12, 13, 14, 15, 8];
    const sid = ref(8);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.canMoveUp.value).toBe(true);
    expect(result.canMoveDown.value).toBe(false);
    expect(result.moveDirection.value).toBe(Direction.Up);
  });

  it('disallows movement when neither row nor column lines up with the blank', () => {
    setup4x4BlankAtEnd();
    const sid = ref(1);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.canMove.value).toBe(false);
    expect(result.moveDirection.value).toBe(Direction.None);
  });

  it('marks the blank itself as unmovable and as the free element', () => {
    setup4x4BlankAtEnd();
    const sid = ref(16);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.isFreeElement.value).toBe(true);
    expect(result.canMove.value).toBe(false);
  });

  it('computes pixel offsets from column/row, spacing and square size', () => {
    setup4x4BlankAtEnd();
    const sid = ref(15);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.calculatedLeft.value).toBe(124);
    expect(result.calculatedTop.value).toBe(182);
  });

  it('recomputes reactively when the tracked sid changes', () => {
    setup4x4BlankAtEnd();
    const sid = ref(1);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.canMove.value).toBe(false);

    sid.value = 15;
    expect(result.canMoveRight.value).toBe(true);
    expect(result.moveDirection.value).toBe(Direction.Right);
  });

  it('recomputes reactively when the store state it depends on changes', () => {
    const store = setup4x4BlankAtEnd();
    const sid = ref(15);
    const result = useCanMove(computed(() => sid.value), 50);
    expect(result.canMoveRight.value).toBe(true);

    // Move the blank away from sid 15's row entirely.
    store.currentOrders = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
    expect(result.canMoveRight.value).toBe(false);
    expect(result.canMove.value).toBe(false);
  });
});
