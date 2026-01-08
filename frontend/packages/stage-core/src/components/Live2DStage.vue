<script setup lang="ts">
import { ref, watch } from "vue";

import "../utils/live2d-source-normalizer";
import "../utils/live2d-zip-loader";
import Screen from "./misc/Screen.vue";
import Live2DCanvas from "./scenes/live2d/Canvas.vue";
import Live2DModel from "./scenes/live2d/Model.vue";

withDefaults(
  defineProps<{
    modelSrc?: string | File | File[];
    modelId?: string;
    paused?: boolean;
    focusAt?: { x: number; y: number };
    disableFocusAt?: boolean;
    xOffset?: number | string;
    yOffset?: number | string;
    scale?: number;
  }>(),
  {
    paused: false,
    focusAt: () => ({ x: 0, y: 0 }),
    scale: 1,
  }
);

const componentState = defineModel<"pending" | "loading" | "mounted">("state", {
  default: "pending",
});
const componentStateCanvas = defineModel<"pending" | "loading" | "mounted">(
  "canvasState",
  { default: "pending" }
);
const componentStateModel = defineModel<"pending" | "loading" | "mounted">(
  "modelState",
  { default: "pending" }
);

const live2dCanvasRef = ref<InstanceType<typeof Live2DCanvas>>();

watch([componentStateModel, componentStateCanvas], () => {
  componentState.value =
    componentStateModel.value === "mounted" &&
    componentStateCanvas.value === "mounted"
      ? "mounted"
      : "loading";
});

defineExpose({
  canvasElement: () => {
    return live2dCanvasRef.value?.canvasElement();
  },
});
</script>

<template>
  <Screen v-slot="{ width, height }" relative>
    <Live2DCanvas
      ref="live2dCanvasRef"
      v-slot="{ app }"
      v-model:state="componentStateCanvas"
      :width="width"
      :height="height"
      :resolution="2"
      max-h="100dvh"
    >
      <Live2DModel
        v-model:state="componentStateModel"
        :model-src="modelSrc"
        :model-id="modelId"
        :app="app"
        :width="width"
        :height="height"
        :paused="paused"
        :focus-at="focusAt"
        :x-offset="xOffset"
        :y-offset="yOffset"
        :scale="scale"
        :disable-focus-at="disableFocusAt"
      />
    </Live2DCanvas>
  </Screen>
</template>
