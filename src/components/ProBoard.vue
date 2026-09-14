<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRaw, watch } from 'vue';
import { useBaseStore } from '../stores/base';
import { useBoardCanvas } from '../composables/useBoardCanvas';
import { useWindowWidth } from '../composables/useWindowWidth';

const props = defineProps<{
  squareSize: number;
}>();

const baseStore = useBaseStore();
const windowWidth = useWindowWidth();

const fontSizeM = computed(() => {
  if (baseStore.numLines === 6) {
    return '29px';
  } else if (baseStore.numLines === 7) {
    return '25px';
  } else if (baseStore.numLines === 8) {
    return '24px';
  } else {
    return '33px';
  }
});
const fontSizeD = computed(() => {
  if (windowWidth.value < 401) {
    return fontSizeM.value;
  }
  if (baseStore.numLines === 6) {
    return '39px';
  } else if (baseStore.numLines === 7) {
    return '35px';
  } else if (baseStore.numLines === 8) {
    return '33px';
  } else {
    return '45px';
  }
});
const font = computed(() => `600 ${fontSizeD.value} consolas, sans-serif`);
const blankColor = computed(() => baseStore.darkMode ? '#121212' : '#ffffff');

const boardCanvas = ref<HTMLCanvasElement | null>(null);
const canvas = useBoardCanvas({
  numLines: () => baseStore.numLines,
  squareSize: () => props.squareSize,
  font,
  blankColor
});

let painted: number[] = [];
const dirty = new Set<number>();
let frame = 0;

const flush = (): void => {
  frame = 0;
  for (const index of dirty) {
    canvas.paintCell(index, painted[index]);
  }
  dirty.clear();
};

const scheduleFlush = (): void => {
  if (frame !== 0) {
    return;
  }
  frame = requestAnimationFrame(flush);
};

const syncOrders = (): void => {
  const orders = toRaw(baseStore.currentOrders);
  let inPlace = 0;
  for (let index = 0; index < orders.length; index += 1) {
    const value = orders[index];
    if (value === index + 1) {
      inPlace += 1;
    }
    if (painted[index] !== value) {
      painted[index] = value;
      dirty.add(index);
    }
  }
  if (baseStore.doneFirstMove) {
    baseStore.inPlaceCount = inPlace;
  }
  scheduleFlush();
};

const redraw = (): void => {
  canvas.resize();
  painted = toRaw(baseStore.currentOrders).slice();
  dirty.clear();
  canvas.paintAll(painted);
};

watch(() => baseStore.currentOrders, syncOrders, { deep: true });
watch([() => baseStore.numLines, () => props.squareSize, font, blankColor], redraw);

onMounted(() => {
  canvas.attach(boardCanvas.value);
  redraw();
});

onUnmounted(() => {
  if (frame !== 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  canvas.attach(null);
});
</script>

<template>
  <canvas ref="boardCanvas" class="board-canvas" />
</template>

<style scoped>
.board-canvas {
  position: absolute;
  border-radius: 8px;
  z-index: var(--z-tile);
  -webkit-tap-highlight-color: transparent;
}
</style>
