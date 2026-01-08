<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useSettingsStore } from "@whalewhisper/app-core/stores/settings";

const emits = defineEmits<{
  (e: "reset"): void;
}>();

const settings = useSettingsStore();
const { stageModelRenderer, stageViewControlsEnabled } = storeToRefs(settings);
const { t } = useI18n();

const mode = defineModel<"x" | "y" | "z" | "scale">({ required: true });

function handleViewControlsToggle(targetMode: "x" | "y" | "z" | "scale") {
  if (mode.value === targetMode) {
    emits("reset");
    return;
  }

  mode.value = targetMode;
}
</script>

<template>
  <div w-full flex flex-1 items-center self-end justify-end gap-2>
    <Transition name="fade">
      <div v-if="stageViewControlsEnabled" flex gap-2>
        <button
          class="rounded-lg border border-neutral-200/70 bg-white/70 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-300"
          :class="mode === 'x' ? 'text-primary-600 dark:text-primary-300 border-primary-300/80' : ''"
          type="button"
          @click="handleViewControlsToggle('x')"
        >
          X
        </button>
        <button
          class="rounded-lg border border-neutral-200/70 bg-white/70 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-300"
          :class="mode === 'y' ? 'text-primary-600 dark:text-primary-300 border-primary-300/80' : ''"
          type="button"
          @click="handleViewControlsToggle('y')"
        >
          Y
        </button>
        <button
          v-if="stageModelRenderer === 'vrm'"
          class="rounded-lg border border-neutral-200/70 bg-white/70 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-300"
          :class="mode === 'z' ? 'text-primary-600 dark:text-primary-300 border-primary-300/80' : ''"
          type="button"
          @click="handleViewControlsToggle('z')"
        >
          Z
        </button>
        <button
          class="rounded-lg border border-neutral-200/70 bg-white/70 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-300"
          :class="mode === 'scale' ? 'text-primary-600 dark:text-primary-300 border-primary-300/80' : ''"
          type="button"
          @click="handleViewControlsToggle('scale')"
        >
          {{ t("viewControls.scale") }}
        </button>
      </div>
    </Transition>
    <button
      w-fit
      flex
      items-center
      self-end
      justify-center
      rounded-xl
      p-2
      backdrop-blur-md
      border="2 solid neutral-100/60 dark:neutral-800/30"
      bg="neutral-50/70 dark:neutral-800/70"
      :title="t('viewControls.title')"
      text="neutral-500 dark:neutral-400"
      type="button"
      @click="settings.toggleViewControls()"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="!stageViewControlsEnabled" i-solar:tuning-outline size-5 />
        <div v-else i-solar:alt-arrow-right-outline size-5 />
      </Transition>
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
