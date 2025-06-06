<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useBaseStore } from '../stores/base';
import { onClickOutside } from '@vueuse/core';
import { CAGES_PATH_ARR, LoadImageMode } from '@/const';
import { getSquareSize } from '../composables/usePrepare';

const emit = defineEmits<{ close: [] }>();
const baseStore = useBaseStore();

const { squareSize } = getSquareSize();
const boardSize = computed(() => {
  return baseStore.boardSize(squareSize.value);
});

const imageGallery = ref<HTMLElement>();
onClickOutside(imageGallery, (event) => {
  event.stopPropagation();
  emit('close');
});

const currentIndex = ref(0);
const { showOnlyUnlockedItems } = storeToRefs(baseStore);
const getRealIndex = computed(() => {
  if (showOnlyUnlockedItems.value) {
    return baseStore.unlockedCagesSortedArr[currentIndex.value];
  }
  return currentIndex.value;
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
const showImg = ref(false);
const loaded = ref(false);
const time = ref(0);
const onCageImgLoad = (): void => {
  loaded.value = true;
  if (!isLocked.value) {
    showImg.value = true;
  }
};
const loadedCageImg = computed(() => {
  if (isLocked.value) {
    return '/cages/placeholder.jpg';
  } else {
    return `/cages/${CAGES_PATH_ARR[getRealIndex.value]}/complete.jpg`;
  }
});
const loadedNotLocked = computed(() => {
  return !loaded.value && !isLocked.value &&
    (time.value > 5 || (currentIndex.value === 0 && time.value > 2));
});
const checkIsLocked = (): void => {
  if (isLocked.value) {
    showImg.value = true;
  }
};
checkIsLocked();
const loadImage = async (mode: LoadImageMode): Promise<void> => {
  if (!loaded.value && !isLocked.value) {
    return;
  }
  if (baseStore.showOnlyUnlockedItems && baseStore.unlockedCages.size === 1) {
    return;
  }
  if (mode === LoadImageMode.next) {
    if (currentIndex.value === maxIndex.value) {
      currentIndex.value = 0;
    } else {
      currentIndex.value += 1;
    }
  }
  if (mode === LoadImageMode.prev) {
    if (currentIndex.value === 0) {
      currentIndex.value = maxIndex.value;
    } else {
      currentIndex.value -= 1;
    }
  }
  if (!isLocked.value) {
    showImg.value = false;
    await nextTick();
    loaded.value = false;
    showImg.value = true;
  }
};
const loadNext = async (): Promise<void> => {
  await loadImage(LoadImageMode.next);
};
const loadPrev = async (): Promise<void> => {
  await loadImage(LoadImageMode.prev);
};

const interval = ref(0);
watch(loaded, (newValue, oldValue) => {
  if (!newValue && (oldValue ?? (currentIndex.value === 0))) {
    time.value = 0;
    interval.value = window.setInterval(() => {
      time.value += 1;
    }, 100);
  }
  if (newValue && !(oldValue ?? false)) {
    clearInterval(interval.value);
  }
},
{ immediate: true });

const tolerance = ref(30);
const gesture = reactive({ x: [] as number[] });
const touchmove = (e: TouchEvent): void => {
  for (const t of e.touches) {
    gesture.x.push(t.clientX);
  }
};
const touchend = async (): Promise<void> => {
  const xTravel = gesture.x[gesture.x.length - 1] - gesture.x[0];
  gesture.x = [];
  if (xTravel < -tolerance.value) {
    await loadNext();
  }
  if (xTravel > tolerance.value) {
    await loadPrev();
  }
};

const disabledShowOnlyUnlockedItems = computed(() => {
  return baseStore.unlockedCages.size === 0 ||
  baseStore.unlockedCages.size === baseStore.cagesCount;
});

const oldCurrentIndex = ref(0);
const wasLocked = ref(false);
const setShowOnlyUnlockedItems = (): void => {
  wasLocked.value = false;
  if (baseStore.showOnlyUnlockedItems) {
    oldCurrentIndex.value = getRealIndex.value;
  } else {
    oldCurrentIndex.value = currentIndex.value;
    if (isLocked.value) {
      wasLocked.value = true;
      oldCurrentIndex.value = baseStore.unlockedCagesSortedArr[0];
    }
  }
  baseStore.showOnlyUnlockedItems = !baseStore.showOnlyUnlockedItems;
  localStorage.setItem('showOnlyUnlockedItems', baseStore.showOnlyUnlockedItems.toString());
};
watch(showOnlyUnlockedItems, async (newValue, oldValue) => {
  if (newValue && !oldValue) {
    if (wasLocked.value) {
      showImg.value = false;
      await nextTick();
      loaded.value = false;
      showImg.value = true;
    }
    currentIndex.value = baseStore.unlockedCagesSortedArr.indexOf(oldCurrentIndex.value);
  } else if (!newValue && oldValue) {
    currentIndex.value = oldCurrentIndex.value;
  }
});

const wheel = async (event: WheelEvent): Promise<void> => {
  const delta = Math.sign(event.deltaY);
  if (delta === -1) {
    await loadNext();
  } else if (delta === 1) {
    await loadPrev();
  }
};
onMounted(() => {
  showImg.value = true;
});
baseStore.preloadImage('placeholder', true);
for (const [index, value] of CAGES_PATH_ARR.entries()) {
  if (baseStore.unlockedCages.has(index)) {
    baseStore.preloadImage(value);
  }
}
</script>

<template>
  <Teleport to="body">
    <div ref="imageGallery" class="image-gallery" @wheel.prevent="wheel">
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
            <polygon points="15.293 3.293 6.586 12 15.293 20.707 16.707 19.293 9.414 12 16.707 4.707 15.293 3.293" />
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
            <polygon points="7.293 4.707 14.586 12 7.293 19.293 8.707 20.707 17.414 12 8.707 3.293 7.293 4.707" />
          </svg>
        </div>
      </div>
      <div class="image-wrapper" :class="{ wait: loadedNotLocked }">
        <Transition name="fade" mode="out-in">
          <img
            v-if="showImg"
            :src="loadedCageImg"
            class="cage-img"
            draggable="false"
            alt="cage"
            @load="onCageImgLoad"
            @touchstart.prevent="touchmove"
            @touchmove.prevent="touchmove"
            @touchend.prevent="touchend"
          >
        </Transition>
        <span
          v-show="isLocked && loaded"
          class="cage-locked-txt"
          @touchstart.prevent="touchmove"
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
            :disabled="disabledShowOnlyUnlockedItems"
            @change="setShowOnlyUnlockedItems"
          >
          <label for="show-only-unlocked" :class="{ 'disabled-label': disabledShowOnlyUnlockedItems }">
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
* {
  --v-width: 440px;
}
.image-gallery {
  display: flex;
  justify-content: start;
  align-items: center;
  flex-direction: column;
  background-color: var(--background-modal-color);
  color: var(--text-color);
  border-radius: 8px;
  height: 100%;
  max-height: calc(var(--v-width) + 137px);
  width: var(--v-width);
  position: fixed;
  z-index: 2000;
  top: 45px;
  left: calc(50% - var(--v-width) / 2);
  padding: 10px;
  box-shadow: 0 8px 16px var(--shadow-color);
}
@media (min-height: 800px), screen and (max-width: 820px) {
  * {
    --v-width: v-bind(boardSize);
  }
  .image-gallery {
    top: calc(50% - (var(--v-width) + 147px) / 2);
  }
}
h2 {
  display: flex;
  justify-content: center;
  margin-bottom: 5px;
  font-size: 21px;
  font-weight: 600;
}
.controls {
  display: flex;
  width: calc(var(--v-width) - 40px);
  justify-content: space-between;
}
.image-wrapper {
  height: calc(var(--v-width) - 40px);
  width: calc(var(--v-width) - 40px);
  position: relative;
  background-color: #dfdfdf;
  border-radius: 8px;
}
.cage-img {
  height: calc(var(--v-width) - 40px);
  width: calc(var(--v-width) - 40px);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  border-radius: 8px;
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
  scale: 0.7;
}
@media screen and (min-width: 820px) {
  .arrow-button:hover, .arrow-button:active {
    scale: 0.8;
  }
}
.arrow-button:deep(polygon) {
  fill: var(--text-color);
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
