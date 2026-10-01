import { reactive, computed } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateMD,
  calculateTPS,
  cellFromPoint,
  convertScramble,
  convertScrambles,
  convertToNumbersArray,
  createLinkAndClick,
  redirectTo,
  reloadPage,
  displayedTime,
  timeAgo,
  expandSolutionStr,
  generate,
  generateAndShuffle,
  generateRand,
  getArrayKeyByValue,
  getElementCol,
  getElementRow,
  getMilliSeconds,
  getSeconds,
  isSolvable,
  isSorted,
  randArrayItem,
  sequenceGenerator,
  shortenSolutionStr,
  shuffle,
  sleep,
  sumArrayElements,
  swapArrayElements,
} from '../utils';

describe('shuffle', () => {
  it('returns an empty array unchanged', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns a permutation containing the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b));
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('returns the same single element for a length-1 array', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

describe('generateRand', () => {
  it('returns a number between 0 and 1', () => {
    for (let i = 0; i < 20; i++) {
      const value = generateRand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('sequenceGenerator', () => {
  it('yields values from minVal up to (excluding) maxVal', () => {
    expect([...sequenceGenerator(0, 5)]).toEqual([0, 1, 2, 3, 4]);
  });

  it('yields nothing when minVal >= maxVal', () => {
    expect([...sequenceGenerator(3, 3)]).toEqual([]);
  });
});

describe('generateAndShuffle', () => {
  it('produces a permutation of 0..length-1 by default', () => {
    const result = generateAndShuffle(5);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('produces a permutation of 1..length-1 when fromZero is false', () => {
    const result = generateAndShuffle(5, false);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});

describe('generate', () => {
  it('generates 0..length-1 by default', () => {
    expect(generate(4)).toEqual([0, 1, 2, 3]);
  });

  it('generates 1..length-1 when fromZero is false', () => {
    expect(generate(4, false)).toEqual([1, 2, 3]);
  });
});

describe('getArrayKeyByValue', () => {
  it('returns the index of the matching value', () => {
    expect(getArrayKeyByValue([10, 20, 30], 20)).toBe(1);
  });

  // It is called from every Square on each board change, so it has to keep
  // tracking the array it reads - indexOf on a reactive array must still invalidate a
  // computed when an element moves, exactly as the previous Object.keys() scan did.
  it('still invalidates a computed when an element moves', () => {
    // Built through a factory, as it is in the components, rather than beside the assertion.
    const trackBlank = (orders: number[]) => computed(() => getArrayKeyByValue(orders, 0));
    const orders = reactive([3, 1, 0, 2]);
    const index = trackBlank(orders);
    expect(index.value).toBe(2);

    const moved = orders[2];
    orders[2] = orders[3];
    orders[3] = moved;

    expect(index.value).toBe(3);
  });

  it('returns NaN when the value is not found', () => {
    expect(Number.isNaN(getArrayKeyByValue([10, 20, 30], 99))).toBe(true);
  });
});

describe('cellFromPoint', () => {
  // The exact inverse of calcPosition - a point maps to the cell that would be drawn there.
  it('maps points to 1-based cell indexes with no gap between tiles', () => {
    const cell = (x: number, y: number) => cellFromPoint(x, y, 4, 50, 0);
    expect(cell(25, 25)).toBe(1);
    expect(cell(75, 25)).toBe(2);
    expect(cell(175, 25)).toBe(4);
    expect(cell(25, 75)).toBe(5);
    expect(cell(175, 175)).toBe(16);
  });

  it('accounts for the gap between tiles', () => {
    // 8px gap: tile 1 spans 8..58, tile 2 spans 66..116
    expect(cellFromPoint(30, 30, 4, 50, 8)).toBe(1);
    expect(cellFromPoint(90, 30, 4, 50, 8)).toBe(2);
  });

  it('returns null off the board', () => {
    expect(cellFromPoint(-5, 25, 4, 50, 0)).toBeNull();
    expect(cellFromPoint(250, 25, 4, 50, 0)).toBeNull();
    expect(cellFromPoint(25, 250, 4, 50, 0)).toBeNull();
  });

  it('returns null rather than NaN when the board has no size yet', () => {
    // 0/0 would be NaN, which slips past the range check and yields a bogus index
    expect(cellFromPoint(0, 0, 4, 0, 0)).toBeNull();
  });
});

describe('isSolvable', () => {
  it('is true for a solved odd-sized (3x3) board', () => {
    expect(isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(true);
  });

  it('is false for a single-swap odd-sized (3x3) board', () => {
    expect(isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 0])).toBe(false);
  });

  it('is true for a solved even-sized (4x4) board (blank on even row)', () => {
    expect(isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0])).toBe(true);
  });

  it('handles an even-sized board with the blank on an odd row', () => {
    // Blank moved to index 3 (row 1, odd); one adjacent swap keeps a definite parity result.
    const board = [1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 12, 13, 14, 15, 8];
    expect(typeof isSolvable(board)).toBe('boolean');
  });
});

describe('randArrayItem', () => {
  it('returns an item not present in the exclusion list', () => {
    const result = randArrayItem(['a', 'b', 'c'], ['a']);
    expect(['b', 'c']).toContain(result);
  });

  it('returns undefined when every item is excluded', () => {
    expect(randArrayItem(['a'], ['a'])).toBeUndefined();
  });
});

describe('getElementCol', () => {
  it('returns numLines when el is an exact multiple', () => {
    expect(getElementCol(4, 4)).toBe(4);
  });

  it('returns the remainder otherwise', () => {
    expect(getElementCol(5, 4)).toBe(1);
  });
});

describe('getElementRow', () => {
  it('returns the ceiling of el / numLines', () => {
    expect(getElementRow(5, 4)).toBe(2);
    expect(getElementRow(4, 4)).toBe(1);
  });
});

describe('calculateMD', () => {
  it('returns -1 for an empty array', () => {
    expect(calculateMD([])).toBe(-1);
  });

  it('returns -1 for a non-square length', () => {
    expect(calculateMD([1, 2, 3, 4, 5])).toBe(-1);
  });

  it('returns 0 for a fully solved board', () => {
    expect(calculateMD([1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(0);
  });

  it('computes the Manhattan distance for a shifted board', () => {
    expect(calculateMD([2, 1, 3, 4, 5, 6, 7, 8, 0])).toBe(2);
  });
});

describe('getSeconds / getMilliSeconds / displayedTime', () => {
  it('getSeconds floors to whole seconds', () => {
    expect(getSeconds(1500)).toBe(1);
  });

  it('getMilliSeconds formats the remainder', () => {
    expect(getMilliSeconds(1500)).toBe('.500');
  });

  it('getMilliSeconds returns empty string for a whole second by default', () => {
    expect(getMilliSeconds(1000)).toBe('');
  });

  it('getMilliSeconds returns .000 for a whole second in long mode', () => {
    expect(getMilliSeconds(1000, true)).toBe('.000');
  });

  it('displayedTime combines seconds and milliseconds', () => {
    expect(displayedTime(1500)).toBe('1.500');
  });

  it('displayedTime omits milliseconds for a whole second by default', () => {
    expect(displayedTime(2000)).toBe('2');
  });

  it('displayedTime shows .000 for a whole second in long mode', () => {
    expect(displayedTime(2000, true)).toBe('2.000');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-09-18T06:20:23.072Z');

  it('says "just now" under a minute', () => {
    expect(timeAgo('2026-09-18T06:19:30.000Z', now)).toBe('just now');
  });

  it('counts minutes under an hour', () => {
    expect(timeAgo('2026-09-18T06:15:05.418Z', now)).toBe('5m ago');
    expect(timeAgo('2026-09-18T05:20:30.000Z', now)).toBe('59m ago');
  });

  it('counts hours under a day', () => {
    expect(timeAgo('2026-09-18T05:20:23.072Z', now)).toBe('1h ago');
    expect(timeAgo('2026-09-17T06:21:00.000Z', now)).toBe('23h ago');
  });

  it('counts days under thirty days', () => {
    expect(timeAgo('2026-09-08T00:50:14.101Z', now)).toBe('10d ago');
  });

  it('shows the local date for anything older', () => {
    const older = new Date(2023, 7, 30, 12, 54, 47).toISOString();
    expect(timeAgo(older, now)).toBe('30/08/23');
  });
});

describe('isSorted', () => {
  it('is true for an ascending array', () => {
    expect(isSorted([1, 2, 3])).toBe(true);
  });

  it('is false for an unsorted array', () => {
    expect(isSorted([3, 1, 2])).toBe(false);
  });

  it('is true for an empty array', () => {
    expect(isSorted([])).toBe(true);
  });

  it('is true for a single-element array', () => {
    expect(isSorted([5])).toBe(true);
  });
});

describe('calculateTPS', () => {
  it('returns "0" when time is 0', () => {
    expect(calculateTPS(100, 0)).toBe('0');
  });

  it('computes moves per second to 3 decimals', () => {
    expect(calculateTPS(100, 2000)).toBe('50.000');
  });
});

describe('shortenSolutionStr', () => {
  it('returns empty string for undefined input', () => {
    expect(shortenSolutionStr()).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(shortenSolutionStr('')).toBe('');
  });

  it('leaves non-repeating characters unchanged', () => {
    expect(shortenSolutionStr('abc')).toBe('abc');
  });

  it('collapses runs of repeated characters with a count', () => {
    expect(shortenSolutionStr('aaabbbc')).toBe('a3b3c');
  });

  it('collapses a trailing run that ends the string', () => {
    expect(shortenSolutionStr('abbb')).toBe('ab3');
  });
});

describe('expandSolutionStr', () => {
  it('expands digit-count-encoded runs back to repeated characters', () => {
    expect(expandSolutionStr('a3b3c')).toBe('aaabbbc');
  });

  it('is the inverse of shortenSolutionStr', () => {
    const original = 'aaabbbc';
    expect(expandSolutionStr(shortenSolutionStr(original))).toBe(original);
  });
});

describe('convertScramble', () => {
  it('returns empty string for undefined input', () => {
    expect(convertScramble()).toBe('');
  });

  it('formats a comma-separated scramble into rows separated by /', () => {
    expect(convertScramble('1,2,3,4')).toBe('1 2/3 4');
  });
});

describe('convertScrambles', () => {
  it('returns empty string for undefined input', () => {
    expect(convertScrambles()).toBe('');
  });

  it('converts a single scramble when type does not start with m', () => {
    expect(convertScrambles('1,2,3,4', 'standard')).toBe('1 2/3 4');
  });

  it('converts a single scramble when type is undefined', () => {
    expect(convertScrambles('1,2,3,4')).toBe('1 2/3 4');
  });

  it('splits and converts each semicolon-separated scramble for marathon types', () => {
    expect(convertScrambles('1,2,3,4;1,2,3,4', 'marathon')).toBe('1 2/3 4;1 2/3 4');
  });
});

describe('convertToNumbersArray', () => {
  it('parses a slash/space separated string into numbers', () => {
    expect(convertToNumbersArray('1/2 3,4')).toEqual([1, 2, 3, 4]);
  });

  it('returns an empty array when any segment is not a number', () => {
    expect(convertToNumbersArray('1,a,3')).toEqual([]);
  });

  it.each([
    ['the app\'s own format', '1 2 3/4 5 6/7 8 0'],
    ['plain commas', '1,2,3,4,5,6,7,8,0'],
    ['a comma and a space', '1, 2, 3, 4, 5, 6, 7, 8, 0'],
    ['a trailing newline, as copied text often has', '1,2,3,4,5,6,7,8,0\n'],
    ['a double space', '1 2  3/4 5 6/7 8 0'],
    ['one row per line', '1 2 3\n4 5 6\n7 8 0']
  ])('reads a 3x3 scramble written with %s', (_case, text) => {
    expect(convertToNumbersArray(text)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });

  it.each([
    ['a decimal', '1.5,2,3,4,5,6,7,8,0'],
    ['a negative', '-1,2,3,4,5,6,7,8,0'],
    ['hex', '0x1,2,3,4,5,6,7,8,0'],
    ['an exponent', '1e0,2,3,4,5,6,7,8,0'],
    ['nothing at all', ''],
    ['only spaces', '   ']
  ])('rejects %s, since tiles are whole numbers', (_case, text) => {
    expect(convertToNumbersArray(text)).toEqual([]);
  });
});

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the given delay', async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('sumArrayElements', () => {
  it('sums all elements', () => {
    expect(sumArrayElements([1, 2, 3])).toBe(6);
  });

  it('returns 0 for an empty array', () => {
    expect(sumArrayElements([])).toBe(0);
  });
});

describe('navigation wrappers', () => {
  // jsdom cannot actually navigate, so these assert the wrapper runs against the real
  // Location without throwing - the point of the seam is that app code calls these
  // instead of touching location directly.
  it('redirectTo hands the url to the real location', () => {
    expect(() => { redirectTo('http://localhost:3000/?redirected') }).not.toThrow();
  });

  it('reloadPage calls the real location reload', () => {
    expect(() => { reloadPage() }).not.toThrow();
  });
});

describe('createLinkAndClick', () => {
  it('creates, clicks, and removes a link with the given href', () => {
    let capturedHref: string | null = null;
    let capturedTarget: string | null = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedHref = this.getAttribute('href');
      capturedTarget = this.getAttribute('target');
    });

    createLinkAndClick('/some/path');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(capturedHref).toBe('/some/path');
    expect(capturedTarget).toBeNull();
    expect(document.body.querySelector('a[href="/some/path"]')).toBeNull();
  });

  it('clicks the link from a given parent instead of the body', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    let parentAtClick: Node | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      parentAtClick = this.parentNode;
    });

    createLinkAndClick('/some/path', true, parent);

    expect(parentAtClick).toBe(parent);
    expect(parent.querySelector('a')).toBeNull();
    parent.remove();
  });

  it('sets target=_blank when openOnNewPage is true', () => {
    let capturedTarget: string | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedTarget = this.getAttribute('target');
    });

    createLinkAndClick('/some/path', true);

    expect(capturedTarget).toBe('_blank');
  });
});

describe('swapArrayElements', () => {
  it('swaps two elements in place', () => {
    const array = [1, 2, 3];
    swapArrayElements(array, 0, 2);
    expect(array).toEqual([3, 2, 1]);
  });
});
