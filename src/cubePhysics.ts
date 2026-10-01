export interface CubeState {
  // Centre, in the container's padding box (px).
  x: number;
  y: number;
  // Velocity (px/s).
  vx: number;
  vy: number;
  // Rotation as the CSS transform applies it: rotateZ(az) rotateX(ax) rotateY(ay), in degrees.
  ax: number;
  ay: number;
  az: number;
  // Angular velocity (deg/s).
  wx: number;
  wy: number;
  wz: number;
  resting: boolean;
  // Whether it came down on the floor during the last step, rather than taking off from it.
  touchedFloor: boolean;
}

export interface Bounds {
  width: number;
  height: number;
}

export const HALF_SIDE = 12;
export const PERSPECTIVE = 300;

// Low enough that the cube hangs in the air long enough to be caught again.
export const GRAVITY = 500;
const FLOOR_BOUNCE = 0.6;
const WALL_BOUNCE = 0.8;
const AIR_DRAG = 0.15;
const ROLLING_DRAG = 0.8;
// Share of the sliding at the contact point that one impact turns into spin.
const IMPACT_GRIP = 0.5;
// m·r²/I for a solid cube (I = m·s²/6) pushed at half its side.
const SPIN_SHARE = 1.5;
// Below this, a landing no longer bounces: the cube stays on the floor.
const SETTLE_SPEED = 40;
// The power curve for a jump: a higher number makes the strongest jumps rarer.
// Every hit lifts the cube at least this far, so a hit near the ceiling still reads as a hit.
export const MIN_JUMP = 110;
const HIGH_JUMP_RARITY = 5;
const HITS_PER_STEP = 3;
const MAX_HARDER_STEPS = 10;
const MAX_STEP = 1 / 240;
const MAX_FRAME = 0.1;
// A pixel of room, so rounding in the browser's projection never pokes out of the box.
const MARGIN = 1;

export function stepCube(state: CubeState, seconds: number, bounds: Bounds): CubeState {
  const next = { ...state, touchedFloor: false };
  const frame = Math.min(seconds, MAX_FRAME);
  // At least one, so a zero-length first frame still pushes the cube back inside a resized box.
  const steps = Math.max(1, Math.ceil(frame / MAX_STEP));
  for (let i = 0; i < steps; i++) {
    substep(next, frame / steps, bounds);
  }
  return next;
}

export function dropCube(x: number, y: number, ax: number, ay: number, random = Math.random): CubeState {
  return {
    x, y, ax, ay, az: 0,
    vx: (random() < 0.5 ? -1 : 1) * (120 + random() * 280),
    vy: -random() * 350,
    wx: 40,
    wy: 60,
    wz: 0,
    resting: false,
    touchedFloor: false
  };
}

// A jump of random power: usually about half way up, now and then past the top, where it hits the ceiling.
// push, from -1 to 1, is where the cube was hit from its centre: it flies away from that side.
// hits is how many the player has already made this round: every third one makes a high jump rarer,
// so the longer they keep the cube up, the less time each jump gives them.
export function kickCube(state: CubeState, push: number, hits = 0, random = Math.random): CubeState {
  const rarity = HIGH_JUMP_RARITY + Math.min(MAX_HARDER_STEPS, Math.floor(hits / HITS_PER_STEP));
  const height = Math.max(MIN_JUMP, state.y * (0.4 + random() ** rarity * 1.6));
  return {
    ...state,
    vx: state.vx * 0.5 - push * 200 + (random() - 0.5) * 350,
    // Never slower than it was already rising, so a hit on the way up never holds the cube back.
    vy: Math.min(-Math.sqrt(2 * GRAVITY * height), state.vy),
    wx: (random() - 0.5) * 360,
    wy: (random() - 0.5) * 360,
    resting: false,
    touchedFloor: false
  };
}

export function cubeExtents(ax: number, ay: number, az: number): { left: number; right: number; top: number; bottom: number } {
  const [sx, cx] = [Math.sin(rad(ax)), Math.cos(rad(ax))];
  const [sy, cy] = [Math.sin(rad(ay)), Math.cos(rad(ay))];
  const [sz, cz] = [Math.sin(rad(az)), Math.cos(rad(az))];
  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;
  for (const px of [-HALF_SIDE, HALF_SIDE]) {
    for (const py of [-HALF_SIDE, HALF_SIDE]) {
      for (const pz of [-HALF_SIDE, HALF_SIDE]) {
        // rotateY, then rotateX, then rotateZ, as CSS composes the nested transforms.
        const x1 = px * cy + pz * sy;
        const z1 = -px * sy + pz * cy;
        const y2 = py * cx - z1 * sx;
        const z2 = py * sx + z1 * cx;
        const x3 = x1 * cz - y2 * sz;
        const y3 = x1 * sz + y2 * cz;
        const scale = PERSPECTIVE / (PERSPECTIVE - z2);
        left = Math.max(left, -x3 * scale);
        right = Math.max(right, x3 * scale);
        top = Math.max(top, -y3 * scale);
        bottom = Math.max(bottom, y3 * scale);
      }
    }
  }
  return { left, right, top, bottom };
}

