<script setup lang="ts">
import { useTheme } from "@whalewhisper/app-core/composables/use-theme";

const { isDark } = useTheme();
</script>

<template>
  <div class="flex items-center gap-2 px-2 text-nowrap text-2xl outline-none">
    <div class="h-8 w-8 flex items-center justify-center">
      <img src="/favicon.ico" alt="WhaleWhisper Logo" class="h-full w-full object-contain" />
    </div>
    <div class="translate-y-[2px] font-semibold">
      <span>WhaleWhisper</span>
    </div>
  </div>
</template>
