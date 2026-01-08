<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useTheme } from "@whalewhisper/app-core/composables/use-theme";
import { BackgroundKind, useBackgroundStore } from "@whalewhisper/app-core/stores/background";
import type { BackgroundItem } from "@whalewhisper/app-core/stores/background";
import { DefaultBackgroundPreview } from "./default";

const show = defineModel<boolean>({ default: false });

const backgroundStore = useBackgroundStore();
const { options, selectedOption } = storeToRefs(backgroundStore);
const { t } = useI18n();
const { isDark } = useTheme();

const fileInputRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

function handleApply(optionId: string) {
  const option = options.value.find((item) => item.id === optionId);
  if (!option) return;
  backgroundStore.applyPickerSelection({
    option,
    color: option.accent,
  });
  show.value = false;
}

function handleUploadClick() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Check file type
  if (!file.type.startsWith("image/")) {
    alert("请选择图片文件");
    return;
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("图片大小不能超过 5MB");
    return;
  }

  uploading.value = true;
  try {
    const customBg = await backgroundStore.addCustomBackground(file);
    backgroundStore.applyPickerSelection({
      option: customBg,
      color: customBg.accent,
    });
    show.value = false;
  } catch (error) {
    console.error("Failed to upload background:", error);
    alert("上传失败，请重试");
  } finally {
    uploading.value = false;
    // Reset input
    if (target) target.value = "";
  }
}

function handleRemoveCustom(event: Event, optionId: string) {
  event.stopPropagation();
  if (confirm("确定要删除这个自定义背景吗？")) {
    backgroundStore.removeCustomBackground(optionId);
  }
}

function isCustomBackground(optionId: string) {
  return optionId.startsWith("custom-");
}

function getPreviewGradient(option: BackgroundItem) {
  if (option.kind !== BackgroundKind.Gradient) {
    return option.gradient || '#0b1220';
  }
  
  if (option.gradientLight && option.gradientDark) {
    return isDark.value ? option.gradientDark : option.gradientLight;
  }
  
  return option.gradient || '#0b1220';
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      class="absolute inset-0 bg-black/40 backdrop-blur-sm"
      type="button"
      :aria-label="t('aria.closeBackgroundPicker')"
      @click="show = false"
    />
    <div class="relative z-10 w-full max-w-3xl rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur-md dark:bg-neutral-900/90">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {{ t("backgrounds.title") }}
          </div>
          <div class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ t("backgrounds.subtitle") }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-primary-200 bg-primary-50/70 px-3 py-2 text-sm font-medium text-primary-600 shadow-sm transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
            :disabled="uploading"
            @click="handleUploadClick"
          >
            <div class="flex items-center gap-2">
              <div class="i-solar:upload-bold-duotone h-4 w-4" />
              <span>{{ uploading ? "上传中..." : "上传图片" }}</span>
            </div>
          </button>
        <button
          type="button"
          class="rounded-xl border border-neutral-200 bg-white/70 p-2 text-neutral-500 shadow-sm transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          @click="show = false"
        >
          <div class="i-solar:close-circle-bold-duotone h-5 w-5" />
        </button>
      </div>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="group relative rounded-xl border-2 p-2 text-left transition"
          :class="option.id === selectedOption?.id
            ? 'border-primary-500/80 shadow-lg shadow-primary-500/10'
            : 'border-neutral-200 dark:border-neutral-800'"
          @click="handleApply(option.id)"
        >
          <div class="aspect-video w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/70">
            <DefaultBackgroundPreview
              v-if="option.kind === BackgroundKind.Wave"
              class="h-full w-full"
            />
            <img
              v-else-if="option.kind === BackgroundKind.Image && option.src"
              :src="option.src"
              :alt="option.label"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="h-full w-full"
              :style="{ background: getPreviewGradient(option) }"
            />
          </div>
          <div class="mt-2 flex items-start justify-between gap-2">
            <div class="flex flex-col gap-1 flex-1 min-w-0">
              <span class="text-base font-medium text-neutral-800 truncate dark:text-neutral-100">{{ option.label }}</span>
            <span v-if="option.description" class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ option.description }}
            </span>
            </div>
            <button
              v-if="isCustomBackground(option.id)"
              type="button"
              class="flex-shrink-0 rounded-lg p-1 text-red-500 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-900/20"
              :title="'删除'"
              @click="handleRemoveCustom($event, option.id)"
            >
              <div class="i-solar:trash-bin-trash-bold h-4 w-4" />
            </button>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
