<script setup lang="ts">
import { useBaseStore } from '../stores/base';
import { onMounted } from 'vue';

const baseStore = useBaseStore();

onMounted(() => {
  const path1 = import.meta.env.VITE_TP3P3_1;
  const path2 = import.meta.env.VITE_TP3P3_2;
  const path3 = import.meta.env.VITE_TP3P3_3;
  const path4 = import.meta.env.VITE_TP3P3_4;
  const path5 = import.meta.env.VITE_TP3P3_5;
  baseStore.t3p3Init.push(path1);
  baseStore.t3p3Init.push(path2);
  baseStore.t3p3Init.push(path3);
  baseStore.t3p3Init.push(path4);
  baseStore.t3p3Init.push(path5);

  if (baseStore.tp3ModeID > 0) {
    let path = baseStore.t3p3Init[0];
    if (baseStore.tp3ModeID === 2) {
      path = baseStore.t3p3Init[1];
    } else if (baseStore.tp3ModeID === 3) {
      path = baseStore.t3p3Init[2];
    } else if (baseStore.tp3ModeID === 4) {
      path = baseStore.t3p3Init[3];
    } else if (baseStore.tp3ModeID === 5) {
      path = baseStore.t3p3Init[4];
    }
    baseStore.t3p3Path = path.split(';');
    console.log(baseStore.t3p3Path);
    baseStore.t3p3Mode = true;
    baseStore.renewPuzzle();
  }
});
</script>

<template>
  <div />
</template>
