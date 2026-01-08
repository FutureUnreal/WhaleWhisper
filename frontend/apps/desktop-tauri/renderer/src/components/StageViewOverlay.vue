<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import {
  useDisplayModelsStore,
  useLive2d,
  useStageSettingsStore,
} from "@whalewhisper/stage-core";

const stageSettings = useStageSettingsStore();
const live2d = useLive2d();
const displayModels = useDisplayModelsStore();

const { stageViewControlsEnabled } = storeToRefs(stageSettings);
const { scale, position } = storeToRefs(live2d);
const { activeModel } = storeToRefs(displayModels);
const containerRef = ref<HTMLElement | null>(null);

const isVrm = computed(() => activeModel.value?.format === "vrm");

const scaleValue = computed({
  get: () => Number(scale.value || 1),
  set: (value) => {
    scale.value = value;
  },
});

const xValue = computed({
  get: () => Number(position.value.x || 0),
  set: (value) => {
    position.value.x = value;
  },
});

const yValue = computed({
  get: () => Number(position.value.y || 0),
  set: (value) => {
    position.value.y = value;
  },
});

const zValue = computed({
  get: () => Number(position.value.z || 0),
  set: (value) => {
    position.value.z = value;
  },
});

function handleReset() {
  live2d.resetView();
}

onClickOutside(containerRef, () => {
  stageViewControlsEnabled.value = false;
});
</script>

<template>
  <div
    v-if="stageViewControlsEnabled"
    ref="containerRef"
    data-controls-hitbox
    class="pointer-events-auto absolute right-20 bottom-24 z-30 w-64 rounded-xl border border-neutral-200/70 bg-white/80 p-3 text-xs shadow-xl backdrop-blur-md"
  >
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs font-semibold text-neutral-800">View</span>
      <button
        type="button"
        class="rounded-md border border-neutral-200 bg-white/70 px-2 py-1 text-[10px] text-neutral-500 transition hover:text-neutral-900"
        @click="stageViewControlsEnabled = false"
      >
        Close
      </button>
    </div>

    <div class="grid gap-2">
      <label class="flex flex-col gap-1 text-[11px] text-neutral-500">
        Scale
        <input
          v-model.number="scaleValue"
          type="range"
          min="0.1"
          max="2"
          step="0.01"
          class="w-full accent-primary-500"
        />
      </label>
      <label class="flex flex-col gap-1 text-[11px] text-neutral-500">
        X Offset
        <input
          v-model.number="xValue"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full accent-primary-500"
        />
      </label>
      <label class="flex flex-col gap-1 text-[11px] text-neutral-500">
        Y Offset
        <input
          v-model.number="yValue"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full accent-primary-500"
        />
      </label>
      <label
        v-if="isVrm"
        class="flex flex-col gap-1 text-[11px] text-neutral-500"
      >
        Z Offset
        <input
          v-model.number="zValue"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full accent-primary-500"
        />
      </label>
    </div>

    <button
      type="button"
      class="mt-3 w-full rounded-lg border border-neutral-200 bg-white/80 px-2 py-1 text-[11px] text-neutral-600 transition hover:text-neutral-900"
      @click="handleReset"
    >
      Reset
    </button>
  </div>
</template>
