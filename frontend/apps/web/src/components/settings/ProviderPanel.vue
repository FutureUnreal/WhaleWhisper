<script setup lang="ts">
import { computed } from "vue";

import type { ProviderCategory, ProviderField } from "@whalewhisper/app-core/data/provider-catalog";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useProvidersStore } from "@whalewhisper/app-core/stores/providers";
import SelectMenu from "../ui/SelectMenu.vue";

const props = defineProps<{
  category: ProviderCategory;
  title: string;
  description: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const providersStore = useProvidersStore();
const { t } = useI18n();

const providerId = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const options = computed(() => providersStore.getProviderOptions(props.category));
const status = computed(() => providersStore.getProviderStatus(providerId.value));
const runtime = computed(() => providersStore.providerRuntime[providerId.value]);
const fields = computed(() => providersStore.getProviderFields(providerId.value));

const labelOverrides = computed(() => ({
  apiKey: t("providers.label.apiKey"),
  baseUrl: t("providers.label.baseUrl"),
  model: t("providers.label.model"),
  voice: t("providers.label.voice"),
}));

const statusText = computed(() => {
  if (runtime.value?.isValidating) {
    return t("common.checking");
  }
  return status.value === "online" ? t("common.online") : t("common.offline");
});

function resolveLabel(field: ProviderField) {
  return labelOverrides.value[field.id] ?? field.label;
}

function resolvePlaceholder(field: ProviderField) {
  if (field.placeholder) return field.placeholder;
  if (field.id === "model") return t("providers.placeholder.model");
  if (field.id === "voice") return t("providers.placeholder.voice");
  return field.label || t("common.select");
}

function getFieldValue(field: ProviderField) {
  return providersStore.getProviderFieldValue(providerId.value, field);
}

function setFieldValue(field: ProviderField, value: string) {
  providersStore.setProviderFieldValue(providerId.value, field, value);
}

function getFieldOptions(field: ProviderField) {
  return providersStore.getProviderFieldOptions(providerId.value, field);
}

function getInputType(field: ProviderField) {
  return field.type === "secret" ? "password" : "text";
}

function refreshProvider() {
  void providersStore.refreshProvider(providerId.value);
}
</script>

<template>
  <div class="min-w-0 rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
    <div class="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
      {{ props.title }}
    </div>
    <div class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ props.description }}
    </div>
    <div class="mt-3 flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-400">
      <div class="flex items-center gap-2">
        <span>{{ t("providers.status.label") }}</span>
        <span class="font-medium text-neutral-700 dark:text-neutral-200">
          {{ statusText }}
        </span>
      </div>
      <button
        type="button"
        class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
        :disabled="runtime?.isValidating"
        @click="refreshProvider"
      >
        {{ t("common.check") }}
      </button>
    </div>
    <div class="mt-3">
      <SelectMenu
        v-model="providerId"
        :options="options"
        :status="status"
        :placeholder="t('providers.placeholder.provider')"
      />
    </div>
    <div class="mt-3 grid gap-2">
      <div v-for="field in fields" :key="field.id" class="grid min-w-0 gap-1">
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ resolveLabel(field) }}
          <span v-if="field.required" class="text-rose-500"> *</span>
        </label>
        <SelectMenu
          v-if="field.type === 'select' && getFieldOptions(field).length"
          :model-value="getFieldValue(field)"
          :options="getFieldOptions(field)"
          :placeholder="resolvePlaceholder(field)"
          @update:modelValue="(value) => setFieldValue(field, value)"
        />
        <input
          v-else
          :value="getFieldValue(field)"
          :type="getInputType(field)"
          :placeholder="resolvePlaceholder(field)"
          class="w-full min-w-0 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
          @input="setFieldValue(field, ($event.target as HTMLInputElement).value)"
        />
        <div v-if="field.description" class="text-xs text-neutral-400 dark:text-neutral-500">
          {{ field.description }}
        </div>
      </div>
      <div
        v-if="runtime?.lastError"
        class="max-w-full break-all rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-500 dark:border-rose-500/30 dark:bg-rose-950/40"
      >
        {{ runtime.lastError }}
      </div>
    </div>
  </div>
</template>
