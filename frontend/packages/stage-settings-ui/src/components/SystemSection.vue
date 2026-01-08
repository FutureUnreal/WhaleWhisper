<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  locale?: string;
  t?: (key: string) => string;
  userId?: string;
  profileId?: string;
  wsUrl?: string;
}>();

const resolvedLocale = computed(() => {
  if (props.locale) return props.locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
});
const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith("zh"));

const fallbackEn = {
  "system.title": "System",
  "system.userId": "User ID",
  "system.profileId": "Profile ID",
  "system.wsUrl": "WS URL",
};

const fallbackZh = {
  "system.title": "系统",
  "system.userId": "用户 ID",
  "system.profileId": "Profile ID",
  "system.wsUrl": "WS 地址",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  if (props.t) {
    const resolved = props.t(key);
    if (resolved && resolved !== key) return resolved;
  }
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};
</script>

<template>
  <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
    <div class="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
      {{ t("system.title") }}
    </div>
    <div class="flex flex-col gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <div class="flex items-center justify-between">
        <span>{{ t("system.userId") }}</span>
        <span class="font-medium text-neutral-700 dark:text-neutral-200">{{ props.userId }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>{{ t("system.profileId") }}</span>
        <span class="font-medium text-neutral-700 dark:text-neutral-200">{{ props.profileId }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>{{ t("system.wsUrl") }}</span>
        <span class="font-medium text-neutral-700 dark:text-neutral-200">{{ props.wsUrl }}</span>
      </div>
    </div>
  </div>
</template>
