<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBaseStore } from '../stores/base';

const props = defineProps<{
  squareSize: number;
  containerTop: number;
  containerLeft: number;
  containerBottom: number;
  containerRight: number;
  order: number;
  mixedOrder: number;
}>();

const baseStore = useBaseStore();
const square = ref();

const sizeVar = computed(() => {
  return `${props.squareSize}px`;
});

const actualOrder = computed(() => {
  return baseStore.actualOrders[props.order];
});

const calculatedLeft = computed(() => {
  return props.containerLeft + props.squareSize * ((actualOrder.value - 1) % baseStore.numLines);
});
const calculatedTop = computed(() => {
  return props.containerTop + props.squareSize * (Math.ceil(actualOrder.value / baseStore.numLines) - 1);
});

const isSquareInPlace = computed(() => {
  return actualOrder.value === props.mixedOrder;
});
const isDoneAll = computed(() => {
  return baseStore.isDone;
});
const paused = computed(() => {
  return baseStore.paused;
});

const isCaptured = ref(false);
const capture = () => {
  if (isDoneAll.value || paused.value) {
    return;
  }
  isCaptured.value = true;
};
const release = () => {
  isCaptured.value = false;
};

watch(
  isSquareInPlace,
  (value, oldValue) => {
    if (value && !oldValue && !baseStore.doResetList) {
      baseStore.orderedCount = baseStore.orderedCount + 1;
    }
    if (!value && oldValue) {
      baseStore.orderedCount = baseStore.orderedCount - 1;
    }
  },
  { immediate: true }
);

const renderFlag = ref(false);
watch([calculatedLeft, calculatedTop], () => {
  setTimeout(() => {
    renderFlag.value = true;
    setTimeout(() => {
      renderFlag.value = false;
    }, 15);
  }, 290);
});

enum Direction {
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4
}
const saveActualOrder = (moveDirection: Direction) => {
  const prevOrder = actualOrder.value;
  switch (moveDirection) {
    case Direction.Right:
      baseStore.actualOrders[props.order] = prevOrder + 1;
      break;
    case Direction.Left:
      baseStore.actualOrders[props.order] = prevOrder - 1;
      break;
    case Direction.Down:
      baseStore.actualOrders[props.order] = prevOrder + baseStore.numLines;
      break;
    case Direction.Up:
      baseStore.actualOrders[props.order] = prevOrder - baseStore.numLines;
      break;
    default:
  }
  baseStore.incMoves();
  baseStore.freeElement = prevOrder;
};

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

const move = () => {
  release();
  if (isDoneAll.value || paused.value) {
    return;
  }
  if (canMoveRight.value && calculatedLeft.value + props.squareSize < props.containerRight) {
    saveActualOrder(Direction.Right);
    return;
  }
  if (canMoveLeft.value && calculatedLeft.value > props.containerLeft) {
    saveActualOrder(Direction.Left);
    return;
  }
  if (canMoveDown.value && calculatedTop.value + props.squareSize < props.containerBottom) {
    saveActualOrder(Direction.Down);
    return;
  }
  if (canMoveUp.value && calculatedTop.value > props.containerTop) {
    saveActualOrder(Direction.Up);
  }
};
</script>

<template>
  <div
    ref="square"
    class="square"
    :class="{
      'in-place': isSquareInPlace,
      captured: isCaptured,
      'done-all': isDoneAll || paused,
      renderBg: renderFlag
    }"
    :style="{ top: `${calculatedTop}px`, left: `${calculatedLeft}px` }"
    @mousedown.left="capture"
    @mouseout.left="release"
    @touchstart.passive="capture"
    @touchend="release"
    @click="move"
  >
    <div class="item">
      <span>{{ props.mixedOrder }}</span>
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
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  transition: all 0.3s ease 0s;
  border-radius: 5px;
  box-sizing: border-box;
}
.captured {
  background-color: gold !important;
}
.renderBg {
  background-color: rgb(245, 245, 221) !important;
}
.in-place {
  background-color: rgb(224, 245, 250);
}
.done-all {
  cursor: auto;
}
.item {
  display: flex;
  justify-content: space-evenly;
  width: 100%;
  align-items: center;
}
.item span {
  font-size: 21px;
}
</style>
