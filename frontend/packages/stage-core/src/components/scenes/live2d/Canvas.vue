<script setup lang="ts">
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    width: number;
    height: number;
    resolution?: number;
  }>(),
  {
    resolution: 2,
  }
);

const componentState = defineModel<"pending" | "loading" | "mounted">("state", {
  default: "pending",
});

const containerRef = ref<HTMLDivElement>();
const isPixiCanvasReady = ref(false);
const pixiApp = ref<PIXI.Application>();
const pixiAppCanvas = ref<HTMLCanvasElement>();

async function initLive2DPixiStage(parent: HTMLDivElement) {
  componentState.value = "loading";
  isPixiCanvasReady.value = false;

  (window as Window & { PIXI?: typeof PIXI }).PIXI = PIXI;
  Live2DModel.registerTicker(PIXI.Ticker);

  pixiApp.value = new PIXI.Application({
    width: props.width * props.resolution,
    height: props.height * props.resolution,
    backgroundAlpha: 0,
    preserveDrawingBuffer: true,
    autoDensity: false,
    resolution: 1,
  });

  pixiApp.value.stage.scale.set(props.resolution);

  pixiAppCanvas.value = pixiApp.value.view;
  pixiAppCanvas.value.style.width = "100%";
  pixiAppCanvas.value.style.height = "100%";
  pixiAppCanvas.value.style.objectFit = "cover";
  pixiAppCanvas.value.style.display = "block";

  parent.appendChild(pixiApp.value.view);

  isPixiCanvasReady.value = true;
  componentState.value = "mounted";
}

function handleResize() {
  if (pixiApp.value) {
    pixiApp.value.renderer.resize(
      props.width * props.resolution,
      props.height * props.resolution
    );
    pixiApp.value.stage.scale.set(props.resolution);
  }
}

watch([() => props.width, () => props.height, () => props.resolution], handleResize);

onMounted(async () => {
  if (containerRef.value) {
    await initLive2DPixiStage(containerRef.value);
  }
});
onUnmounted(() => pixiApp.value?.destroy());

async function captureFrame() {
  const frame = new Promise<Blob | null>((resolve) => {
    if (!pixiAppCanvas.value || !pixiApp.value) {
      return resolve(null);
    }
    pixiApp.value.render();
    pixiAppCanvas.value.toBlob(resolve);
  });

  return frame;
}

function canvasElement() {
  return pixiAppCanvas.value;
}

defineExpose({
  captureFrame,
  canvasElement,
});
</script>

<template>
  <div ref="containerRef" h-full w-full>
    <slot v-if="isPixiCanvasReady" :app="pixiApp" />
  </div>
</template>
