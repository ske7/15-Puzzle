<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import { storeToRefs } from 'pinia';
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

const currentIndex = ref(0);
const { showOnlyUnlockedItems } = storeToRefs(baseStore);
const getRealIndex = computed(() => {
  const index = currentIndex.value;
  if (showOnlyUnlockedItems.value) {
    const arr = [...baseStore.unlockedCages];
    return arr[index];
  }
  return index;
});
const maxIndex = computed(() => {
  if (showOnlyUnlockedItems.value) {
    return baseStore.unlockedCages.size - 1;
  }
  return baseStore.cagesCount - 1;
});
const isLocked = computed(() => {
  if (showOnlyUnlockedItems.value) {
    return false;
  }
  return !baseStore.unlockedCages.has(currentIndex.value);
});
const loadedNotLocked = computed(() => {
  return !loaded.value && !isLocked.value &&
  (time.value > 5 || (currentIndex.value === 0 && time.value > 0));
});

const loaded = ref(false);
const onCageImgLoad = async (): Promise<void> => {
  loaded.value = true;
  if (!isLocked.value) {
    showImg.value = true;
    showAnimation.value = true;
    await new Promise(resolve => setTimeout(resolve, 400));
    showAnimation.value = false;
  }
};
const loadedCageImg = computed(() => {
  if (isLocked.value) {
    return '/cages/placeholder.jpg';
  } else {
    return `/cages/${CAGES_PATH_ARR[getRealIndex.value]}/complete.jpg`;
  }
});
const showAnimation = ref(false);
const showImg = ref(false);
if (isLocked.value) {
  showImg.value = true;
}
const enum LoadMode {
  next = 1,
  prev = -1
}
const loadImage = (mode: LoadMode) => {
  if (!loaded.value && !isLocked.value) {
    return;
  }
  if (baseStore.showOnlyUnlockedItems && baseStore.unlockedCages.size === 1) {
    return;
  }
  showImg.value = false;
  if (mode === LoadMode.next) {
    if (currentIndex.value === maxIndex.value) {
      currentIndex.value = 0;
    } else {
      currentIndex.value += 1;
    }
  }
  if (mode === LoadMode.prev) {
    if (currentIndex.value === 0) {
      currentIndex.value = maxIndex.value;
    } else {
      currentIndex.value -= 1;
    }
  }
  if (!isLocked.value) {
    loaded.value = false;
  } else {
    showImg.value = true;
  }
};
const loadNext = () => {
  loadImage(LoadMode.next);
};
const loadPrev = () => {
  loadImage(LoadMode.prev);
};

