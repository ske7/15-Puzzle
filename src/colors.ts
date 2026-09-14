function tileBands(puzzleSize: number): number[][] {
  const bands: number[][] = [];
  let top = 1, left = 1;
  const bottom = puzzleSize, right = puzzleSize;
  let peelRow = true;
  while (!(top === bottom && left === right)) {
    const band: number[] = [];
    if (peelRow) {
      for (let col = left; col <= right; col++) {
        band.push((top - 1) * puzzleSize + col);
      }
      top++;
    } else {
      for (let row = top; row <= bottom; row++) {
        band.push((row - 1) * puzzleSize + left);
      }
      left++;
    }
    bands.push(band);
    peelRow = !peelRow;
  }
  return bands;
}

const BAND_COLORS: Record<number, string[]> = {
  3: ['#ff6767', '#fff054', '#7eff64', '#89dcff'],
  4: ['#ff6767', '#fff054', '#7eff64', '#7effde', '#8eb3fe', '#cd88fe'],
  5: ['#ff6767', '#ffc74c', '#fff054', '#7eff64', '#7effde', '#84c8ff', '#9b95ff', '#cd88fe'],
  6: ['#ff6767', '#ffb355', '#eeff53', '#94ff5b', '#69ff87', '#77ffdd', '#83dadd', '#8b9cff', '#bb8dff', '#f989ff'],
  7: ['#ff6767', '#ffa357', '#fff153', '#c1ff57', '#7bff61', '#6bff95', '#79ffde', '#83e6ff', '#8bb2ff', '#9a8dff', '#cf8dff', '#ff85fb'],
  8: ['#ff6767', '#ff9959', '#ffda53', '#e3ff55', '#a2ff5b', '#6bff63', '#6fffa1', '#79ffde', '#83eeff', '#89c0ff', '#8d97ff', '#b18dff', '#dc8bff', '#ff83f3']
};

function buildColorLookup(puzzleSize: number): string[] {
  const lookup: string[] = [];
  tileBands(puzzleSize).forEach((band, bandIndex) => {
    for (const tile of band) {
      lookup[tile] = BAND_COLORS[puzzleSize][bandIndex];
    }
  });
  return lookup;
}

const colorLookupCache = new Map<number, string[]>();
function cachedColorLookup(puzzleSize: number): string[] {
  let lookup = colorLookupCache.get(puzzleSize);
  if (lookup == null) {
    lookup = buildColorLookup(puzzleSize);
    colorLookupCache.set(puzzleSize, lookup);
  }
  return lookup;
}

export function getTileColor(puzzleSize: number, tileNumber: number): string {
  if (!(puzzleSize in BAND_COLORS)) {
    return 'var(--square-bg-color)';
  }
  return cachedColorLookup(puzzleSize)[tileNumber] ?? '#ffffff';
}
