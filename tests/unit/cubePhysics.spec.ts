import { describe, expect, it } from 'vitest';
import { GRAVITY, HALF_SIDE, MIN_JUMP, PERSPECTIVE, cubeExtents, dropCube, kickCube, stepCube, type CubeState } from '@/cubePhysics';

// The About modal's padding box on desktop.
const BOX = { width: 340, height: 390 };
const FRAME = 1 / 60;

function cube(fields: Partial<CubeState>): CubeState {
  return { x: 170, y: 150, vx: 0, vy: 0, ax: 0, ay: 0, az: 0, wx: 0, wy: 0, wz: 0, resting: false, touchedFloor: false, ...fields };
}

function run(state: CubeState, seconds: number, each?: (s: CubeState) => void): CubeState {
  let s = state;
  for (let t = 0; t < seconds; t += FRAME) {
    s = stepCube(s, FRAME, BOX);
    each?.(s);
  }
  return s;
}

function outside(s: CubeState): number {
  const ext = cubeExtents(s.ax, s.ay, s.az);
  return Math.max(ext.left - s.x, ext.top - s.y, s.x + ext.right - BOX.width, s.y + ext.bottom - BOX.height);
}

// A repeatable stand-in for Math.random.
function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

describe('cubeExtents', () => {
  it('is the front face, enlarged by perspective, when the cube faces the viewer', () => {
    const face = HALF_SIDE * PERSPECTIVE / (PERSPECTIVE - HALF_SIDE);
    const ext = cubeExtents(0, 0, 0);
    for (const side of [ext.left, ext.right, ext.top, ext.bottom]) {
      expect(side).toBeCloseTo(face);
    }
  });

  it('reaches the corners when the cube stands on an edge', () => {
    const ext = cubeExtents(0, 0, 45);
    expect(ext.left).toBeCloseTo(HALF_SIDE * Math.SQRT2 * PERSPECTIVE / (PERSPECTIVE - HALF_SIDE));
    expect(ext.bottom).toBeCloseTo(ext.left);
  });
});

