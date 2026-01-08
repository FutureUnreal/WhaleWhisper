<script setup lang="ts">
import { useTheme } from "@whalewhisper/app-core/composables/use-theme";

import { PartAnimatedWave, PatternCross } from ".";

const { isDark } = useTheme();
</script>

<template>
  <PatternCross>
    <PartAnimatedWave
      :height="60"
      :amplitude="22"
      :wave-length="350"
      :animation-speed="70"
      :fill-color="isDark
        ? 'linear-gradient(160deg, rgba(0, 180, 255, 0.18) 0%, rgba(0, 150, 220, 0.22) 25%, rgba(0, 120, 200, 0.26) 50%, rgba(0, 100, 180, 0.28) 75%, rgba(0, 80, 160, 0.30) 100%)'
        : 'linear-gradient(160deg, rgba(200, 235, 255, 0.85) 0%, rgba(180, 225, 255, 0.88) 25%, rgba(160, 215, 255, 0.90) 50%, rgba(140, 205, 255, 0.92) 75%, rgba(120, 195, 255, 0.94) 100%)'"
      class="h-full w-full"
    >
      <div class="relative h-full w-full from-black/6 via-black/0 to-black/0 bg-gradient-to-b" />
    </PartAnimatedWave>
  </PatternCross>
</template>
