<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useDisplayModelsStore } from "../stores/display-models";
import { useLive2d } from "../stores/live2d";
import { useStageSettingsStore } from "../stores/stage-settings";
import Live2DStage from "./Live2DStage.vue";
import VrmStage from "./VrmStage.vue";

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

const displayModels = useDisplayModelsStore();
const { activeModel, activeModelSource } = storeToRefs(displayModels);
const live2dStore = useLive2d();
const { modelRect, position } = storeToRefs(live2dStore);
const settingsStore = useStageSettingsStore();
const { stageModelRenderer, stageDragEnabled } = storeToRefs(settingsStore);
const stageRef = ref<HTMLDivElement | null>(null);
const live2dStageRef = ref<InstanceType<typeof Live2DStage> | null>(null);
const vrmStageRef = ref<InstanceType<typeof VrmStage> | null>(null);

const modelSource = computed(() => activeModelSource.value);
const isVrm = computed(() => activeModel.value?.format === "vrm");
const isDragging = ref(false);
const dragStartPoint = ref({ x: 0, y: 0 });
const dragStartPosition = ref({ x: 0, y: 0, z: 0 });
const dragStageSize = ref({ width: 1, height: 1 });
const hoveringModel = ref(false);

const stageCursor = computed(() => {
  if (!stageDragEnabled.value) return "default";
  if (isDragging.value) return "grabbing";
  if (hoveringModel.value) return "grab";
  return "default";
});

function resolveLocalPointFromClient(clientX: number, clientY: number) {
  const rect = stageRef.value?.getBoundingClientRect();
  if (!rect) return null;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    rect,
  };
}

function resolveLocalPoint(event: MouseEvent) {
  return resolveLocalPointFromClient(event.clientX, event.clientY);
}

