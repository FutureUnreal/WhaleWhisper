<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useDisplayModelsStore } from "@whalewhisper/app-core/stores/display-models";
import { useStageViewOverlayStore } from "@whalewhisper/app-core/stores/stage-view-overlay";
import { useLive2d } from "@whalewhisper/app-core/stores/live2d";
import { TransitionVertical } from "@whalewhisper/stage-settings-ui";

defineProps<{
  stageEl?: HTMLElement | null;
  xOffset?: number | string;
  yOffset?: number | string;
}>();
const live2d = useLive2d();
const displayModels = useDisplayModelsStore();
const overlayStore = useStageViewOverlayStore();
const { t } = useI18n();

const { scale, position } = storeToRefs(live2d);
const { activeModel } = storeToRefs(displayModels);
const { open, anchorRect } = storeToRefs(overlayStore);
const containerRef = ref<HTMLElement | null>(null);
const isVrm = computed(() => activeModel.value?.format === "vrm");

const panelStyle = computed(() => {
  if (!anchorRect.value) {
    return {
      left: "auto",
      top: "auto",
      transform: "translate(0, 0)",
    };
  }
  return {
    left: `${anchorRect.value.left + anchorRect.value.width / 2}px`,
    top: `${anchorRect.value.top + anchorRect.value.height / 2}px`,
    transform: "translate(-100%, -100%) translateX(-12px)",
  };
});

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
  overlayStore.close();
});
</script>

<template>
  <div class="fixed inset-0 z-40 pointer-events-none">
    <TransitionVertical>
      <div
        v-if="open"
        ref="containerRef"
        class="pointer-events-auto absolute w-64 rounded-xl border border-neutral-200/70 bg-white/80 p-3 text-xs shadow-xl backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/80"
        :style="panelStyle"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
            {{ t("stageView.title") }}
          </span>
          <button
            type="button"
            class="rounded-md border border-neutral-200 bg-white/70 px-2 py-1 text-[10px] text-neutral-500 transition hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
            @click="overlayStore.close()"
          >
            {{ t("stageView.close") }}
          </button>
        </div>

        <div class="mb-1 text-[10px] text-neutral-500 dark:text-neutral-400">
          {{ t("stageView.desc") }}
        </div>

        <div class="grid gap-2">
          <label class="flex flex-col gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {{ t("stageView.scale") }}
            <input
              v-model.number="scaleValue"
              type="range"
              min="0.1"
              max="2"
              step="0.01"
              class="w-full accent-primary-500"
            />
          </label>
          <label class="flex flex-col gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {{ t("stageView.xOffset") }}
            <input
              v-model.number="xValue"
              type="range"
              min="-50"
              max="50"
              step="1"
              class="w-full accent-primary-500"
            />
          </label>
          <label class="flex flex-col gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {{ t("stageView.yOffset") }}
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
            class="flex flex-col gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"
          >
            {{ t("stageView.zOffset") }}
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
          class="mt-3 w-full rounded-lg border border-neutral-200 bg-white/80 px-2 py-1 text-[11px] text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
          @click="handleReset"
        >
          {{ t("stageView.reset") }}
        </button>
      </div>
    </TransitionVertical>
  </div>
</template>
