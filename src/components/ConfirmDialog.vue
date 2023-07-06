<script setup lang="ts">
interface Props {
  confirmQuestion?: string;
}
const props = withDefaults(defineProps<Props>(), {
  confirmQuestion: 'Do you really want to restart the game?'
});
const emit = defineEmits<{ confirm: []; decline: [] }>();
</script>

<template>
  <Teleport to="body">
    <div class="confirm" @touchmove.prevent>
      <p>{{ props.confirmQuestion }}</p>
      <div class="buttons">
        <button class="tool-button" @click="emit('confirm')">
          Yes
        </button>
        <button class="tool-button" @click="emit('decline')">
          No
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm {
  display: flex;
  justify-content: center;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  height: 150px;
  width: 250px;
  position: fixed;
  z-index: 2000;
  top: 30%;
  left: calc(50% - 125px);
  padding: 20px;
  box-shadow: 0 8px 16px gray;
}
p {
  text-align: center;
  max-width: 200px;
  margin: 0 auto;
}
.buttons {
  margin-top: 20px;
  display: flex;
  justify-content: space-evenly;
}
</style>
