import { mount, type DOMWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScrambleCube from '../ScrambleCube.vue';
import { getTileColor } from '@/colors';
import { generateAndShuffle, isSolvable } from '@/utils';
import { decodeRecord, encodeRecord } from '@/stores/recordCodec';

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>();
  return { ...actual, generateAndShuffle: vi.fn(actual.generateAndShuffle) };
});

// One swap away from solved, so it can never be solved.
const UNSOLVABLE = [2, 1, 3, 4, 5, 6, 7, 8, 0];

function faceColors(faces: DOMWrapper<Element>[]): string[][] {
  return faces.map((face) => {
    return face.findAll<HTMLElement>('.cube-cell').map((cell) => cell.element.style.backgroundColor);
  });
}

function scrambleColors(scramble: number[]): string[] {
  const probe = document.createElement('span');
  return scramble.map((cell) => {
    probe.style.backgroundColor = cell === 0 ? 'var(--background-color)' : getTileColor(3, cell);
    return probe.style.backgroundColor;
  });
}

describe('ScrambleCube', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(generateAndShuffle).mockClear();
  });

  it('shows six 3x3 faces of colours, with no numbers', () => {
    const wrapper = mount(ScrambleCube);
    expect(wrapper.findAll('.cube-face')).toHaveLength(6);
    for (const face of wrapper.findAll('.cube-face')) {
      expect(face.findAll('.cube-cell')).toHaveLength(9);
      expect(face.text()).toBe('');
    }
    expect(wrapper.find('.cube-scene').attributes('aria-hidden')).toBe('true');
    wrapper.unmount();
  });

  it('colours every tile like the pro board and leaves the free cell as the background', () => {
    const wrapper = mount(ScrambleCube);
    const scrambles = vi.mocked(generateAndShuffle).mock.results.map((r) => r.value as number[]).filter(isSolvable);
    expect(faceColors(wrapper.findAll('.cube-face'))).toEqual(scrambles.map(scrambleColors));
    for (const face of faceColors(wrapper.findAll('.cube-face'))) {
      expect(face.filter((color) => color === 'var(--background-color)')).toHaveLength(1);
    }
    wrapper.unmount();
  });

  it('draws again until the scramble is solvable', () => {
    vi.mocked(generateAndShuffle).mockReturnValueOnce(UNSOLVABLE);
    const wrapper = mount(ScrambleCube);
    expect(faceColors(wrapper.findAll('.cube-face'))[0]).not.toEqual(scrambleColors(UNSOLVABLE));
    const scrambles = vi.mocked(generateAndShuffle).mock.results.map((r) => r.value as number[]);
    expect(scrambles[0]).toEqual(UNSOLVABLE);
    expect(scrambles.filter(isSolvable)).toHaveLength(6);
    wrapper.unmount();
  });

  it('renews one face every 300ms, in turn, starting over after the sixth', async () => {
    const wrapper = mount(ScrambleCube);
    for (const face of [0, 1, 2, 3, 4, 5, 0]) {
      const before = faceColors(wrapper.findAll('.cube-face'));
      vi.mocked(generateAndShuffle).mockReturnValueOnce([1, 2, 3, 4, 5, 6, 7, 8, 0]);
      await vi.advanceTimersByTimeAsync(300);
      const after = faceColors(wrapper.findAll('.cube-face'));
      const expected = [...before];
      expected[face] = scrambleColors([1, 2, 3, 4, 5, 6, 7, 8, 0]);
      expect(after).toEqual(expected);
    }
    wrapper.unmount();
  });
});