function isPointInModel(x: number, y: number) {
  const rect = modelRect.value;
  if (rect.right <= rect.left || rect.bottom <= rect.top) return true;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function beginDrag(clientX: number, clientY: number, rect: DOMRect) {
  isDragging.value = true;
  dragStartPoint.value = { x: clientX, y: clientY };
  dragStartPosition.value = {
    x: Number(position.value.x || 0),
    y: Number(position.value.y || 0),
    z: Number(position.value.z || 0),
  };
  dragStageSize.value = {
    width: rect.width,
    height: rect.height,
  };
}

function handlePointerMove(event: MouseEvent) {
  if (!stageDragEnabled.value) {
    hoveringModel.value = false;
    return;
  }
  const local = resolveLocalPoint(event);
  if (!local) {
    hoveringModel.value = false;
    return;
  }
  const isInsideStage =
    local.x >= 0 &&
    local.y >= 0 &&
    local.x <= local.rect.width &&
    local.y <= local.rect.height;
  hoveringModel.value = isInsideStage && isPointInModel(local.x, local.y);
  if (!isDragging.value) return;
  const width = Math.max(1, dragStageSize.value.width);
  const height = Math.max(1, dragStageSize.value.height);
  const deltaX = ((event.clientX - dragStartPoint.value.x) / width) * 100;
  const deltaY = ((event.clientY - dragStartPoint.value.y) / height) * 100;
  if (isVrm.value && event.shiftKey) {
    live2dStore.setPosition({
      z: dragStartPosition.value.z + deltaY,
    });
  } else {
    live2dStore.setPosition({
      x: dragStartPosition.value.x + deltaX,
      y: dragStartPosition.value.y + deltaY,
    });
  }
}

function handlePointerDown(event: MouseEvent) {
  if (!stageDragEnabled.value) return;
  const target = event.target as Node | null;
  if (target && stageRef.value && !stageRef.value.contains(target)) {
    return;
  }
  const local = resolveLocalPoint(event);
  if (!local) return;
  if (
    local.x < 0 ||
    local.y < 0 ||
    local.x > local.rect.width ||
    local.y > local.rect.height
  ) {
    return;
  }
  if (!isPointInModel(local.x, local.y)) return;
  beginDrag(event.clientX, event.clientY, local.rect);
  if ("preventDefault" in event) {
    event.preventDefault();
  }
}

function endDrag(event?: MouseEvent) {
  if (!isDragging.value) return;
  isDragging.value = false;
}

function handleTouchStart(event: TouchEvent) {
  if (!stageDragEnabled.value) return;
  if (!event.touches.length) return;
  const touch = event.touches[0];
  const target = event.target as Node | null;
  if (target && stageRef.value && !stageRef.value.contains(target)) {
    return;
  }
  const local = resolveLocalPointFromClient(touch.clientX, touch.clientY);
  if (!local) return;
  if (
    local.x < 0 ||
    local.y < 0 ||
    local.x > local.rect.width ||
    local.y > local.rect.height
  ) {
    return;
  }
  if (!isPointInModel(local.x, local.y)) return;
  beginDrag(touch.clientX, touch.clientY, local.rect);
}

function handleTouchMove(event: TouchEvent) {
  if (!stageDragEnabled.value) return;
  if (!event.touches.length) return;
  if (!isDragging.value) return;
  event.preventDefault();
  const touch = event.touches[0];
  const width = Math.max(1, dragStageSize.value.width);
  const height = Math.max(1, dragStageSize.value.height);
  const deltaX = ((touch.clientX - dragStartPoint.value.x) / width) * 100;
  const deltaY = ((touch.clientY - dragStartPoint.value.y) / height) * 100;
  live2dStore.setPosition({
    x: dragStartPosition.value.x + deltaX,
    y: dragStartPosition.value.y + deltaY,
  });
}

function handleTouchEnd() {
  if (isDragging.value) {
    endDrag();
  }
}

function handlePointerLeave(event: MouseEvent) {
  hoveringModel.value = false;
  if (isDragging.value) {
    endDrag(event);
  }
}

const state = defineModel<"pending" | "loading" | "mounted">("state", {
  default: "pending",
});

watch(
  activeModel,
  (model) => {
    if (model?.format && stageModelRenderer.value !== model.format) {
      stageModelRenderer.value = model.format;
    }
  },
  { immediate: true }
);

watch(stageDragEnabled, (enabled) => {
  if (!enabled) {
    hoveringModel.value = false;
    endDrag();
  }
});

function handleGlobalMouseMove(event: MouseEvent) {
  handlePointerMove(event);
}

function handleGlobalMouseDown(event: MouseEvent) {
  handlePointerDown(event);
}

function handleGlobalMouseUp(event: MouseEvent) {
  endDrag(event);
}

onMounted(() => {
  window.addEventListener("mousemove", handleGlobalMouseMove);
  window.addEventListener("mousedown", handleGlobalMouseDown);
  window.addEventListener("mouseup", handleGlobalMouseUp);
  window.addEventListener("mouseleave", handlePointerLeave);
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd);
  window.addEventListener("touchcancel", handleTouchEnd);
});

onUnmounted(() => {
  window.removeEventListener("mousemove", handleGlobalMouseMove);
  window.removeEventListener("mousedown", handleGlobalMouseDown);
  window.removeEventListener("mouseup", handleGlobalMouseUp);
  window.removeEventListener("mouseleave", handlePointerLeave);
  window.removeEventListener("touchstart", handleTouchStart);
  window.removeEventListener("touchmove", handleTouchMove);
  window.removeEventListener("touchend", handleTouchEnd);
  window.removeEventListener("touchcancel", handleTouchEnd);
});

defineExpose({
  canvasElement: () =>
    live2dStageRef.value?.canvasElement?.() ??
    vrmStageRef.value?.canvasElement?.() ??
    undefined,
});
</script>

<template>
  <div ref="stageRef" relative h-full w-full :style="{ cursor: stageCursor }">
    <div
      h-full
      w-full
      :class="stageDragEnabled ? 'pointer-events-none' : 'pointer-events-auto'"
    >
      <VrmStage
        v-if="isVrm"
        ref="vrmStageRef"
        :model-src="modelSource"
        :model-id="activeModel?.id"
        :paused="props.paused"
      />
      <Live2DStage
        v-else
        ref="live2dStageRef"
        v-model:state="state"
        min-w="50% <lg:full"
        min-h="100 sm:100"
        h-full
        w-full
        flex-1
        :model-src="modelSource"
        :model-id="activeModel?.id"
        :focus-at="props.focusAt"
        :paused="props.paused"
        :x-offset="props.xOffset"
        :y-offset="props.yOffset"
        :scale="props.scale"
      />
    </div>
  </div>
</template>
