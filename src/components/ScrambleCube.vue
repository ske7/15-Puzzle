<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useEventListener, useIntervalFn, useRafFn } from '@vueuse/core';
import { getTileColor } from '@/colors';
import { generateAndShuffle, isSolvable } from '@/utils';
import { HALF_SIDE, dropCube, kickCube, stepCube, type CubeState } from '@/cubePhysics';
import { decodeRecord, encodeRecord } from '@/stores/recordCodec';

const emit = defineEmits<{ flying: [boolean] }>();

const FACES = 6;
const SIZE = 3;
const CELLS = SIZE * SIZE;
const RENEW_MS = 300;
const TILT_MS = 9000;
const SPIN_MS = 6000;
const BEST_KEY = 'cubeBestScore';
const BEST_CODE_WORD = 'heh6';

const newScramble = (): number[] => {
  let scramble = generateAndShuffle(CELLS);
  while (!isSolvable(scramble)) {
    scramble = generateAndShuffle(CELLS);
  }
  return scramble;
};

const faces = ref(Array.from({ length: FACES }, newScramble));

// One face at a time, so the cube keeps changing without every side flipping at once.
let nextFace = 0;
useIntervalFn(() => {
  faces.value[nextFace] = newScramble();
  nextFace = (nextFace + 1) % FACES;
}, RENEW_MS);

const cellColor = (cell: number): string => {
  return cell === 0 ? 'var(--background-color)' : getTileColor(SIZE, cell);
};

// Until the first click the CSS animation turns the cube; after it, physics moves it around the modal.
const pose = shallowRef<CubeState>();
// Hits in a row before the cube touches the floor.
const hits = ref(0);
const best = ref(readBest());
let box: HTMLElement | null = null;
let origin = { x: 0, y: 0 };
const startedAt = performance.now();

const { resume, pause } = useRafFn(({ delta }) => {
  /* v8 ignore next 3 */
  if (!pose.value || !box) {
    return;
  }
  pose.value = stepCube(pose.value, delta / 1000, { width: box.clientWidth, height: box.scrollHeight });
  if (pose.value.touchedFloor) {
    hits.value = 0;
  }
  if (pose.value.resting) {
    pause();
  }
}, { immediate: false });

// A narrower modal could leave a resting cube outside it, so let physics push it back in.
useEventListener(window, 'resize', () => {
  if (pose.value) {
    resume();
  }
});

watch(() => pose.value !== undefined && !pose.value.resting, (flying) => emit('flying', flying));

// On press rather than click: a fast cube can leave the pointer before the button comes up.
const toss = (event: PointerEvent): void => {
  event.preventDefault();
  const scene = event.currentTarget as HTMLElement;
  box = scene.parentElement;
  origin = { x: scene.offsetLeft + HALF_SIDE, y: scene.offsetTop + HALF_SIDE };
  if (pose.value) {
    pose.value = kickCube(pose.value, hitSide(event, scene), hits.value);
    hits.value++;
    if (hits.value > best.value) {
      best.value = hits.value;
      writeBest(best.value);
    }
  } else {
    pose.value = dropCube(origin.x, origin.y, ...idleAngles());
  }
  resume();
};

// Where the press landed across the cube, from -1 (left edge) to 1 (right edge).
const hitSide = (event: PointerEvent, scene: HTMLElement): number => {
  const rect = scene.getBoundingClientRect();
  if (rect.width === 0) {
    return 0;
  }
  const offset = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
  return Math.max(-1, Math.min(1, offset));
};

// Kept like the personal records, base64 behind a codeword, so a hand-edited score will not stick.
function readBest(): number {
  try {
    const decoded = decodeRecord(localStorage.getItem(BEST_KEY), BEST_CODE_WORD);
    return decoded.corrupt ? 0 : decoded.best.record;
  } catch {
    return 0;
  }
}

function writeBest(score: number): void {
  localStorage.setItem(BEST_KEY, encodeRecord(score, 0, BEST_CODE_WORD));
}

// Where the CSS animation has turned the cube to, so physics carries on from there.
const idleAngles = (): [number, number] => {
  const elapsed = performance.now() - startedAt;
  return [(elapsed % TILT_MS) / TILT_MS * 360, (elapsed % SPIN_MS) / SPIN_MS * 360];
};

const sceneStyle = computed(() => pose.value && { transform: `translate(${pose.value.x - origin.x}px, ${pose.value.y - origin.y}px)` });
const tumbleStyle = computed(() => pose.value && { transform: `rotateZ(${pose.value.az}deg) rotateX(${pose.value.ax}deg)` });
const cubeStyle = computed(() => pose.value && { transform: `rotateY(${pose.value.ay}deg)` });
</script>

<template>
  <p v-if="pose" class="cube-score">
    Hits: {{ hits }}<br>Best: {{ best }}
  </p>
  <div
    class="cube-scene"
    :class="{ dropped: pose }"
    :style="sceneStyle"
    aria-hidden="true"
    @pointerdown="toss"
  >
    <div class="cube-tumble" :style="tumbleStyle">
      <div class="cube" :style="cubeStyle">
        <div
          v-for="(scramble, face) in faces"
          :key="face"
          class="cube-face"
          :class="`face-${face}`"
        >
          <span
            v-for="(cell, index) in scramble"
            :key="index"
            class="cube-cell"
            :style="{ backgroundColor: cellColor(cell) }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cube-score {
  position: absolute;
  top: 10px;
  left: 12px;
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
  text-align: left;
  color: var(--score-color);
  font-weight: 600;
  pointer-events: none;
  user-select: none;
}
.cube-scene {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 24px;
  height: 24px;
  perspective: 300px;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
}
.cube-tumble {
  width: 24px;
  height: 24px;
  transform-style: preserve-3d;
  animation: cube-tilt 9s linear infinite;
}
.cube {
  position: relative;
  width: 24px;
  height: 24px;
  transform-style: preserve-3d;
  animation: cube-spin 6s linear infinite;
}
.dropped .cube-tumble,
.dropped .cube {
  animation: none;
}
.cube-face {
  position: absolute;
  width: 24px;
  height: 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background-color: var(--background-color);
  outline: 1px solid var(--border-color);
}
.cube-cell {
  display: block;
}
.face-0 {
  transform: translateZ(12px);
}
.face-1 {
  transform: rotateY(180deg) translateZ(12px);
}
.face-2 {
  transform: rotateY(90deg) translateZ(12px);
}
.face-3 {
  transform: rotateY(-90deg) translateZ(12px);
}
.face-4 {
  transform: rotateX(90deg) translateZ(12px);
}
.face-5 {
  transform: rotateX(-90deg) translateZ(12px);
}
@keyframes cube-spin {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}
@keyframes cube-tilt {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(360deg);
  }
}
</style>
