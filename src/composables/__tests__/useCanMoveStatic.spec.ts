import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { canMoveStatic } from '../useCanMoveStatic';
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

describe('canMoveStatic', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('allows moving right when the blank is later in the same row', () => {
    setup4x4BlankAtEnd();
    const result = canMoveStatic(15, 50);
    expect(result.elementCol).toBe(3);
    expect(result.elementRow).toBe(4);
    expect(result.canMoveRight).toBe(true);
    expect(result.canMoveLeft).toBe(false);
    expect(result.canMoveUp).toBe(false);
    expect(result.canMoveDown).toBe(false);
    expect(result.canMove).toBe(true);
    expect(result.moveDirection).toBe(Direction.Right);
    expect(result.isFreeElement).toBe(false);
  });

  it('allows moving left when the blank is earlier in the same row', () => {
    const store = setup4x4BlankAtEnd();
    // Move blank to the front of the last row: [.., 0, 13, 14, 15]
    store.currentOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 13, 14, 15];
    const result = canMoveStatic(14, 50);
    expect(result.canMoveLeft).toBe(true);
    expect(result.canMoveRight).toBe(false);
    expect(result.moveDirection).toBe(Direction.Left);
  });

  it('allows moving down when the blank is later in the same column', () => {
    setup4x4BlankAtEnd();
    // sid 12 is at col 4, row 3 - same column as the blank (col 4, row 4).
    const result = canMoveStatic(12, 50);
    expect(result.elementCol).toBe(4);
    expect(result.elementRow).toBe(3);
    expect(result.canMoveDown).toBe(true);
    expect(result.canMoveUp).toBe(false);
    expect(result.moveDirection).toBe(Direction.Down);
  });

  it('allows moving up when the blank is earlier in the same column', () => {
    const store = setup4x4BlankAtEnd();
    store.currentOrders = [1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 12, 13, 14, 15, 8];
    // sid 8 is now at col 4, row 2 - same column as the blank (col 4, row 1).
    const result = canMoveStatic(8, 50);
    expect(result.elementCol).toBe(4);
    expect(result.elementRow).toBe(2);
    expect(result.canMoveUp).toBe(true);
    expect(result.canMoveDown).toBe(false);
    expect(result.moveDirection).toBe(Direction.Up);
  });

  it('disallows movement when neither row nor column lines up with the blank', () => {
    setup4x4BlankAtEnd();
    const result = canMoveStatic(1, 50);
    expect(result.canMoveLeft).toBe(false);
    expect(result.canMoveRight).toBe(false);
    expect(result.canMoveUp).toBe(false);
    expect(result.canMoveDown).toBe(false);
    expect(result.canMove).toBe(false);
    expect(result.moveDirection).toBe(Direction.None);
  });

  it('marks the blank itself as unmovable and as the free element', () => {
    setup4x4BlankAtEnd();
    const result = canMoveStatic(16, 50);
    expect(result.isFreeElement).toBe(true);
    expect(result.canMove).toBe(false);
    expect(result.moveDirection).toBe(Direction.None);
  });

  it('computes pixel offsets from column/row, spacing and square size', () => {
    setup4x4BlankAtEnd();
    const result = canMoveStatic(15, 50);
    // col 3, row 4, spaceBetween 8, squareSize 50:
    // left = (3-1)*8 + 8 + 50*(3-1) = 124; top = (4-1)*8 + 8 + 50*(4-1) = 182
    expect(result.calculatedLeft).toBe(124);
    expect(result.calculatedTop).toBe(182);
  });
});
