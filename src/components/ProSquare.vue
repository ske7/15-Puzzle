<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useBaseStore } from '../stores/base';
import { Direction, ControlType } from '@/const';
import { useEventBus } from '@vueuse/core';
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
  useCanMove(currentElementIndex);
const { elementCol, elementRow } =
  useCanMove(cOrder);

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
    return 'var(--background-color)';
  }
  return getTileColor(baseStore.numLines, currentOrder.value);
});
const fontSizeD = computed(() => {
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
  return `${calculatedTop.value}px`;
});
const calculatedLeftBind = computed(() => {
  return `${calculatedLeft.value}px`;
});

const isFreeElement = computed(() => {
  return currentOrder.value === 0;
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

const moveByTouch = (e: TouchEvent): void => {
  if (baseStore.isMoving || !isFreeElement.value || isDoneAll.value || baseStore.paused) {
    return;
  }
  baseStore.isMoving = true;
  const posX = calculatedLeft.value + baseStore.boardPos.left;
  const posY = calculatedTop.value + baseStore.boardPos.top;
  if (e.touches[0].clientX > posX + props.squareSize &&
     e.touches[0].clientY >= baseStore.boardPos.top && e.touches[0].clientY <= baseStore.boardPos.bottom) {
    baseStore.moveLeft(ControlType.Touch);
    baseStore.isMoving = false;
    return;
  }
  if (e.touches[0].clientX < posX &&
    e.touches[0].clientY >= baseStore.boardPos.top && e.touches[0].clientY <= baseStore.boardPos.bottom) {
    baseStore.moveRight(ControlType.Touch);
    baseStore.isMoving = false;
    return;
  }
  if (e.touches[0].clientY > posY + props.squareSize &&
    e.touches[0].clientX >= baseStore.boardPos.left && e.touches[0].clientX <= baseStore.boardPos.right) {
    baseStore.moveUp(ControlType.Touch);
    baseStore.isMoving = false;
    return;
  }
  if (e.touches[0].clientY < posY &&
    e.touches[0].clientX >= baseStore.boardPos.left && e.touches[0].clientX <= baseStore.boardPos.right) {
    baseStore.moveDown(ControlType.Touch);
    baseStore.isMoving = false;
  }
  baseStore.isMoving = false;
};

const move = (control: ControlType): void => {
  if (baseStore.isMoving || cannotMove.value) {
    return;
  }
  baseStore.isMoving = true;
  let diff = Math.abs(baseStore.freeElementIndex + 1 - currentElementIndex.value);
  if ([Direction.Up, Direction.Down].includes(moveDirection.value)) {
    diff = diff / baseStore.numLines;
  }
  if (diff > 1) {
    for (let i = 0; i < diff; i++) {
      switch (moveDirection.value) {
        case Direction.Left:
          baseStore.moveLeft(control);
          break;
        case Direction.Right:
          baseStore.moveRight(control);
          break;
        case Direction.Up:
          baseStore.moveUp(control);
          break;
        case Direction.Down:
          baseStore.moveDown(control);
          break;
        default:
      }
    }
  } else {
    baseStore.saveState(currentElementIndex.value - 1, moveDirection.value, control);
  }
  baseStore.isMoving = false;
};
const moveByMouse = (event: MouseEvent): void => {
  if (!baseStore.hoverOnControl || event.ctrlKey) {
    return;
  }
  move(ControlType.Mouse);
};

const getCursor = computed(() => {
  if (baseStore.hoverOnControl || cannotMove.value) {
    return 'auto';
  }
  return 'pointer';
});

const eventBus = useEventBus<string>('event-bus');
const listener = (event: string, payload: unknown): void => {
  if (event === 'touchmove-from-board') {
    moveByTouch(payload as TouchEvent);
  }
};

onMounted(() => {
  initPosition();
  eventBus.on(listener);
});
onUnmounted(() => {
  eventBus.off(listener);
});
</script>

<template>
  <div
    :sid="currentElementIndex"
    class="pro-square"
    @mousedown.left="move(ControlType.Mouse)"
    @touchstart.prevent="move(ControlType.Touch)"
    @mousemove.prevent="moveByMouse"
  >
    {{ currentOrder === 0 ? '' : currentOrder }}
  </div>
</template>

<style scoped>
.pro-square {
  position: absolute;
  top: v-bind(calculatedTopBind);
  left: v-bind(calculatedLeftBind);
  width: v-bind(sizeVar);
  height: v-bind(sizeVar);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: v-bind(bgColor);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  transition: none;
  border-radius: v-bind(borderRadiusVar);
  box-sizing: border-box;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  z-index: 2;
  cursor: v-bind(getCursor);
  contain: layout size;
  font-size: v-bind(fontSizeD);
  font-weight: 600;
  color: #0a0a23;
  font-family: 'consolas', sans-serif;
}
@media screen and (max-width: 401px) {
  .pro-square {
    font-size: v-bind(fontSizeM);
  }
}
</style>
