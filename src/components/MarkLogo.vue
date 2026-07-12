<script setup lang="ts">
// Overhead brand mark — stacked "header" lines, top line in accent.
// `dancing` makes the bars do an equalizer wiggle (easter-egg unlock).
withDefaults(defineProps<{ size?: number; dancing?: boolean }>(), {
  size: 22,
  dancing: false,
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
    <rect x="0" y="0" width="100" height="100" rx="24" fill="#111318" />
    <rect
      x="24" y="32" width="52" height="9" rx="4.5" fill="#4E5BF6"
      :class="dancing && 'oh-eq'"
      :style="dancing ? { animationDelay: '0ms' } : undefined"
    />
    <rect
      x="24" y="47" width="40" height="9" rx="4.5" fill="#585B68"
      :class="dancing && 'oh-eq'"
      :style="dancing ? { animationDelay: '110ms' } : undefined"
    />
    <rect
      x="24" y="62" width="28" height="9" rx="4.5" fill="#585B68"
      :class="dancing && 'oh-eq'"
      :style="dancing ? { animationDelay: '220ms' } : undefined"
    />
  </svg>
</template>
