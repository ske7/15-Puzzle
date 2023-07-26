<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import { useBaseStore } from '../stores/base';
import { onClickOutside } from '@vueuse/core';
import { CAGES_PATH_ARR } from '../stores/const';

const emit = defineEmits<{ close: []; }>();
const baseStore = useBaseStore();

const props = defineProps<{ squareSize: number; }>();

const boardSize = computed(() => {
  return baseStore.boardSize(props.squareSize);
});

const imageGallery = ref(null);
onClickOutside(imageGallery, (event) => {
  event.stopPropagation();
  emit('close');
});

const isLocked = computed(() => {
  return !baseStore.unlockedCages.has(currentIndex.value);
});
const loadedNotLocked = computed(() => {
  return !loaded.value && !isLocked.value && time.value > 5;
});
const currentIndex = ref(0);
const loaded = ref(false);
const onCageImgLoad = (): void => {
  loaded.value = true;
};
const loadedCageImg = computed(() => {
  if (isLocked.value) {
    return '/cages/placeholder.jpg';
  } else {
    return `/cages/${CAGES_PATH_ARR[currentIndex.value]}/complete.jpg`;
  }
});
const loadNext = () => {
  if (!loaded.value && !isLocked.value) {
    return;
  }
  if (currentIndex.value === baseStore.cagesCount - 1) {
    currentIndex.value = 0;
  } else {
    currentIndex.value += 1;
  }
  loaded.value = false;
};
const loadPrev = () => {
  if (!loaded.value && !isLocked.value) {
    return;
  }
  if (currentIndex.value === 0) {
    currentIndex.value = baseStore.cagesCount - 1;
  } else {
    currentIndex.value -= 1;
  }
  loaded.value = false;
};

const interval = ref(0);
const time = ref(0);
watch(loaded, (newValue, oldValue) => {
  if (!newValue && oldValue) {
    time.value = 0;
    interval.value = setInterval(() => {
      time.value += 1;
    }, 100);
  }
  if (newValue && !oldValue) {
    clearInterval(interval.value);
  }
},
{ immediate: true });

const tolerance = ref(15);
const gesture = reactive({ x: [] as number[], y: [] as number[] });
const touchstart = (e: TouchEvent) => {
  for (const t of e.touches) {
    gesture.x.push(t.clientX);
    gesture.y.push(t.clientY);
  }
};
const touchmove = (e: TouchEvent) => {
  for (const t of e.touches) {
    gesture.x.push(t.clientX);
    gesture.y.push(t.clientY);
  }
};
const touchend = () => {
  const xTravel = gesture.x[gesture.x.length - 1] - gesture.x[0];
  const yTravel = gesture.y[gesture.y.length - 1] - gesture.y[0];
  gesture.x = [];
  gesture.y = [];
  if (yTravel < tolerance.value && yTravel > -tolerance.value && xTravel < -tolerance.value) {
    loadNext();
  }
  if (yTravel < tolerance.value && yTravel > -tolerance.value && xTravel > tolerance.value) {
    loadPrev();
  }
};
</script>

<template>
  <Teleport to="body">
    <div ref="imageGallery" class="image-gallery">
      <h2>Cage Image Gallery</h2>
      <div class="controls">
        <div
          class="arrow-button"
          :class="{'low-opacity': loadedNotLocked }"
          @click="loadPrev"
        >
          &#129186;
        </div>
        <div>Cage {{ currentIndex + 1 }}</div>
        <div
          class="arrow-button"
          :class="{ 'low-opacity': loadedNotLocked }"
          @click="loadNext"
        >
          &#129187;
        </div>
      </div>
      <div class="image-wrapper" :class="{ wait: loadedNotLocked }">
        <img
          :src="loadedCageImg"
          class="cage-img"
          draggable="false"
          @load="onCageImgLoad"
          @touchstart="touchstart"
          @touchmove.prevent="touchmove"
          @touchend.prevent="touchend"
        >
        <span
          v-if="loadedNotLocked"
          class="cage-loading-txt"
        >
          Loading
        </span>
        <span
          v-if="isLocked"
          class="cage-locked-txt"
          @touchstart.prevent="touchstart"
          @touchmove.prevent="touchmove"
          @touchend.prevent="touchend"
        >
          Locked
        </span>
      </div>
      <div class="buttons">
        <button type="button" class="tool-button" @click="emit('close')">
          OK
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>

.image-gallery {
  display: flex;
  justify-content: start;
  align-items: center;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  height: 100%;
  max-height: calc(v-bind(boardSize) + 110px);
  width: v-bind(boardSize);
  position: fixed;
  z-index: 2000;
  top: calc(50% - (v-bind(boardSize) + 110px) / 2);
  left: calc(50% - v-bind(boardSize) / 2);
  padding: 10px;
  box-shadow: 0 8px 16px gray;
}
h2 {
  display: flex;
  justify-content: center;
  margin-bottom: 5px;
  color: navy;
}
.controls {
  display: flex;
  width: calc(v-bind(boardSize) - 40px);
  justify-content: space-between;
}
.image-wrapper {
  height: calc(v-bind(boardSize) - 40px);
  width: auto;
  position: relative;
  background-color: #7F7F7F;
}
.cage-img {
  height: calc(v-bind(boardSize) - 40px);
  width: calc(v-bind(boardSize) - 40px);
  border: 1px solid #ccc;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
.cage-locked-txt {
  display: flex;
  color: white;
  font-weight: 600;
  font-size: 80px;
  position: absolute;
  top: calc(50% - 65px);
  left: calc(50% - 115px);
  transform: rotate(45deg);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
.cage-loading-txt {
  display: flex;
  justify-content: center;
  color: white;
  font-size: 32px;
  font-weight: 500;
  position: absolute;
  top: calc(50% - 26px);
  left: calc(50% - 56px);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
.wait {
  cursor: wait;
}
.low-opacity {
  opacity: 0.2;
}
@media screen and (max-width: 420px) {
  .cage-locked-txt {
    font-size: 50px;
    top: calc(50% - 35px);
    left: calc(50% - 75px);
  }
}
.buttons {
  margin-top: 10px;
  margin-bottom: 15px;
  display: flex;
  justify-content: center;
}
.arrow-button {
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
@media screen and (min-width: 820px) {
  .arrow-button {
    scale: 1.1;
  }
  .arrow-button:hover, .arrow-button:active {
    color: navy;
    scale: 1.2;
  }
}
</style>
