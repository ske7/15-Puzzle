<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDraggable } from '@vueuse/core';
import { useBaseStore } from '../stores/base';

const props = defineProps<{
  squareSize: number;
  top: number;
  left: number;
  containerTop: number;
  containerLeft: number;
  containerBottom: number;
  containerRight: number;
  order: number;
  rOrder: number;
}>();

const baseStore = useBaseStore();
const square = ref();

const sizeVar = computed(() => {
  return props.squareSize + 'px';
});

const actualOrder = ref(props.order + 1);
const currentX = ref(props.left);
const currentY = ref(props.top);

const canMoveUp = computed(() => {
  if (actualOrder.value - baseStore.numLines === baseStore.freeElement) {
    return true;
  }
  return false;
});

const canMoveDown = computed(() => {
  if (actualOrder.value + baseStore.numLines === baseStore.freeElement) {
    return true;
  }
  return false;
});

const canMoveRight = computed(() => {
  if (actualOrder.value + 1 === baseStore.freeElement) {
    return true;
  }
  return false;
});

const canMoveLeft = computed(() => {
  if (actualOrder.value - 1 === baseStore.freeElement) {
    return true;
  }
  return false;
});

const { x, y, isDragging } = useDraggable(square, {
  initialValue: { x: props.left, y: props.top }
});

const restrictedX = computed(() => {
  if (x.value >= currentX.value && !canMoveRight.value) {
    return currentX.value;
  }
  if (x.value <= currentX.value && !canMoveLeft.value) {
    return currentX.value;
  }
  if (canMoveRight.value && x.value >= currentX.value + props.squareSize) {
    return currentX.value + props.squareSize;
  }
  if (canMoveLeft.value && x.value <= currentX.value - props.squareSize) {
    return currentX.value - props.squareSize;
  }
  if (x.value >= props.containerRight - props.squareSize) {
    return props.containerRight - props.squareSize;
  }
  if (x.value <= props.containerLeft) {
    return props.containerLeft;
  }
  return x.value;
});

const restrictedY = computed(() => {
  if (y.value >= currentY.value && !canMoveDown.value) {
    return currentY.value;
  }
  if (y.value <= currentY.value && !canMoveUp.value) {
    return currentY.value;
  }
  if (canMoveDown.value && y.value >= currentY.value + props.squareSize) {
    return currentY.value + props.squareSize;
  }
  if (canMoveUp.value && y.value <= currentY.value - props.squareSize) {
    return currentY.value - props.squareSize;
  }
  if (y.value >= props.containerBottom - props.squareSize) {
    return props.containerBottom - props.squareSize;
  }
  if (y.value <= props.containerTop) {
    return props.containerTop;
  }
  return y.value;
});

const isCaptured = ref(false);
const capture = () => {
  isCaptured.value = true;
};
const release = () => {
  isCaptured.value = false;
  if (
    canMoveRight.value &&
    currentX.value + props.squareSize <= props.containerRight &&
    x.value - currentX.value >= props.squareSize / 2
  ) {
    currentX.value = currentX.value + props.squareSize;
    x.value = currentX.value;
    y.value = currentY.value;
    actualOrder.value = actualOrder.value + 1;
    baseStore.$patch({ freeElement: actualOrder.value - 1 });
    return;
  }
  if (
    canMoveRight.value &&
    currentX.value + props.squareSize <= props.containerRight &&
    x.value - currentX.value < props.squareSize / 2
  ) {
    x.value = currentX.value;
    y.value = currentY.value;
    return;
  }
  if (
    canMoveLeft.value &&
    currentX.value > props.containerLeft &&
    currentX.value - x.value >= props.squareSize / 2
  ) {
    currentX.value = currentX.value - props.squareSize;
    x.value = currentX.value;
    y.value = currentY.value;
    actualOrder.value = actualOrder.value - 1;
    baseStore.$patch({ freeElement: actualOrder.value + 1 });
    return;
  }
  if (
    canMoveLeft.value &&
    currentX.value > props.containerLeft &&
    currentX.value - x.value < props.squareSize / 2
  ) {
    x.value = currentX.value;
    y.value = currentY.value;
    return;
  }
  if (
    canMoveDown.value &&
    currentY.value + props.squareSize <= props.containerBottom &&
    y.value - currentY.value >= props.squareSize / 2
  ) {
    currentY.value = currentY.value + props.squareSize;
    x.value = currentX.value;
    y.value = currentY.value;
    actualOrder.value = actualOrder.value + baseStore.numLines;
    baseStore.$patch({ freeElement: actualOrder.value - baseStore.numLines });
    return;
  }
  if (
    canMoveDown.value &&
    currentY.value + props.squareSize <= props.containerBottom &&
    y.value - currentY.value < props.squareSize / 2
  ) {
    x.value = currentX.value;
    y.value = currentY.value;
    return;
  }
  if (
    canMoveUp.value &&
    currentY.value > props.containerTop &&
    currentY.value - y.value >= props.squareSize / 2
  ) {
    currentY.value = currentY.value - props.squareSize;
    x.value = currentX.value;
    y.value = currentY.value;
    actualOrder.value = actualOrder.value - baseStore.numLines;
    baseStore.$patch({ freeElement: actualOrder.value + baseStore.numLines });
    return;
  }
  if (
    canMoveUp.value &&
    currentY.value > props.containerTop &&
    currentY.value - y.value < props.squareSize / 2
  ) {
    x.value = currentX.value;
    y.value = currentY.value;
    return;
  }
  x.value = currentX.value;
  y.value = currentY.value;
};
watch(isDragging, (value) => {
  value ? capture() : release();
});
</script>

<template>
  <div
    ref="square"
    class="square"
    :class="{ captured: isCaptured, done: actualOrder === props.rOrder }"
    :style="{
      top: `${restrictedY}px`,
      left: `${restrictedX}px`
    }"
  >
    <div class="item">
      <span>{{ props.rOrder }}</span>
    </div>
  </div>
</template>

<style scoped>
.square {
  position: fixed;
  width: v-bind(sizeVar);
  height: v-bind(sizeVar);
  border: 1px solid blue;
  cursor: pointer;
  display: flex;
  justify-content: center;
  background-color: beige;
  user-select: none;
  z-index: 0;
}
.captured {
  background-color: gold;
  z-index: 1000;
}
.done {
  background-color: rgb(224, 245, 250);
}
.item {
  display: flex;
  justify-content: space-evenly;
  width: 100%;
  align-items: center;
}
</style>
