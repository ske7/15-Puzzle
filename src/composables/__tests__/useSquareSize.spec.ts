import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { withSetup } from '../../../tests/withSetup';
import { useSquareSize } from '../useSquareSize';

describe('useSquareSize', () => {
  function setWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it.each([
    { proMode: true, numLines: 3, cageAdd: 56 },
    { proMode: true, numLines: 4, cageAdd: 22 },
    { proMode: true, numLines: 5, cageAdd: 1 },
    { proMode: true, numLines: 6, cageAdd: -12 },
    { proMode: true, numLines: 7, cageAdd: -20 },
    { proMode: true, numLines: 8, cageAdd: -28 },
    { proMode: false, numLines: 3, cageAdd: 45 },
    { proMode: false, numLines: 4, cageAdd: 12 },
    { proMode: false, numLines: 5, cageAdd: -8 },
    { proMode: false, numLines: 6, cageAdd: -21 },
    { proMode: false, numLines: 7, cageAdd: -31 },
    { proMode: false, numLines: 8, cageAdd: -38 }
  ])('computes the fixed board size for proMode=$proMode, numLines=$numLines', ({ proMode, numLines, cageAdd }) => {
    // Width outside [370, 820] window and >820 uses "80 + cageAdd" directly, making
    // cageAdd (and therefore which switch case fired) directly observable in the result.
    setWidth(900);
    const store = useBaseStore();
    store.proMode = proMode;
    store.numLines = numLines;
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBe(80 + cageAdd);
    unmount();
  });

  it('shrinks to fit a pro-mode board below 370px wide', () => {
    setWidth(300);
    const store = useBaseStore();
    store.proMode = true;
    store.numLines = 4;
    store.spaceBetween = 8;
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBe(Math.floor((300 - (40 + 40)) / 4));
    unmount();
  });

  it('shrinks to fit a non-pro-mode board below 370px wide, with extra margin', () => {
    setWidth(300);
    const store = useBaseStore();
    store.proMode = false;
    store.numLines = 4;
    store.spaceBetween = 8;
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBe(Math.floor((300 - (40 + 70)) / 4));
    unmount();
  });

  it('computes the mid-small-screen size between 371px and 480px wide', () => {
    setWidth(450);
    const store = useBaseStore();
    store.numLines = 4;
    store.spaceBetween = 8;
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBe(Math.floor((450 - (40 + 50)) / 4));
    unmount();
  });

  it('uses the fixed tablet-range size between 600px and 820px wide', () => {
    setWidth(700);
    const store = useBaseStore();
    store.proMode = false;
    store.numLines = 4;
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBe(100 + 12);
    unmount();
  });

  it('reacts to the puzzle size changing after the composable is created', () => {
    setWidth(900);
    const store = useBaseStore();
    store.proMode = false;
    store.numLines = 4;
    const [{ squareSize }, unmount] = withSetup(() => useSquareSize());
    expect(squareSize.value).toBe(80 + 12);

    store.numLines = 3;
    expect(squareSize.value).toBe(80 + 45);
    unmount();
  });
});
