export function shuffle(array: number[]): number[] {
  const length = array === null ? 0 : array.length;
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

export function* sequenceGenerator(minVal: number, maxVal: number) {
  let currVal = minVal;
  while (currVal < maxVal) yield currVal++;
}

export function generateAndShuffle(length: number): number[] {
  return shuffle([...sequenceGenerator(1, length)]);
}

export function generate(length: number): number[] {
  return [...sequenceGenerator(1, length)];
}

export function getArrayKeyByValue(array: number[], value: number): number {
  return Number(Object.keys(array).find((key) => array[Number(key)] === value));
}

export function isSolvable(array: number[], freeElement: number): boolean {
  const inArray: number[] = array.slice(0);
  inArray.push(0);
  const rowCount: number = Math.sqrt(inArray.length);
  const freeElementRow = Math.ceil(freeElement / rowCount);

  let parity = 0;
  for (let i = 0; i < inArray.length; i++) {
    for (let j = i + 1; j < inArray.length; j++) {
      if (inArray[i] > inArray[j] && inArray[j] !== 0) {
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