describe('stepCube', () => {
  it('falls faster and faster', () => {
    const s1 = stepCube(cube({}), 0.1, BOX);
    const s2 = stepCube(s1, 0.1, BOX);
    expect(s1.vy).toBeGreaterThan(0);
    expect(s2.y - s1.y).toBeGreaterThan(s1.y - 150);
  });

  it('bounces off the floor with less speed than it hit it', () => {
    let before = 0;
    let after = 0;
    run(cube({ y: 300, vy: 600 }), 0.2, (s) => {
      if (s.vy < 0 && after === 0) {
        after = -s.vy;
      } else if (after === 0) {
        before = s.vy;
      }
    });
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it('bounces off the left, right and top sides', () => {
    expect(stepCube(cube({ x: 16, vx: -600 }), FRAME, BOX).vx).toBeGreaterThan(0);
    expect(stepCube(cube({ x: BOX.width - 16, vx: 600 }), FRAME, BOX).vx).toBeLessThan(0);
    expect(stepCube(cube({ y: 16, vy: -800 }), FRAME, BOX).vy).toBeGreaterThan(0);
  });

  it('only pushes the cube back in when a turning corner reaches a side it is moving away from', () => {
    const left = stepCube(cube({ x: 5, vx: 50 }), FRAME, BOX);
    const right = stepCube(cube({ x: BOX.width - 5, vx: -50 }), FRAME, BOX);
    const top = stepCube(cube({ y: 5, vy: 50 }), FRAME, BOX);
    expect(left.vx).toBeCloseTo(50, 0);
    expect(right.vx).toBeCloseTo(-50, 0);
    expect(top.vy).toBeGreaterThan(50);
    for (const s of [left, right, top]) {
      expect(outside(s)).toBeLessThanOrEqual(0);
    }
  });

  it('starts rolling the way it slides along the floor, and scuffing a wall spins it', () => {
    const rolling = run(cube({ y: BOX.height - 14, vx: 300 }), 0.3);
    expect(rolling.wz).toBeGreaterThan(0);
    const scuffed = stepCube(cube({ x: 16, vx: -600, vy: 400 }), FRAME, BOX);
    expect(scuffed.wz).toBeGreaterThan(0);
  });

  it('comes to rest lying flat on a face on the floor', () => {
    const s = run(dropCube(300, 30, 37, 81, () => 0.5), 12);
    expect(s.resting).toBe(true);
    for (const angle of [s.ax, s.ay, s.az]) {
      expect(Math.abs(angle % 90)).toBe(0);
    }
    expect(s.y + cubeExtents(s.ax, s.ay, s.az).bottom).toBeCloseTo(BOX.height - 1);
    expect(stepCube(s, FRAME, BOX)).toMatchObject({ resting: true, vx: 0, x: s.x });
  });

  it('reports touching the floor, but not a corner swinging down just after a kick', () => {
    let landed = false;
    run(cube({ y: 300, vy: 600 }), 0.2, (s) => {
      landed ||= s.touchedFloor;
    });
    expect(landed).toBe(true);
    const kicked = stepCube(kickCube(cube({ y: BOX.height - 14, resting: true }), 0, 0, () => 0.5), FRAME, BOX);
    expect(kicked.touchedFloor).toBe(false);
    expect(stepCube(cube({}), FRAME, BOX).touchedFloor).toBe(false);
  });

  it('never leaves the box, even through long frames and hard kicks', () => {
    const random = seeded(7);
    let s = dropCube(300, 30, 0, 0, random);
    let worst = -Infinity;
    for (let kick = 0; kick < 40; kick++) {
      s = run(s, 1, (step) => {
        worst = Math.max(worst, outside(step));
      });
      s = stepCube(kickCube(s, random() * 2 - 1, kick, random), 5, BOX);
      worst = Math.max(worst, outside(s));
    }
    expect(worst).toBeLessThanOrEqual(0);
  });
});

// Hands out the given values in turn, standing in for Math.random.
function draws(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('dropCube', () => {
  it('carries on from the angle it was turned to', () => {
    expect(dropCube(300, 30, 90, 135)).toMatchObject({ x: 300, y: 30, ax: 90, ay: 135, resting: false });
  });

  it('falls to either side, at a random speed', () => {
    expect(dropCube(300, 30, 0, 0, draws(0.2, 0, 0))).toMatchObject({ vx: -120, vy: -0 });
    expect(dropCube(300, 30, 0, 0, draws(0.8, 1, 1))).toMatchObject({ vx: 400, vy: -350 });
  });
});

describe('kickCube', () => {
  const onFloor = cube({ y: BOX.height - 14, resting: true });

  function apex(kicked: CubeState): number {
    let top = kicked.y;
    run(kicked, 1.5, (s) => {
      top = Math.min(top, s.y);
    });
    return onFloor.y - top;
  }

  it('jumps well up even on the weakest kick', () => {
    const kicked = kickCube(onFloor, 0, 0, () => 0);
    expect(kicked.resting).toBe(false);
    const height = apex(kicked);
    expect(height).toBeGreaterThan(onFloor.y * 0.35);
    expect(height).toBeLessThanOrEqual(onFloor.y * 0.4);
  });

  it('mostly jumps a catchable height, and only now and then reaches the top', () => {
    const heights = Array.from({ length: 1000 }, (_, i) => {
      return -kickCube(onFloor, 0, 0, draws((i + 0.5) / 1000, 0.5)).vy;
    }).map((vy) => vy ** 2 / (2 * GRAVITY) / onFloor.y);
    const share = (test: (h: number) => boolean) => heights.filter(test).length / heights.length;
    expect(share((h) => h < 0.55)).toBeGreaterThan(0.6);
    expect(share((h) => h >= 1)).toBeGreaterThan(0.15);
    expect(share((h) => h >= 1)).toBeLessThan(0.2);
  });

  it('makes high jumps rarer every third hit, down to a floor it never passes', () => {
    const topJumpShare = (hits: number): number => {
      const reaching = Array.from({ length: 1000 }, (_, i) => {
        return -kickCube(onFloor, 0, hits, draws((i + 0.5) / 1000, 0.5)).vy;
      }).filter((vy) => vy ** 2 / (2 * GRAVITY) >= onFloor.y);
      return reaching.length / 1000;
    };
    const shares = [0, 3, 9, 30].map(topJumpShare);
    expect(shares[0]).toBeGreaterThan(0.17);
    for (const [i, share] of shares.slice(1).entries()) {
      expect(share).toBeLessThan(shares[i]);
    }
    expect(shares.at(-1)).toBeGreaterThan(0.05);
    // Two hits later is the same jump; the third is what makes it harder.
    expect(topJumpShare(5)).toBe(topJumpShare(3));
    // It stops getting harder eventually, so a long round stays playable.
    expect(topJumpShare(90)).toBe(topJumpShare(30));
  });

  it('still lifts the cube well when it is hit near the top, where there is no room', () => {
    const nearTop = cube({ y: 30 });
    const kicked = kickCube(nearTop, 0, 0, () => 0);
    let lifted = 0;
    run(kicked, 1, (s) => {
      lifted = Math.max(lifted, 30 - s.y);
    });
    // It has only 30px of room, so it reaches the top and bounces back down instead.
    expect(kicked.vy ** 2 / (2 * GRAVITY)).toBeCloseTo(MIN_JUMP);
    expect(lifted).toBeGreaterThan(10);
  });

  it('never slows a cube that is already rising faster than the jump', () => {
    const rising = cube({ y: 200, vy: -900 });
    expect(kickCube(rising, 0, 0, () => 0).vy).toBe(-900);
    expect(kickCube(cube({ y: 200, vy: 400 }), 0, 0, () => 0).vy).toBe(-Math.sqrt(2 * GRAVITY * MIN_JUMP));
  });

  it('slams into the top on the strongest kick', () => {
    let hitTop = false;
    let rising = 0;
    run(kickCube(onFloor, 0, 0, () => 1), 1, (s) => {
      // Still flying up fast one frame and falling the next: only the top stops a cube like that.
      hitTop ||= rising < -300 && s.vy > 0;
      rising = s.vy;
    });
    expect(hitTop).toBe(true);
  });

  it('flies away from the side it was hit on', () => {
    expect(kickCube(onFloor, -1, 0, () => 0.5).vx).toBe(200);
    expect(kickCube(onFloor, 1, 0, () => 0.5).vx).toBe(-200);
  });

  it('keeps only half its sideways speed, so hits never build up speed', () => {
    expect(kickCube(cube({ vx: 300 }), 0, 0, () => 0.5).vx).toBe(150);
  });
});
