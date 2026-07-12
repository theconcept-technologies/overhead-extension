<script setup lang="ts">
// Registers the <overhead-stack> custom element (self-defining, idempotent).
import '../game/overhead-stack.js';
</script>

<template>
  <div class="flex justify-center oh-fade">
    <overhead-stack></overhead-stack>
  </div>
</template>
