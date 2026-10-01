import type { Page } from '@playwright/test';

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

const ARROW_KEYS: ArrowKey[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

// Mirrors the real swap semantics in src/stores/base.ts's moveLeft/moveRight/moveUp/moveDown:
// each one slides the blank's named-direction neighbor into the blank's slot.
function isValidMove(key: ArrowKey, freeIndex: number, numLines: number): boolean {
  switch (key) {
    case 'ArrowLeft': return (freeIndex + 1) % numLines !== 0;
    case 'ArrowRight': return freeIndex % numLines !== 0;
    case 'ArrowUp': return freeIndex + numLines < numLines * numLines;
    case 'ArrowDown': return freeIndex >= numLines;
  }
}

function targetIndex(key: ArrowKey, freeIndex: number, numLines: number): number {
  switch (key) {
    case 'ArrowLeft': return freeIndex + 1;
    case 'ArrowRight': return freeIndex - 1;
    case 'ArrowUp': return freeIndex + numLines;
    case 'ArrowDown': return freeIndex - numLines;
  }
}

// The first arrow legal from this blank position, and where the blank lands - for a test
// that needs exactly one real move rather than a whole solution. Pressing all four arrows
// instead can return the blank to where it started, since they cancel in pairs.
export function firstLegalMove(freeIndex: number, numLines: number): { key: ArrowKey; target: number } {
  const key = ARROW_KEYS.find((candidate) => isValidMove(candidate, freeIndex, numLines))!;
  return { key, target: targetIndex(key, freeIndex, numLines) };
}

function goalState(numLines: number): number[] {
  const n = numLines * numLines;
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}

interface Parent {
  prevKey: string;
  move: ArrowKey;
}

function reconstructPath(parent: Map<string, Parent>, goalKey: string): ArrowKey[] {
  const moves: ArrowKey[] = [];
  let key = goalKey;
  while (parent.has(key)) {
    const step = parent.get(key)!;
    moves.push(step.move);
    key = step.prevKey;
  }
  return moves.reverse();
}

// Real breadth-first search over the sliding-puzzle state graph, from the app's actual
// scramble to the solved state - tractable for the sizes this suite drives (3x3: ~181k
// reachable states), so it always finds a true shortest real move sequence.
export function solve(startBoard: number[], numLines: number): ArrowKey[] {
  const goalKey = goalState(numLines).join(',');
  const startKey = startBoard.join(',');
  if (startKey === goalKey) {
    return [];
  }

  const parent = new Map<string, Parent>();
  const visited = new Set<string>([startKey]);
  const queue: number[][] = [startBoard];

  while (queue.length > 0) {
    const board = queue.shift()!;
    const key = board.join(',');
    const freeIndex = board.indexOf(0);

    for (const move of ARROW_KEYS) {
      if (!isValidMove(move, freeIndex, numLines)) {
        continue;
      }
      const target = targetIndex(move, freeIndex, numLines);
      const next = board.slice();
      next[freeIndex] = next[target];
      next[target] = 0;
      const nextKey = next.join(',');
      if (visited.has(nextKey)) {
        continue;
      }
      visited.add(nextKey);
      parent.set(nextKey, { prevKey: key, move });
      if (nextKey === goalKey) {
        return reconstructPath(parent, nextKey);
      }
      queue.push(next);
    }
  }
  throw new Error('No solution found - a real app-generated scramble should always be solvable.');
}

// For suites that solve many 3x3 scrambles: one breadth-first pass out from the solved state
// records every reachable board's distance, after which each solve just steps downhill.
let distances3x3: Map<string, number> | undefined;

export function solve3x3(startBoard: number[]): ArrowKey[] {
  distances3x3 ??= distancesFromGoal(3);
  const moves: ArrowKey[] = [];
  let board = startBoard;
  let distance = distances3x3.get(board.join(','))!;
  while (distance > 0) {
    const freeIndex = board.indexOf(0);
    for (const move of ARROW_KEYS) {
      if (!isValidMove(move, freeIndex, 3)) {
        continue;
      }
      const next = board.slice();
      const target = targetIndex(move, freeIndex, 3);
      next[freeIndex] = next[target];
      next[target] = 0;
      if (distances3x3.get(next.join(',')) === distance - 1) {
        moves.push(move);
        board = next;
        distance -= 1;
        break;
      }
    }
  }
  return moves;
}

function distancesFromGoal(numLines: number): Map<string, number> {
  const goal = goalState(numLines);
  const distances = new Map<string, number>([[goal.join(','), 0]]);
  const queue: number[][] = [goal];
  for (const board of queue) {
    const distance = distances.get(board.join(','))!;
    const freeIndex = board.indexOf(0);
    for (const move of ARROW_KEYS) {
      if (!isValidMove(move, freeIndex, numLines)) {
        continue;
      }
      const next = board.slice();
      const target = targetIndex(move, freeIndex, numLines);
      next[freeIndex] = next[target];
      next[target] = 0;
      const key = next.join(',');
      if (!distances.has(key)) {
        distances.set(key, distance + 1);
        queue.push(next);
      }
    }
  }
  return distances;
}

export const MOVE_LETTER: Record<ArrowKey, string> = {
  ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D'
};

export async function driveMoves(page: Page, moves: ArrowKey[]): Promise<void> {
  for (const move of moves) {
    await page.keyboard.press(move);
  }
}
