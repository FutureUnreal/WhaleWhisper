<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";

import { StageViewport } from "@whalewhisper/stage-core";
import StageViewOverlay from "./StageViewOverlay.vue";

const props = withDefaults(
  defineProps<{
    paused?: boolean;
    focusAt: { x: number; y: number };
    xOffset?: number | string;
    yOffset?: number | string;
    scale?: number;
  }>(),
  {
    paused: false,
    scale: 1,
  }
);

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller("md");

const state = defineModel<"pending" | "loading" | "mounted">("state", {
  default: "pending",
});
</script>

<template>
  <div relative>
    <StageViewport
      v-model:state="state"
      :paused="props.paused"
      :focus-at="props.focusAt"
      :x-offset="props.xOffset"
      :y-offset="props.yOffset"
      :scale="props.scale"
    />
    <StageViewOverlay
      v-if="!isMobile"
      :x-offset="props.xOffset"
      :y-offset="props.yOffset"
    />
  </div>
</template>
