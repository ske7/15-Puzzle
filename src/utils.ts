export function shuffle(array: readonly number[]): number[] {
  const length = array.length;
  if (!length) {
    return [];
  }
  let index = -1;
  const lastIndex = length - 1;
  const result = [...array];
  while (++index < length) {
    const rand = index + Math.floor(Math.random() * (lastIndex - index + 1));
    const value = result[rand];
    result[rand] = result[index];
    result[index] = value;
  }
  return result;
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
  return a[Math.floor(Math.random() * a.length)];
}

export function getElementCol(el: number, numLines: number): number {
  const c = (el + 1) % numLines;
  if (c === 0) {
    return numLines;
  }
  return c;
}

export function getElementRow(el: number, numLines: number): number {
  return Math.ceil((el + 1) / numLines);
}

export function getMinutes(time: number): number {
  return Math.floor(time / (60 * 1000));
}

export function getSeconds(time: number): number {
  return Math.floor(time / 1000);
}

export function getMilliSeconds(time: number): string {
  const tr = time % 1000;
  if (tr === 0) {
    return '';
  }
  return `.${tr.toString().padStart(3, '0')}`;
}

export function displayedTime(time: number): string {
  return `${getSeconds(time)}${getMilliSeconds(time)}`;
}
