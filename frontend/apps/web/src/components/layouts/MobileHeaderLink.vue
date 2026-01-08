<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useTheme } from "@whalewhisper/app-core/composables/use-theme";
import { BackgroundKind, useBackgroundStore } from "@whalewhisper/app-core/stores/background";

const { isDark } = useTheme();
const { selectedOption } = storeToRefs(useBackgroundStore());
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
