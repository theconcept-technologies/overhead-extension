<script setup lang="ts">
import { APP } from '../config';
defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
    <div class="bg-surface-light dark:bg-surface-dark text-ink-light dark:text-ink-dark border border-hairline-light dark:border-hairline-dark rounded-xl shadow-xl p-5 max-w-[300px] text-center">
      <div class="text-2xl mb-2">♥</div>
      <h3 class="font-semibold mb-1">Enjoying {{ APP.name }}?</h3>
      <p class="text-xs text-muted-light dark:text-muted-dark mb-4">
        It's free, local and open source. A small tip keeps it that way — no ads, ever.
      </p>
      <div class="flex flex-col gap-2">
        <a
          :href="APP.donate.buyMeACoffee"
          target="_blank"
          rel="noopener"
          class="w-full py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium"
          >Buy me a coffee</a
        >
        <button class="text-xs text-muted-light dark:text-muted-dark hover:text-brand py-1" @click="$emit('close')">
          Maybe later
        </button>
      </div>
    </div>
  </div>
</template>
