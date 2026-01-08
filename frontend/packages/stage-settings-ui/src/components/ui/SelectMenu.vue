<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, ref } from "vue";

import { useStageI18n } from "@whalewhisper/stage-core";
import TransitionVertical from "./TransitionVertical.vue";

type Option = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
};

type Status = "online" | "offline" | "unknown";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: Option[];
    placeholder?: string;
    status?: Status;
    listClass?: string;
    itemClass?: string;
  }>(),
  {
    placeholder: "",
    status: "unknown",
    listClass: "max-h-[200px]",
    itemClass: "h-[50px]",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const open = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const { t: tRaw } = useStageI18n();
const fallbackSelect = (() => {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("zh") ? "请选择" : "Select";
  }
  return "Select";
})();
const t = (key: string) => {
  const resolved = tRaw(key);
  if (resolved && resolved !== key) return resolved;
  if (key === "common.select") return fallbackSelect;
  return key;
};

const selected = computed(() => props.options.find((option) => option.id === props.modelValue));
const placeholderText = computed(() => props.placeholder || t("common.select"));

const showStatus = computed(() => props.status !== "unknown");
const statusClasses = computed(() => {
  if (props.status === "online") {
    return "bg-emerald-400 ring-emerald-200/60 dark:ring-emerald-500/20";
  }

  return "bg-rose-400 ring-rose-200/60 dark:ring-rose-500/20";
});

function toggleOpen() {
  open.value = !open.value;
}

function selectOption(optionId: string) {
  emit("update:modelValue", optionId);
  open.value = false;
}

onClickOutside(containerRef, () => {
  open.value = false;
});
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 text-left text-sm shadow-sm transition hover:text-neutral-900 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-200"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {{ selected?.label ?? placeholderText }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div v-if="showStatus" class="h-2 w-2 rounded-full ring-2" :class="statusClasses" />
        <div class="i-solar:alt-arrow-down-linear h-4 w-4 text-neutral-500" />
      </div>
    </button>

    <TransitionVertical>
      <div
        v-if="open"
        class="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-200/70 bg-white/95 p-1 shadow-xl dark:border-neutral-800/70 dark:bg-neutral-950/95"
      >
        <div class="overflow-y-auto" :class="props.listClass">
          <button
            v-for="option in options"
            :key="option.id"
            type="button"
            class="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-900/70"
            :class="props.itemClass"
            @click="selectOption(option.id)"
          >
            <div class="flex min-w-0 flex-col">
              <span class="font-medium text-neutral-800 dark:text-neutral-100">
                {{ option.label }}
              </span>
              <span v-if="option.description" class="break-all text-xs text-neutral-500 dark:text-neutral-400">
                {{ option.description }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div
                v-if="option.icon"
                :class="option.icon"
                class="h-5 w-5 text-neutral-400/70 dark:text-neutral-600/60 grayscale-100"
              />
            </div>
          </button>
        </div>
      </div>
    </TransitionVertical>
  </div>
</template>
