<script setup lang="ts">
// Registers the <overhead-stack> custom element (self-defining, idempotent).
import '../game/overhead-stack.js';

withDefaults(defineProps<{ large?: boolean }>(), { large: false });
</script>

<template>
  <div class="game-shell flex justify-center oh-fade" :class="{ 'game-shell--large': large }">
    <overhead-stack :class="{ 'game--large': large }" :render-scale="large ? 1.4 : 1"></overhead-stack>
  </div>
</template>

<style scoped>
.game-shell--large {
  width: 420px;
  height: 564px;
  filter: drop-shadow(0 28px 42px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 35px rgba(78, 91, 246, 0.16));
}
.game--large {
  zoom: 1.4;
}
@media (max-height: 720px) {
  .game-shell--large {
    width: 360px;
    height: 484px;
  }
  .game--large {
    zoom: 1.2;
  }
}
</style>
