<script setup lang="ts">
import type { Application } from "pixi.js";

import {
  breakpointsTailwind,
  until,
  useBreakpoints,
  useDebounceFn,
} from "@vueuse/core";
import { Live2DFactory, Live2DModel } from "pixi-live2d-display/cubism4";
import { computed, onUnmounted, ref, toRef, watch } from "vue";

import { useLive2d } from "../../../stores/live2d";
import { useLive2dRuntime } from "../../../stores/live2d-runtime";
import { useStageModelCapabilitiesStore } from "../../../stores/stage-model-capabilities";
import { extractLive2dCapabilities } from "../../../utils/model-capabilities";

const props = withDefaults(
  defineProps<{
    modelSrc?: string | File | File[];
    modelId?: string;
    app?: Application;
    width: number;
    height: number;
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
    disableFocusAt: false,
    scale: 1,
  }
);

const emits = defineEmits<{
  (e: "modelLoaded"): void;
}>();

const componentState = defineModel<"pending" | "loading" | "mounted">("state", {
  default: "pending",
});

function parsePropsOffset() {
  let xOffset = Number.parseFloat(String(props.xOffset)) || 0;
  let yOffset = Number.parseFloat(String(props.yOffset)) || 0;

  if (String(props.xOffset).endsWith("%")) {
    xOffset =
      (Number.parseFloat(String(props.xOffset).replace("%", "")) / 100) *
      props.width;
  }
  if (String(props.yOffset).endsWith("%")) {
    yOffset =
      (Number.parseFloat(String(props.yOffset).replace("%", "")) / 100) *
      props.height;
  }

  return {
    xOffset,
    yOffset,
  };
}

const modelSrcRef = toRef(() => props.modelSrc);

const modelLoading = ref(false);
let isUnmounted = false;

const offset = computed(() => parsePropsOffset());

const pixiApp = toRef(() => props.app);
const paused = toRef(() => props.paused);
const focusAt = toRef(() => props.focusAt);
const model = ref<Live2DModel>();
const live2dRuntime = useLive2dRuntime();
const live2dStore = useLive2d();
const stageModelCapabilities = useStageModelCapabilitiesStore();
const initialModelWidth = ref(0);
const initialModelHeight = ref(0);

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = computed(
  () =>
    breakpoints.between("sm", "md").value || breakpoints.smaller("sm").value
);

function setScaleAndPosition() {
  if (!model.value) {
    return;
  }

  let offsetFactor = 2.2;
  if (isMobile.value) {
    offsetFactor = 2.2;
  }

  const heightScale =
    (props.height * 0.95 * offsetFactor) / initialModelHeight.value;
  const widthScale =
    (props.width * 0.95 * offsetFactor) / initialModelWidth.value;
  let scale = Math.min(heightScale, widthScale);

  if (Number.isNaN(scale) || scale <= 0) {
    scale = 1e-6;
  }

  model.value.scale.set(scale * props.scale, scale * props.scale);
  model.value.x = props.width / 2 + offset.value.xOffset;
  model.value.y = props.height / 2 + offset.value.yOffset;
  const bounds = model.value.getBounds();
  const renderer = pixiApp.value?.renderer;
  const view = renderer?.view;
  const stageScaleX = pixiApp.value?.stage.scale.x ?? 1;
  const stageScaleY = pixiApp.value?.stage.scale.y ?? 1;
  const fallbackScaleX =
    Number.isFinite(stageScaleX) && stageScaleX > 0 ? 1 / stageScaleX : 1;
  const fallbackScaleY =
    Number.isFinite(stageScaleY) && stageScaleY > 0 ? 1 / stageScaleY : 1;
  const rendererWidth = renderer?.width ?? 0;
  const rendererHeight = renderer?.height ?? 0;
  const viewWidth = view?.clientWidth ?? 0;
  const viewHeight = view?.clientHeight ?? 0;
  const scaleX =
    viewWidth > 0 && rendererWidth > 0 ? viewWidth / rendererWidth : fallbackScaleX;
  const scaleY =
    viewHeight > 0 && rendererHeight > 0 ? viewHeight / rendererHeight : fallbackScaleY;
  const boundsWidth = bounds.width * scaleX;
  const boundsHeight = bounds.height * scaleY;
  live2dStore.setModelBounds({
    width: boundsWidth,
    height: boundsHeight,
  });
  live2dStore.setModelRect({
    left: bounds.x * scaleX,
    top: bounds.y * scaleY,
    right: (bounds.x + bounds.width) * scaleX,
    bottom: (bounds.y + bounds.height) * scaleY,
  });
}

async function loadModel() {
  await until(modelLoading).not.toBeTruthy();

  modelLoading.value = true;
  componentState.value = "loading";

  if (!pixiApp.value || !pixiApp.value.stage) {
    try {
      await until(() => !!pixiApp.value && !!pixiApp.value.stage).toBeTruthy({
        timeout: 1500,
      });
    } catch {
      modelLoading.value = false;
      componentState.value = "mounted";
      return;
    }
  }

  if (model.value && pixiApp.value?.stage) {
    try {
      pixiApp.value.stage.removeChild(model.value);
      model.value.destroy();
      live2dRuntime.clearModel();
    } catch (error) {
      console.warn("Error removing old model:", error);
    }
    model.value = undefined;
  }

  if (!modelSrcRef.value) {
    console.warn("No Live2D model source provided.");
    modelLoading.value = false;
    componentState.value = "mounted";
    return;
  }

  try {
    if (isUnmounted) {
      modelLoading.value = false;
      componentState.value = "mounted";
      return;
    }

    const live2DModel = new Live2DModel();
    const source = modelSrcRef.value;
    const resolvedSource =
      typeof source === "string"
        ? { url: source, id: props.modelId }
        : source instanceof File
          ? [source]
          : source;
    await Live2DFactory.setupLive2DModel(live2DModel, resolvedSource, {
      autoInteract: false,
    });

    model.value = live2DModel;
    pixiApp.value!.stage.addChild(model.value);
    initialModelWidth.value = model.value.width;
    initialModelHeight.value = model.value.height;
    model.value.anchor.set(0.5, 0.5);
    setScaleAndPosition();
    live2dRuntime.registerModel(model.value);
    if (props.modelId) {
      const capabilities = extractLive2dCapabilities(live2DModel);
      stageModelCapabilities.setLive2dCapabilities(props.modelId, capabilities);
    }

    model.value.interactive = true;
    model.value.on("hit", (hitAreas) => {
      if (model.value && hitAreas.includes("body")) {
        model.value.motion("tap_body");
      }
    });

    emits("modelLoaded");
  } finally {
    modelLoading.value = false;
    componentState.value = "mounted";
  }
}

const handleResize = useDebounceFn(setScaleAndPosition, 100);

watch([() => props.width, () => props.height], handleResize);
watch(modelSrcRef, async () => await loadModel(), { immediate: true });
watch(offset, setScaleAndPosition);
watch(() => props.scale, setScaleAndPosition);
watch(paused, (value) => (value ? pixiApp.value?.stop() : pixiApp.value?.start()));

watch(focusAt, (value) => {
  if (!model.value) {
    return;
  }
  if (props.disableFocusAt) {
    return;
  }
  model.value.focus(value?.x ?? 0, value?.y ?? 0);
});

onUnmounted(() => {
  isUnmounted = true;
  live2dRuntime.clearModel();
});
</script>

<template>
  <slot />
</template>
