<script setup lang="ts">
import { computed, ref, type Component } from "vue";

const props = defineProps<{
  locale?: string;
  isDark?: boolean;
  onToggleTheme?: () => void;
  backgroundDialog?: Component;
  t?: (key: string) => string;
}>();

const backgroundDialogOpen = ref(false);

const resolvedLocale = computed(() => {
  if (props.locale) return props.locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
});
const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith("zh"));

const fallbackEn = {
  "appearance.title": "Appearance",
  "appearance.theme.title": "Theme",
  "appearance.theme.desc": "Switch between light and dark mode.",
  "appearance.theme.dark": "Dark",
  "appearance.theme.light": "Light",
  "appearance.background.title": "Background",
  "appearance.background.desc": "Choose the stage background.",
  "common.choose": "Choose",
};

const fallbackZh = {
  "appearance.title": "外观",
  "appearance.theme.title": "主题",
  "appearance.theme.desc": "在浅色/深色主题之间切换。",
  "appearance.theme.dark": "深色",
  "appearance.theme.light": "浅色",
  "appearance.background.title": "背景",
  "appearance.background.desc": "选择舞台背景。",
  "common.choose": "选择",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  if (props.t) {
    const resolved = props.t(key);
    if (resolved && resolved !== key) return resolved;
  }
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};

const isDark = computed(() => !!props.isDark);
const canToggleTheme = computed(() => typeof props.onToggleTheme === "function");
const backgroundDialog = computed(() => props.backgroundDialog);
const canPickBackground = computed(() => !!props.backgroundDialog);

function handleToggleTheme() {
  if (!props.onToggleTheme) return;
  props.onToggleTheme();
}

function handleOpenBackground() {
  if (!props.backgroundDialog) return;
  backgroundDialogOpen.value = true;
}
</script>

<template>
  <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
    <component v-if="backgroundDialog" :is="backgroundDialog" v-model="backgroundDialogOpen" />
    <div class="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
      {{ t("appearance.title") }}
    </div>
    <div class="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
      <div>
        <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {{ t("appearance.theme.title") }}
        </div>
        <div class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("appearance.theme.desc") }}
        </div>
      </div>
      <button
        class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
        :class="!canToggleTheme ? 'cursor-not-allowed opacity-60 hover:text-neutral-600' : ''"
        type="button"
        :disabled="!canToggleTheme"
        @click="handleToggleTheme"
      >
        {{ isDark ? t("appearance.theme.dark") : t("appearance.theme.light") }}
      </button>
    </div>
    <div class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
      <div>
        <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {{ t("appearance.background.title") }}
        </div>
        <div class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("appearance.background.desc") }}
        </div>
      </div>
      <button
        class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
        :class="!canPickBackground ? 'cursor-not-allowed opacity-60 hover:text-neutral-600' : ''"
        type="button"
        :disabled="!canPickBackground"
        @click="handleOpenBackground"
      >
        {{ t("common.choose") }}
      </button>
    </div>
  </div>
</template>
