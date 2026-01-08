<script setup lang="ts">
import { computed } from "vue";

import ProviderPanel from "./ProviderPanel.vue";

type ProviderOption = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
};

type ProviderField = {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value?: string;
  options?: ProviderOption[];
};

type ProviderRuntime = {
  isValidating?: boolean;
  lastError?: string;
};

type ProviderStatus = "online" | "offline" | "unknown";

type PanelConfig = {
  id: string;
  title: string;
  description: string;
  modelValue: string;
  options: ProviderOption[];
  status?: ProviderStatus;
  runtime?: ProviderRuntime;
  fields?: ProviderField[];
  onUpdateModelValue?: (value: string) => void;
  onUpdateFieldValue?: (fieldId: string, value: string) => void;
  onRefresh?: () => void;
};

const props = defineProps<{
  locale?: string;
  t?: (key: string) => string;
  panels: PanelConfig[];
  catalogError?: string | null;
  catalogLoading?: boolean;
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
  "common.checking": "Checking",
};

const fallbackZh = {
  "common.checking": "检查中",
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
  <div class="grid gap-4">
    <div
      v-if="props.catalogError"
      class="rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-500 dark:border-rose-500/30 dark:bg-rose-950/40"
    >
      {{ props.catalogError }}
    </div>
    <div v-else-if="props.catalogLoading" class="text-xs text-neutral-400">
      {{ t("common.checking") }}
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <ProviderPanel
        v-for="panel in props.panels"
        :key="panel.id"
        :title="panel.title"
        :description="panel.description"
        :model-value="panel.modelValue"
        :options="panel.options"
        :status="panel.status"
        :runtime="panel.runtime"
        :fields="panel.fields"
        :locale="props.locale"
        :t="props.t"
        :on-refresh="panel.onRefresh"
        :on-update-model-value="panel.onUpdateModelValue"
        :on-update-field-value="panel.onUpdateFieldValue"
      />
    </div>
  </div>
</template>