const interval = ref(0);
const time = ref(0);
watch(loaded, (newValue, oldValue) => {
  if (!newValue && (oldValue ?? (currentIndex.value === 0))) {
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

const tolerance = ref(30);
const gesture = reactive({ x: [] as number[] });
const touchstart = (e: TouchEvent) => {
  for (const t of e.touches) {
    gesture.x.push(t.clientX);
  }
};
const touchmove = (e: TouchEvent) => {
  for (const t of e.touches) {
    gesture.x.push(t.clientX);
  }
};
const touchend = () => {
  const xTravel = gesture.x[gesture.x.length - 1] - gesture.x[0];
  gesture.x = [];
  if (xTravel < -tolerance.value) {
    loadNext();
  }
  if (xTravel > tolerance.value) {
    loadPrev();
  }
};

const oldCurrentIndex = ref(0);
const wasLocked = ref(false);
const setShowOnlyUnlockedItems = () => {
  wasLocked.value = false;
  if (baseStore.showOnlyUnlockedItems) {
    oldCurrentIndex.value = getRealIndex.value;
  } else {
    oldCurrentIndex.value = currentIndex.value;
    if (isLocked.value) {
      wasLocked.value = true;
      oldCurrentIndex.value = [...baseStore.unlockedCages][0];
    }
  }
  baseStore.showOnlyUnlockedItems = !baseStore.showOnlyUnlockedItems;
  localStorage.setItem('showOnlyUnlockedItems', baseStore.showOnlyUnlockedItems.toString());
};
watch(showOnlyUnlockedItems, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    if (!isLocked.value && wasLocked.value) {
      showImg.value = false;
    }
    currentIndex.value = [...baseStore.unlockedCages].indexOf(oldCurrentIndex.value);
  } else if (!newValue && oldValue) {
    currentIndex.value = oldCurrentIndex.value;
  }
});

for (const [index, value] of CAGES_PATH_ARR.entries()) {
  if (baseStore.unlockedCages.has(index)) {
    baseStore.preloadImage(value);
  }
}
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <polygon points="15.293 3.293 6.586 12 15.293 20.707 16.707 19.293 9.414 12 16.707 4.707 15.293 3.293" fill="navy" />
          </svg>
        </div>
        <div>Cage {{ getRealIndex + 1 }}</div>
        <div
          class="arrow-button"
          :class="{ 'low-opacity': loadedNotLocked }"
          @click="loadNext"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <polygon points="7.293 4.707 14.586 12 7.293 19.293 8.707 20.707 17.414 12 8.707 3.293 7.293 4.707" fill="navy" />
          </svg>
        </div>
      </div>
      <div class="image-wrapper" :class="{ wait: loadedNotLocked }">
        <img
          v-show="showImg"
          :src="loadedCageImg"
          class="cage-img"
          :class="{ 'cage-image-animation': showAnimation }"
          draggable="false"
          @load="onCageImgLoad"
          @touchstart="touchstart"
          @touchmove.prevent="touchmove"
          @touchend.prevent="touchend"
        >
        <span
          v-if="isLocked && loaded"
          class="cage-locked-txt"
          @touchstart.prevent="touchstart"
          @touchmove.prevent="touchmove"
          @touchend.prevent="touchend"
        >
          Locked
        </span>
        <span
          v-if="loadedNotLocked"
          class="cage-loading-txt"
        >
          Loading
        </span>
      </div>
      <div class="options">
        <div class="option">
          <input
            id="show-only-unlocked"
            type="checkbox"
            name="show-only-unlocked"
            :checked="showOnlyUnlockedItems"
            :disabled="baseStore.unlockedCages.size === 0"
            @change="setShowOnlyUnlockedItems"
          >
          <label for="show-only-unlocked" :class="{ 'disabled-label': baseStore.unlockedCages.size === 0 }">
            Show only unlocked items
          </label>
        </div>
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
  max-height: calc(v-bind(boardSize) + 137px);
  width: v-bind(boardSize);
  position: fixed;
  z-index: 2000;
  top: 120px;
  left: calc(50% - v-bind(boardSize) / 2);
  padding: 10px;
  box-shadow: 0 8px 16px gray;
}
@media (min-height: 800px), screen and (max-width: 820px) {
  .image-gallery {
    top: calc(50% - (v-bind(boardSize) + 137px) / 2);
  }
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
  width: calc(v-bind(boardSize) - 40px);
  position: relative;
  background-color: #dfdfdf;
}
.cage-img {
  height: calc(v-bind(boardSize) - 40px);
  width: calc(v-bind(boardSize) - 40px);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
@keyframes cage-in {
    0% { opacity: 0; scale: 0.1; border-radius: 100%;}
  100% { opacity: 1; scale: 1.0; border-radius: 0%;}
}
.cage-image-animation {
  animation: cage-in 0.5s ease;
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
.arrow-button {
  scale: 0.7;
}
@media screen and (min-width: 820px) {
  .arrow-button:hover, .arrow-button:active {
    scale: 0.8;
  }
}
.options {
  margin: 0 auto;
  margin-top: 5px;
}
.option {
  display: flex;
  justify-content: left;
  align-items: normal;
  gap: 10px;
  margin-bottom: 5px;
}
label {
  display: flex;
  align-items: center;
  line-height: 1;
  font-size: 16px;
}
.disabled-label {
  opacity: 0.3;
}
input[type=checkbox] {
  margin-top: 1px;
}
</style>
