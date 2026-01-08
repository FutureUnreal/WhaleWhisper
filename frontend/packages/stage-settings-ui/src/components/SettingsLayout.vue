<script setup lang="ts">
import { computed, watch, type Component } from "vue";

type SettingsTab = {
  id: string;
  label: string;
  component: Component;
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    tabs: SettingsTab[];
    activeTab?: string;
    containerClass?: string | Array<string | undefined | false>;
    contentClass?: string;
    showClose?: boolean;
    onClose?: () => void;
  }>(),
  {
    activeTab: "",
    containerClass: "",
    contentClass: "grid gap-4 pr-1",
    showClose: true,
  }
);

const emit = defineEmits<{
  (e: "update:activeTab", value: string): void;
}>();

const resolvedActiveTab = computed(() => {
  if (!props.tabs.length) return "";
  const match = props.tabs.find((tab) => tab.id === props.activeTab);
  return match?.id ?? props.tabs[0]?.id ?? "";
});

const activeComponent = computed(
  () => props.tabs.find((tab) => tab.id === resolvedActiveTab.value)?.component
);

watch(
  () => [props.tabs, props.activeTab],
  () => {
    if (!resolvedActiveTab.value) return;
    if (props.activeTab !== resolvedActiveTab.value) {
      emit("update:activeTab", resolvedActiveTab.value);
    }
  },
  { immediate: true }
);

function selectTab(id: string) {
  emit("update:activeTab", id);
}
</script>

<template>
  <div
    class="relative z-10 flex w-full flex-col overflow-hidden rounded-2xl bg-white/90 shadow-xl backdrop-blur-md dark:bg-neutral-900/90"
    :class="props.containerClass"
  >
    <div
      class="mb-5 flex items-center justify-between"
      data-tauri-drag-region
      data-settings-drag-handle
    >
      <div>
        <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {{ props.title }}
        </div>
        <div v-if="props.subtitle" class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ props.subtitle }}
        </div>
      </div>
      <div class="flex items-center gap-2" data-tauri-drag-region="false">
        <slot name="headerExtra" />
        <button
          v-if="props.onClose && props.showClose"
          type="button"
          class="rounded-xl border border-neutral-200 bg-white/70 p-2 text-neutral-500 shadow-sm transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          data-tauri-drag-region="false"
          @click="props.onClose"
        >
          <div class="i-solar:close-circle-bold-duotone h-5 w-5" />
        </button>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap gap-2">
      <button
        v-for="tab in props.tabs"
        :key="tab.id"
        type="button"
        class="rounded-full border px-4 py-1 text-sm transition"
        :class="tab.id === resolvedActiveTab
          ? 'border-primary-500/80 bg-primary-50/80 text-primary-600 dark:border-primary-400/60 dark:bg-primary-900/40 dark:text-primary-200'
          : 'border-neutral-200 bg-white/70 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300'"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">
      <div :class="props.contentClass">
        <component :is="activeComponent" />
      </div>
    </div>
  </div>
</template>
