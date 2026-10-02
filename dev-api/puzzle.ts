// Solve-path letters name the tile's move, so each one moves the blank the opposite way.
const BLANK_STEP: Record<string, (n: number) => number> = {
  L: () => 1,
  R: () => -1,
  U: (n) => n,
  D: (n) => -n
};
const INVERSE: Record<string, string> = { L: 'R', R: 'L', U: 'D', D: 'U' };

export function solvedOrders(numLines: number): number[] {
  return Array.from({ length: numLines * numLines }, (_, i) => (i + 1) % (numLines * numLines));
}

export function canMove(blank: number, letter: string, numLines: number): boolean {
  const col = blank % numLines;
  const row = Math.floor(blank / numLines);
  if (letter === 'L') return col < numLines - 1;
  if (letter === 'R') return col > 0;
  if (letter === 'U') return row < numLines - 1;
  return row > 0;
}

export function applyMove(orders: number[], letter: string, numLines: number): void {
  const blank = orders.indexOf(0);
  const target = blank + BLANK_STEP[letter](numLines);
  orders[blank] = orders[target];
  orders[target] = 0;
}

// A random walk away from the solved board: its reverse is a real solution of the scramble.
export function randomScramble(numLines: number, steps: number, random: () => number):
{ scramble: number[]; solvePath: string } {
  const orders = solvedOrders(numLines);
  const walk: string[] = [];
  while (walk.length < steps) {
    const blank = orders.indexOf(0);
    const options = ['L', 'R', 'U', 'D'].filter((letter) =>
      canMove(blank, letter, numLines) && letter !== INVERSE[walk.at(-1) ?? '']);
    const letter = options[Math.floor(random() * options.length)];
    applyMove(orders, letter, numLines);
    walk.push(letter);
  }
  return { scramble: orders, solvePath: walk.toReversed().map((letter) => INVERSE[letter]).join('') };
}

let distances3x3: Map<string, number> | undefined;

export function optimalMoves3x3(scramble: number[]): number {
  distances3x3 ??= distancesFromSolved3x3();
  return distances3x3.get(scramble.join(',')) ?? 0;
}

function distancesFromSolved3x3(): Map<string, number> {
  const start = solvedOrders(3);
  const distances = new Map([[start.join(','), 0]]);
  let frontier = [start];
  let depth = 0;
  while (frontier.length > 0) {
    depth += 1;
    const next: number[][] = [];
    for (const moved of frontier.flatMap(neighbours3x3)) {
      const key = moved.join(',');
      if (!distances.has(key)) {
        distances.set(key, depth);
        next.push(moved);
      }
    }
    frontier = next;
  }
  return distances;
}

function neighbours3x3(orders: number[]): number[][] {
  const blank = orders.indexOf(0);
  return ['L', 'R', 'U', 'D'].filter((letter) => canMove(blank, letter, 3)).map((letter) => {
    const moved = orders.slice();
    applyMove(moved, letter, 3);
    return moved;
  });
}

export function manhattan(scramble: number[], numLines: number): number {
  return scramble.reduce((sum, tile, index) => {
    if (tile === 0) return sum;
    const home = tile - 1;
    return sum + Math.abs(home % numLines - index % numLines) +
      Math.abs(Math.floor(home / numLines) - Math.floor(index / numLines));
  }, 0);
}
