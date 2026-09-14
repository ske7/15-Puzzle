import { ref, computed } from 'vue';
import { displayedTime } from '../../utils';

export function useTimerState() {
  const time = ref(0);
  const interval = ref(0);
  const paused = ref(false);
  const startTime = ref(0);
  const savedTime = ref(0);

  // Kept apart from `interval`, which BottomInfoPanel's template reads and must not change every frame.
  let frame = 0;

  function stopInterval() {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
      time.value = elapsed();
    }
    interval.value = 0;
  }

  function restartInterval() {
    cancelAnimationFrame(frame);
    startTime.value = Date.now();
    frame = requestAnimationFrame(tick);
    interval.value = frame;
  }

  function saveTime() {
    stopInterval();
    savedTime.value = time.value;
  }

  function tick() {
    time.value = elapsed();
    frame = requestAnimationFrame(tick);
  }

  function elapsed(): number {
    return Date.now() - startTime.value + savedTime.value;
  }

  const timeStr = computed((): string => {
    return displayedTime(time.value);
  });

  const getTime = computed((): number => {
    let result: number;
    if (time.value === 0) {
      result = 1;
    } else {
      result = time.value;
    }
    return result;
  });

  return {
    time,
    interval,
    paused,
    startTime,
    savedTime,
    stopInterval,
    restartInterval,
    saveTime,
    timeStr,
    getTime
  };
}
