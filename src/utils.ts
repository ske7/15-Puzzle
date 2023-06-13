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
