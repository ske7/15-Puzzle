<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { useBaseStore } from '../stores/base';
import { Direction } from '../stores/const';
import { storeToRefs } from 'pinia';

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

const sizeVar = computed(() => {
  return `${props.squareSize}px`;
});
const borderRadiusVar = computed(() => {
  if (baseStore.cageMode) {
    return '0px';
  }
  return '8px';
});

const actualOrder = computed(() => {
  return baseStore.actualOrders[props.order];
});

const calculatedLeft = computed(() => {
  return (
    props.containerLeft +
    (actualOrder.value % baseStore.numLines) * baseStore.spaceBetween +
    baseStore.spaceBetween +
    props.squareSize * (actualOrder.value % baseStore.numLines)
  );
});
const calculatedTop = computed(() => {
  return (
    props.containerTop +
    Math.floor(actualOrder.value / baseStore.numLines) * baseStore.spaceBetween +
    baseStore.spaceBetween +
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
  return (
    actualOrder.value + 1 === baseStore.freeElement &&
    (actualOrder.value + 1) % baseStore.numLines !== 0
  );
});
const canMoveLeft = computed(() => {
  return (
    actualOrder.value - 1 === baseStore.freeElement &&
    actualOrder.value % baseStore.numLines !== 0
  );
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
  }, 25);
});

const isNoBorder = ref(false);
watch(
  isDoneAll,
  (newValue) => {
    if (newValue && props.mixedOrder !== 0) {
      if (baseStore.cageMode) {
        setTimeout(() => {
          isNoBorder.value = true;
          baseStore.afterDoneCount += 1;
        }, actualOrder.value * 100);
      } else {
        setTimeout(() => {
          isCaptured.value = true;
          baseStore.afterDoneCount += 1;
        }, actualOrder.value * 70);
      }
    }
  },
  { immediate: true }
);

const img = ref();
watchEffect(() => {
  if (props.mixedOrder === 0) {
    return;
  }
  if (!baseStore.cageMode) {
    img.value = 'none';
    return;
  }
  const imgNum = props.mixedOrder.toString().padStart(2, '0');
  img.value = new URL(`../assets/cages/${baseStore.cagePath}/${imgNum}.jpg`, import.meta.url).href;
});
const imagePath = computed(() => {
  return `url(${img.value})`;
});

const { doResetList } = storeToRefs(baseStore);
watch(
  doResetList,
  (value, oldValue) => {
    if (value && !oldValue) {
      isCaptured.value = false;
      isNoBorder.value = false;
      img.value = 'none';
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
      'render-bg': renderFlag,
      'no-border-no-shadow': isNoBorder
    }"
    :style="{ top: `${calculatedTop}px`, left: `${calculatedLeft}px` }"
    @mousedown.left="capture"
    @mouseout.left="release"
    @touchstart.passive="capture"
    @touchend="release"
    @touchmove.prevent
    @click="move"
  >
    <div class="item">
      <Transition name="bounce">
        <span
          v-if="baseStore.showSquareNum"
          :class="{'cage-mode': baseStore.cageMode }"
        >
          {{ props.mixedOrder }}
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.bounce-enter-active {
  animation: bounce-in 0.3s ease-in-out;
}
@keyframes bounce-in {
  0% {
    transform: scale(0.1);
    color: #0a0a23;
    opacity: 0.5;
  }
  60% {
    transform: scale(0.8);
    color: navy;
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    color: #0a0a23;
    opacity: 1;
  }
}
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
  border-radius: v-bind(borderRadiusVar);
  box-sizing: border-box;
  box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.2);
  -webkit-tap-highlight-color: transparent;
  background-image: v-bind(imagePath);
  -webkit-background-size: cover;
  -moz-background-size: cover;
  -o-background-size: cover;
  background-size: cover;
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
.no-border-no-shadow {
  border: 0px;
  box-shadow: none;
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
  font-weight: 600;
  color: #0a0a23;
}
.cage-mode {
  color: white !important;
  opacity: 0.8;
}
@media screen and (max-width: 401px) {
  .item span {
    font-size: 19px;
  }
}
</style>
