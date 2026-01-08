<script setup lang="ts">
import type { BackgroundItem } from "@whalewhisper/app-core/stores/background";

import { computed, ref } from "vue";

import { useTheme } from "@whalewhisper/app-core/composables/use-theme";
import { BackgroundKind } from "@whalewhisper/app-core/stores/background";
import BackgroundGradientOverlay from "./BackgroundGradientOverlay.vue";
import { DefaultBackground } from "./default";

const props = defineProps<{
  background: BackgroundItem;
  topColor?: string;
}>();

const { isDark } = useTheme();

const currentGradient = computed(() => {
  if (props.background.kind !== BackgroundKind.Gradient) {
    return props.background.gradient || '#0b1220';
  }
  
  // 如果有分别定义的亮色和暗色渐变，根据主题选择
  if (props.background.gradientLight && props.background.gradientDark) {
    return isDark.value ? props.background.gradientDark : props.background.gradientLight;
  }
  
  // 否则使用默认的gradient
  return props.background.gradient || '#0b1220';
});

const containerRef = ref<HTMLElement | null>(null);

defineExpose({
  surfaceEl: containerRef,
});
</script>

<template>
  <div ref="containerRef" class="customized-background relative min-h-100dvh w-full overflow-hidden">
    <div
      class="absolute inset-0 z-0 transition-all duration-300"
      :class="[(background.blur && background.kind !== BackgroundKind.Wave) ? 'blur-md scale-110' : '']"
    >
      <template v-if="background.kind === BackgroundKind.Wave">
        <DefaultBackground class="h-full w-full" />
      </template>
      <template v-else-if="background.kind === BackgroundKind.Image">
        <img
          :src="background.src"
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
      </template>
      <template v-else>
        <div class="h-full w-full" :style="{ background: currentGradient }" />
      </template>
    </div>

    <BackgroundGradientOverlay v-if="background.kind !== BackgroundKind.Wave" :color="topColor" />

    <div class="relative z-10 h-full w-full">
      <slot />
    </div>
  </div>
</template>
