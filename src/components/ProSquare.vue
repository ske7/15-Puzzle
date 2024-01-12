<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useBaseStore } from '../stores/base';
import { Direction, ControlType } from '@/const';
import { useWindowSize } from '@vueuse/core';
import { useCanMove } from '../composables/useCanMove';
import { getTileColor } from '@/colors';
import { getArrayKeyByValue } from '@/utils';

const props = defineProps<{
  order: number;
  squareSize: number;
}>();

const baseStore = useBaseStore();

const currentOrder = computed(() => {
  return baseStore.currentOrders[props.order];
});
const currentElementIndex = computed(() => {
  return getArrayKeyByValue(baseStore.currentOrders, currentOrder.value) + 1;
});

const cOrder = computed(() => {
  return props.order + 1;
});
const { canMoveRight, canMoveLeft, canMoveUp, canMoveDown } =
  useCanMove(currentElementIndex, props.squareSize);
const { elementCol, elementRow } =
  useCanMove(cOrder, props.squareSize);

const sizeVar = computed(() => {
  return `${props.squareSize}px`;
});
const borderRadiusVar = computed(() => {
  const topLeft = elementCol.value === 1 && elementRow.value === 1 ? 8 : 0;
  const topRight = elementCol.value === baseStore.numLines && elementRow.value === 1 ? 8 : 0;
  const bottomRight = elementCol.value === baseStore.numLines && elementRow.value === baseStore.numLines ? 8 : 0;
  const bottomLeft = elementCol.value === 1 && elementRow.value === baseStore.numLines ? 8 : 0;
  return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
});
const bgColor = computed(() => {
  if (currentOrder.value === 0) {
    return baseStore.darkMode ? '#121212' : '#ffffff';
  }
  return getTileColor(baseStore.numLines, currentOrder.value);
});
const { width: windowWidth } = useWindowSize();
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

const calculatedLeft = ref(0);
const calculatedTop = ref(0);
const initPosition = (): void => {
  calculatedLeft.value = (Number(elementCol.value) - 1) * baseStore.spaceBetween +
      baseStore.spaceBetween + props.squareSize * (Number(elementCol.value) - 1);
  calculatedTop.value = (Number(elementRow.value) - 1) * baseStore.spaceBetween +
      baseStore.spaceBetween + props.squareSize * (Number(elementRow.value) - 1);
};
const calculatedTopBind = computed(() => {
  return `${calculatedTop.value.toFixed(1)}px`;
});
const calculatedLeftBind = computed(() => {
  return `${calculatedLeft.value.toFixed(1)}px`;
});

const isDoneAll = computed(() => {
  return baseStore.isDone;
});

const moveDirection = computed(() => {
  if (canMoveRight.value as boolean) {
    return Direction.Right;
  } else if (canMoveLeft.value as boolean) {
    return Direction.Left;
  } else if (canMoveUp.value as boolean) {
    return Direction.Up;
  } else if (canMoveDown.value as boolean) {
    return Direction.Down;
  }
  return Direction.None;
});
const cannotMove = computed(() => {
  return isDoneAll.value || baseStore.paused || moveDirection.value === Direction.None;
});

const move = (control: ControlType): void => {
  if (baseStore.isMoving || cannotMove.value) {
    return;
  }
  baseStore.isMoving = true;
  if (!baseStore.checkDiffBetweenElementsAndMove(currentElementIndex.value, moveDirection.value, control)) {
    baseStore.saveState(currentElementIndex.value - 1, moveDirection.value, control);
  }
  baseStore.isMoving = false;
};
const moveByMouse = (event: MouseEvent): void => {
  if (!(baseStore.hoverOnControl && baseStore.proMode) || event.ctrlKey) {
    return;
  }
  move(ControlType.Mouse);
};

const getCursor = computed(() => {
  if ((baseStore.hoverOnControl && baseStore.proMode) || cannotMove.value) {
    return 'auto';
  }
  return 'pointer';
});

watch(currentOrder, (newValue, oldValue) => {
  if (!baseStore.doneFirstMove) {
    return;
  }
  if (newValue === props.order + 1) {
    baseStore.inPlaceCount += 1;
  } else if (oldValue === props.order + 1) {
    baseStore.inPlaceCount -= 1;
  }
}, {
  immediate: false
});
watch(currentOrder, (newValue) => {
  setCanvasBg(bgColor.value);
  context.value!.fillStyle = '#0a0a23';
  context.value!.fillText(newValue === 0 ? '' : newValue.toString(), props.squareSize / 2, props.squareSize / 2);
}, {
  immediate: false
});

const squareCanvas = ref<HTMLCanvasElement | null>(null);
const context = ref<CanvasRenderingContext2D | null>(null);

const clearCanvas = (): void => {
  context.value!.clearRect(0, 0, props.squareSize, props.squareSize);
};
const setCanvasBg = (value: string): void => {
  clearCanvas();
  context.value!.fillStyle = value;
  context.value!.fillRect(0, 0, props.squareSize, props.squareSize);
};
onMounted(() => {
  initPosition();
  if (squareCanvas.value !== null) {
    squareCanvas.value.style.width = sizeVar.value;
    squareCanvas.value.style.height = sizeVar.value;
    const scale = window.devicePixelRatio;
    squareCanvas.value.width = Math.floor(props.squareSize * scale);
    squareCanvas.value.height = Math.floor(props.squareSize * scale);
    context.value = squareCanvas.value.getContext('2d');
    context.value!.scale(scale, scale);
    context.value!.font = `600 ${fontSizeD.value} consolas, sans-serif`;
    context.value!.textBaseline = 'middle';
    context.value!.textAlign = 'center';
    setCanvasBg(bgColor.value);
    context.value!.fillStyle = '#0a0a23';
    context.value!.fillText(currentOrder.value.toString() === '0' ? '' : currentOrder.value.toString(), props.squareSize / 2, props.squareSize / 2);
  }
});
</script>

<template>
  <div class="pro-square">
    <canvas
      ref="squareCanvas"
      class="canvas"
      :sid="currentElementIndex"
      :width="props.squareSize"
      :height="props.squareSize"
      @mousedown.left="move(ControlType.Mouse)"
      @touchstart.prevent="move(ControlType.Touch)"
      @mousemove.prevent="moveByMouse"
    />
  </div>
</template>

<style scoped>
.pro-square {
  position: absolute;
  width: v-bind(sizeVar);
  height: v-bind(sizeVar);
  top: v-bind(calculatedTopBind);
  left: v-bind(calculatedLeftBind);
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
  z-index: 2;
  contain: style size paint;
}
canvas {
  border-radius: v-bind(borderRadiusVar);
  cursor: v-bind(getCursor);
  contain: style size paint;
  width: 100%;
  height: 100%;
}
</style>