function substep(s: CubeState, dt: number, bounds: Bounds): void {
  s.vy += GRAVITY * dt;
  const drag = Math.exp(-AIR_DRAG * dt);
  s.vx *= drag;
  s.vy *= drag;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.ax += s.wx * dt;
  s.ay += s.wy * dt;
  s.az += s.wz * dt;
  collide(s, dt, bounds);
}

function collide(s: CubeState, dt: number, bounds: Bounds): void {
  const ext = cubeExtents(s.ax, s.ay, s.az);
  if (s.x - ext.left < MARGIN) {
    s.x = MARGIN + ext.left;
    if (s.vx < 0) {
      s.vx = -s.vx * WALL_BOUNCE;
      [s.vy, s.wz] = scuff(s.vy, s.wz, -1, IMPACT_GRIP);
    }
  }
  if (s.x + ext.right > bounds.width - MARGIN) {
    s.x = bounds.width - MARGIN - ext.right;
    if (s.vx > 0) {
      s.vx = -s.vx * WALL_BOUNCE;
      [s.vy, s.wz] = scuff(s.vy, s.wz, 1, IMPACT_GRIP);
    }
  }
  if (s.y - ext.top < MARGIN) {
    s.y = MARGIN + ext.top;
    if (s.vy < 0) {
      s.vy = -s.vy * WALL_BOUNCE;
      [s.vx, s.wz] = scuff(s.vx, s.wz, 1, IMPACT_GRIP);
    }
  }
  if (s.y + ext.bottom > bounds.height - MARGIN) {
    s.y = bounds.height - MARGIN - ext.bottom;
    // A corner swinging down just after a kick is not a landing.
    s.touchedFloor ||= s.vy >= 0;
    land(s, dt);
  }
}

function land(s: CubeState, dt: number): void {
  if (s.vy > SETTLE_SPEED) {
    s.vy = -s.vy * FLOOR_BOUNCE;
    s.wx *= 0.7;
    s.wy *= 0.7;
    [s.vx, s.wz] = scuff(s.vx, s.wz, -1, IMPACT_GRIP);
    return;
  }
  s.vy = Math.min(s.vy, 0);
  roll(s, dt);
}

// On the floor: it rolls, friction slows it, and once slow it tips flat onto a face.
function roll(s: CubeState, dt: number): void {
  [s.vx, s.wz] = scuff(s.vx, s.wz, -1, Math.min(1, 8 * dt));
  s.vx *= Math.exp(-ROLLING_DRAG * dt);
  const grip = Math.exp(-6 * dt);
  s.wx *= grip;
  s.wy *= grip;
  if (Math.abs(s.vx) > 20) {
    return;
  }
  const pull = Math.min(1, 10 * dt);
  s.ax += (nearestFace(s.ax) - s.ax) * pull;
  s.ay += (nearestFace(s.ay) - s.ay) * pull;
  s.az += (nearestFace(s.az) - s.az) * pull;
  s.wz *= grip;
  s.vx *= grip;
  const flat = [s.ax, s.ay, s.az].every((a) => Math.abs(nearestFace(a) - a) < 0.2);
  if (flat && Math.abs(s.vx) < 1 && Math.abs(s.wx) + Math.abs(s.wy) + Math.abs(s.wz) < 3) {
    Object.assign(s, { ax: nearestFace(s.ax), ay: nearestFace(s.ay), az: nearestFace(s.az) });
    Object.assign(s, { vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, resting: true });
  }
}

// Friction at the contact point trades sliding for spin, as a cube scuffing a wall does.
// side is which way positive spin moves the contact point along the surface.
function scuff(along: number, wz: number, side: number, share: number): [number, number] {
  const slip = along + side * rad(wz) * HALF_SIDE;
  const change = share * slip / (1 + SPIN_SHARE);
  return [along - change, wz - side * deg(change * SPIN_SHARE / HALF_SIDE)];
}

function nearestFace(angle: number): number {
  return Math.round(angle / 90) * 90;
}

function rad(angle: number): number {
  return angle * Math.PI / 180;
}

function deg(angle: number): number {
  return angle * 180 / Math.PI;
}
