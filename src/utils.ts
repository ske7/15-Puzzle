export function shuffle(array: readonly number[]): number[] {
  const length = array.length;
  if (length === 0) {
    return [];
  }
  let index = -1;
  const lastIndex = length - 1;
  const result = [...array];
  while (++index < length) {
    const rand = index + Math.floor(generateRand() * (lastIndex - index + 1));
    const value = result[rand];
    result[rand] = result[index];
    result[index] = value;
  }
  return result;
}

export function generateRand(): number {
  const value = window.crypto.getRandomValues(new Uint32Array(1))[0];
  return value / (Math.pow(2, 32) - 1);
}

export function* sequenceGenerator(minVal: number, maxVal: number): Generator<number> {
  let currVal = minVal;
  while (currVal < maxVal) yield currVal++;
}

export function generateAndShuffle(length: number, fromZero = true): number[] {
  return shuffle([...sequenceGenerator(fromZero ? 0 : 1, length)]);
}

export function generate(length: number, fromZero = true): number[] {
  return [...sequenceGenerator(fromZero ? 0 : 1, length)];
}

export function getArrayKeyByValue(array: readonly number[], value: number): number {
  return Number(Object.keys(array).find((key) => array[Number(key)] === value));
}

export function isSolvable(array: readonly number[]): boolean {
  const rowCount: number = Math.sqrt(array.length);
  const freeElement = array.findIndex((x) => x === 0) + 1;
  const freeElementRow = Math.ceil(freeElement / rowCount);
  let parity = 0;
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i] > array[j] && array[j] !== 0) {
        parity++;
      }
    }
  }
  if (rowCount % 2 === 0) {
    if (freeElementRow % 2 === 0) {
      return parity % 2 === 0;
    } else {
      return parity % 2 !== 0;
    }
  } else {
    return parity % 2 === 0;
  }
}

export function randArrayItem(array: readonly string[], af: readonly string[]): string {
  const a = array.filter(n => !af.includes(n));
  return a[Math.floor(generateRand() * a.length)];
}

export function getElementCol(el: number, numLines: number): number {
  const c = el % numLines;
  if (c === 0) {
    return numLines;
  }
  return c;
}

export function getElementRow(el: number, numLines: number): number {
  return Math.ceil(el / numLines);
}

export function calculateMD(array: readonly number[] | string[]): number {
  const length = array.length;
  if (length === 0) {
    return -1;
  }
  const n = Math.sqrt(length);
  if (Math.floor(n) !== +n) {
    return -1;
  }
  let md = 0;
  let currentCol, currentRow, inPlaceCol, inPlaceRow;
  array.forEach((value, i) => {
    if (Number(value) === 0) {
      return; // same as continue here
    }
    currentCol = getElementCol(Number(value), n);
    currentRow = getElementRow(Number(value), n);
    inPlaceCol = getElementCol(i + 1, n);
    inPlaceRow = getElementRow(i + 1, n);
    md += Math.abs(currentCol - inPlaceCol) + Math.abs(currentRow - inPlaceRow);
  });
  return md;
}

export function getSeconds(time: number): number {
  return Math.floor(time / 1000);
}

export function getMilliSeconds(time: number, longMode = false): string {
  const tr = time % 1000;
  if (tr === 0) {
    return longMode ? '.000' : '';
  }
  return `.${tr.toString().padStart(3, '0')}`;
}

export function displayedTime(time: number, longMode = false): string {
  return `${getSeconds(time)}${getMilliSeconds(time, longMode)}`;
}

export function isSorted(array: readonly number[]): boolean {
  return array.every((num, idx, arr) => {
    return (num <= arr[idx + 1]) || (idx === arr.length - 1) ? 1 : 0;
  });
}

export function calculateTPS(moves: number, time: number): string {
  if (time === 0) {
    return '0';
  }
  return (moves / time * 1000).toFixed(3);
}

export function shortenSolutionStr(str?: string): string {
  if (str == null) {
    return '';
  }
  if (str.length === 0) {
    return str;
  }
  let result = '';
  let currentChar = str[0];
  let charCount = 1;
  for (let i = 1; i < str.length; i++) {
    if (str[i] === currentChar) {
      charCount++;
    } else {
      result += currentChar;
      if (charCount > 1) {
        result += charCount;
      }
      currentChar = str[i];
      charCount = 1;
    }
  }
  result += currentChar;
  if (charCount > 1) {
    result += charCount;
  }
  return result;
}

export function expandSolutionStr(str: string): string {
  let result = '';
  let count = 1;
  let skipNext = false;
  for (let i = 0; i < str.length; i = i + (skipNext ? 2 : 1)) {
    const currentChar = str[i];
    const nextChar = str[i + 1];
    const nn = parseInt(nextChar, 10);
    skipNext = false;
    if (!isNaN(nn)) {
      count = nn;
      skipNext = true;
    }
    result += currentChar.repeat(count);
    count = 1;
  }
  return result;
}

export function convertScrambles(str?: string, type?: string): string {
  if (str == null) {
    return '';
  }
  if (type?.toLowerCase().slice(0, 1) === 'm') {
    const arr = str.split(';');
    let res = '';
    for (const item of arr) {
      res = `${res + convertScramble(item)};`;
    }
    return res.slice(0, -1);
  }
  return convertScramble(str);
}

export function convertScramble(str?: string): string {
  if (str == null) {
    return '';
  }
  const arr = str.split(',');
  const len = arr.length;
  const size = Math.sqrt(len);
  let result = '';
  for (let i = 0; i < len; i++) {
    result += arr[i];
    if (i !== len - 1) {
      if ((i + 1) % size === 0) {
        result += '/';
      } else {
        result += ' ';
      }
    }
  }
  return result;
}

export function convertToNumbersArray(str: string): number[] {
  const arr = str.replace(/[/\s]/g, ',').split(',');
  let incorrectArray = false;
  const numArray: number[] = [];
  for (const item of arr) {
    const n = Number(item);
    if (isNaN(n)) {
      incorrectArray = true;
      break;
    }
    numArray.push(n);
  }
  if (incorrectArray) {
    return [];
  }
  return numArray;
}

export async function sleep(delay: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export function sumArrayElements(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

export function createLinkAndClick(path: string, openOnNewPage = false): void {
  const link = document.createElement('a');
  link.setAttribute('href', path);
  if (openOnNewPage) {
    link.setAttribute('target', '_blank');
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function swapArrayElements(array: number[], index1: number, index2: number): void {
  [array[index1], array[index2]] = [array[index2], array[index1]];
}
