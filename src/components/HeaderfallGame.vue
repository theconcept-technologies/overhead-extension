<script setup lang="ts">
// Registers the <overhead-drop> custom element (self-defining, idempotent).
// "Headerfall" — the deep-cut falling-block easter egg where every piece is a
// real HTTP header. Unlocked by typing "tetris" in the options page.
import '../game/overhead-drop.js';
</script>

<template>
  <div class="game-shell flex justify-center oh-fade">
    <overhead-drop></overhead-drop>
  </div>
</template>

<style scoped>
.game-shell {
  filter: drop-shadow(0 28px 42px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 35px rgba(78, 91, 246, 0.16));
}
</style>
