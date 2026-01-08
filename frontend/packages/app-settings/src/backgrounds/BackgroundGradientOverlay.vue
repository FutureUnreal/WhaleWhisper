<script setup lang="ts">
const props = defineProps<{
  color?: string;
}>();
</script>

<template>
  <div
    class="theme-overlay pointer-events-none absolute inset-x-0 top-0 z-1 h-32 lg:h-40"
    :style="{
      background: props.color
        ? `linear-gradient(to bottom, ${props.color} 0%, ${props.color}99 15%, ${props.color}66 40%, ${props.color}33 70%, transparent 100%)`
        : undefined,
    }"
  />
</template>
