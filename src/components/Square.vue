<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBaseStore, Direction } from '../stores/base';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  squareSize: number;
  containerTop: number;
  containerLeft: number;
  containerBottom: number;
  containerRight: number;
  order: number;
  mixedOrder: number;
  spaceBetween: number;
}>();

const baseStore = useBaseStore();

const sizeVar = computed(() => {
  return `${props.squareSize}px`;
});

const actualOrder = computed(() => {
  return baseStore.actualOrders[props.order];
});

const calculatedLeft = computed(() => {
  return (
    props.containerLeft +
    (actualOrder.value % baseStore.numLines) * props.spaceBetween +
    props.spaceBetween +
    props.squareSize * (actualOrder.value % baseStore.numLines)
  );
});
const calculatedTop = computed(() => {
  return (
    props.containerTop +
    Math.floor(actualOrder.value / baseStore.numLines) * props.spaceBetween +
    props.spaceBetween +
    props.squareSize * (Math.ceil((actualOrder.value + 1) / baseStore.numLines) - 1)
  );
});

const isSquareInPlace = computed(() => {
  return actualOrder.value + 1 === props.mixedOrder;
});
const isDoneAll = computed(() => {
  return baseStore.isDone;
});

const canMoveRight = computed(() => {
  return actualOrder.value + 1 === baseStore.freeElement && (actualOrder.value + 1) % baseStore.numLines !== 0;
});
const canMoveLeft = computed(() => {
  return actualOrder.value - 1 === baseStore.freeElement && actualOrder.value % baseStore.numLines !== 0;
});
const canMoveUp = computed(() => {
  return actualOrder.value - baseStore.numLines === baseStore.freeElement;
});
const canMoveDown = computed(() => {
  return actualOrder.value + baseStore.numLines === baseStore.freeElement;
});
const moveDirection = computed(() => {
  if (canMoveRight.value) {
    return Direction.Right;
  } else if (canMoveLeft.value) {
    return Direction.Left;
  } else if (canMoveUp.value) {
    return Direction.Up;
  } else if (canMoveDown.value) {
    return Direction.Down;
  }
  return Direction.None;
});
const cannotMove = computed(() => {
  return isDoneAll.value || baseStore.paused || moveDirection.value === Direction.None;
});

const isCaptured = ref(false);
const capture = () => {
  if (cannotMove.value) {
    return;
  }
  isCaptured.value = true;
};
const release = () => {
  if (isDoneAll.value) {
    return;
  }
  isCaptured.value = false;
};

const move = () => {
  release();
  if (cannotMove.value) {
    return;
  }
  baseStore.saveActualOrder(props.order, moveDirection.value);
};

const renderFlag = ref(false);
watch([calculatedLeft, calculatedTop], () => {
  setTimeout(() => {
    if (isDoneAll.value) {
      return;
    }
    renderFlag.value = true;
    setTimeout(() => {
      renderFlag.value = false;
    }, 15);
  }, 290);
});

watch(
  isDoneAll,
  (newValue) => {
    if (newValue && props.mixedOrder !== 0) {
      setTimeout(() => {
        isCaptured.value = true;
        baseStore.afterDoneCount += 1;
      }, actualOrder.value * 70);
    }
  },
  { immediate: true }
);

const { doResetList } = storeToRefs(baseStore);
watch(
  doResetList,
  (value, oldValue) => {
    if (value && !oldValue) {
      isCaptured.value = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="square"
    :class="{
      free: props.mixedOrder === 0,
      'in-place': isSquareInPlace,
      captured: isCaptured,
      'cur-auto': cannotMove,
      'render-bg': renderFlag
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
  border: 1px solid rgba(136, 165, 191, 0.3);
  cursor: pointer;
  display: flex;
  justify-content: center;
  background-color: beige;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  transition: all 0.3s ease 0s;
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.2);
  -webkit-tap-highlight-color: transparent;
}
.captured {
  background-color: gold !important;
}
.render-bg {
  background-color: rgb(245, 245, 221) !important;
}
.in-place {
  background-color: rgb(224, 245, 250);
}
.free {
  display: none;
}
.item {
  display: flex;
  justify-content: space-evenly;
  width: 100%;
  align-items: center;
}
.item span {
  font-size: 21px;
  font-weight: 500;
  color: #0a0a23;
}
</style>