describe('ScrambleCube bouncing', () => {
  // The About modal's padding box on desktop.
  const BOX = { width: 340, height: 390 };
  let wrapper: ReturnType<typeof mountCube>;

  function mountCube() {
    return mount(ScrambleCube, { attachTo: document.body });
  }

  function mountInBox(): DOMWrapper<HTMLElement> {
    wrapper = mountCube();
    const scene = wrapper.find<HTMLElement>('.cube-scene');
    const box = scene.element.parentElement!;
    Object.defineProperty(box, 'clientWidth', { value: BOX.width, configurable: true });
    Object.defineProperty(box, 'scrollHeight', { value: BOX.height, configurable: true });
    // Where the stylesheet puts it: 18px in from the top right corner.
    Object.defineProperty(scene.element, 'offsetLeft', { value: BOX.width - 18 - 24 });
    Object.defineProperty(scene.element, 'offsetTop', { value: 18 });
    return scene;
  }

  function offset(scene: DOMWrapper<HTMLElement>): { x: number; y: number } {
    // "translate(Xpx, Ypx)"
    const [x, y] = scene.element.style.transform.split(/[(,)]/).slice(1, 3).map(parseFloat);
    return { x, y };
  }

  // Presses with every random draw in the middle, so only where it was pressed decides the flight.
  async function press(scene: DOMWrapper<HTMLElement>, clientX = 0): Promise<void> {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    scene.element.dispatchEvent(new PointerEvent('pointerdown', { clientX, bubbles: true, cancelable: true }));
    random.mockRestore();
    await vi.advanceTimersByTimeAsync(0);
  }

  function turns(): number[] {
    const tumble = wrapper.find<HTMLElement>('.cube-tumble').element.style.transform;
    const cube = wrapper.find<HTMLElement>('.cube').element.style.transform;
    // "rotateZ(Adeg) rotateX(Bdeg) rotateY(Cdeg)"
    return `${tumble} ${cube}`.split(/[()]/).filter((part) => part.endsWith('deg')).map(parseFloat);
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('turns by CSS animation until pressed', () => {
    const scene = mountInBox();
    expect(scene.classes()).not.toContain('dropped');
    expect(scene.element.style.transform).toBe('');
    expect(wrapper.emitted('flying')).toBeUndefined();
  });

  it('drops on a press, carrying on from the angle the animation had turned it to', async () => {
    const scene = mountInBox();
    vi.advanceTimersByTime(2250);
    await press(scene);
    expect(scene.classes()).toContain('dropped');
    expect(turns()).toEqual([0, 90, 135]);
    expect(wrapper.emitted('flying')).toEqual([[true]]);
    // It may hop a little first, so give it time to come down.
    await vi.advanceTimersByTimeAsync(600);
    expect(offset(scene).y).toBeGreaterThan(0);
    expect(offset(scene).x).not.toBe(0);
  });

  it('comes to rest flat on the floor, and says it has stopped flying', async () => {
    const scene = mountInBox();
    await press(scene);
    await vi.advanceTimersByTimeAsync(15000);
    expect(wrapper.emitted('flying')).toEqual([[true], [false]]);
    expect(turns()).toHaveLength(3);
    for (const angle of turns()) {
      expect(Math.abs(angle % 90)).toBe(0);
    }
    const resting = offset(scene);
    await vi.advanceTimersByTimeAsync(1000);
    expect(offset(scene)).toEqual(resting);
  });

  it('jumps away from the side it is pressed on, even in mid-flight', async () => {
    const scene = mountInBox();
    await press(scene);
    await vi.advanceTimersByTimeAsync(15000);
    vi.spyOn(scene.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 24, 24));
    const start = offset(scene);
    await press(scene, 90);
    expect(wrapper.emitted('flying')?.at(-1)).toEqual([true]);
    await vi.advanceTimersByTimeAsync(100);
    const mid = offset(scene);
    expect(mid.y).toBeLessThan(start.y);
    expect(mid.x).toBeGreaterThan(start.x);
    await press(scene, 200);
    await vi.advanceTimersByTimeAsync(100);
    expect(offset(scene).x).toBeLessThan(mid.x);
  });

  it('counts hits, keeps the best score, and starts over when the cube lands', async () => {
    const scene = mountInBox();
    const score = (): string => wrapper.find('.cube-score').text().replace(/\s+/g, ' ');
    expect(wrapper.find('.cube-score').exists()).toBe(false);
    await press(scene);
    expect(score()).toBe('Hits: 0Best: 0');
    await press(scene);
    await press(scene);
    expect(score()).toBe('Hits: 2Best: 2');
    await vi.advanceTimersByTimeAsync(30000);
    expect(score()).toBe('Hits: 0Best: 2');
    const stored = localStorage.getItem('cubeBestScore');
    expect(stored).not.toBe('2');
    expect(decodeRecord(stored, 'heh6')).toMatchObject({ best: { record: 2 } });
    await press(scene);
    expect(score()).toBe('Hits: 1Best: 2');
  });

  it('keeps the score out of the way until the cube is first pressed', async () => {
    localStorage.setItem('cubeBestScore', encodeRecord(7, 0, 'heh6'));
    const scene = mountInBox();
    expect(wrapper.find('.cube-score').exists()).toBe(false);
    await press(scene);
    expect(wrapper.find('.cube-score').text()).toContain('Best: 7');
  });

  it.each([
    ['a hand-typed number', '99'],
    ['a rewritten value in the right shape', btoa('0000000099000000zzzz')],
    ['something that is not a stored score at all', 'best = 99!']
  ])('ignores a best score edited by hand: %s', async (_case, tampered) => {
    localStorage.setItem('cubeBestScore', tampered);
    const scene = mountInBox();
    await press(scene);
    expect(wrapper.find('.cube-score').text()).toContain('Best: 0');
  });

  it('moves a resting cube back inside when the window resizes the modal', async () => {
    const scene = mountInBox();
    window.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(100);
    expect(scene.element.style.transform).toBe('');
    await press(scene);
    await vi.advanceTimersByTimeAsync(15000);
    expect(wrapper.emitted('flying')?.at(-1)).toEqual([false]);
    const floor = (): number => 18 + 12 + offset(scene).y + 12.5;
    expect(floor()).toBeGreaterThan(300);
    // A wider window reflows the text, and the modal gets shorter under the resting cube.
    Object.defineProperty(scene.element.parentElement!, 'scrollHeight', { value: 300, configurable: true });
    window.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(3000);
    expect(floor()).toBeCloseTo(299);
  });
});
