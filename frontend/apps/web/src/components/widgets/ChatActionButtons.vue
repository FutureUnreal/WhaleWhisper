<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useTheme } from "@whalewhisper/app-core/composables/use-theme";
import { BackgroundDialogPicker } from "@whalewhisper/app-settings/backgrounds";
import { useAgentStore } from "@whalewhisper/app-core/stores/agent";
import { useSettingsStore } from "@whalewhisper/app-core/stores/settings";
import { useStageViewOverlayStore } from "@whalewhisper/app-core/stores/stage-view-overlay";
import { getWindowBehavior, isDesktopApp, setClickThrough, setDragEnabled } from "@whalewhisper/app-core/services/desktop";

const props = withDefaults(
  defineProps<{
    layout?: "row" | "col";
    floating?: boolean;
  }>(),
  {
    layout: "row",
    floating: true,
  }
);

const { isDark, toggleDark } = useTheme();
const { t } = useI18n();
const { chatEnabled } = storeToRefs(useAgentStore());
const { stageDragEnabled } = storeToRefs(useSettingsStore());
const stageViewOverlayStore = useStageViewOverlayStore();
const desktopAvailable = isDesktopApp();
const clickThroughEnabled = ref(false);
const windowDragEnabled = ref(false);
const stageViewButtonRef = ref<HTMLButtonElement | null>(null);

const backgroundDialogOpen = ref(false);
const agentTitle = computed(() =>
  chatEnabled.value
    ? `${t("agent.chat.title")} · ${t("common.enabled")}`
    : `${t("agent.chat.title")} · ${t("common.disabled")}`
);
const dragTitle = computed(() =>
  stageDragEnabled.value
    ? `${t("action.drag")} · ${t("common.enabled")}`
    : `${t("action.drag")} · ${t("common.disabled")}`
);
const viewControlsTitle = computed(() =>
  stageViewOverlayStore.open
    ? `${t("viewControls.title")} · ${t("common.enabled")}`
    : `${t("viewControls.title")} · ${t("common.disabled")}`
);
const clickThroughTitle = computed(() =>
  clickThroughEnabled.value
    ? `${t("action.clickThrough")} · ${t("common.enabled")}`
    : `${t("action.clickThrough")} · ${t("common.disabled")}`
);
const windowDragTitle = computed(() =>
  windowDragEnabled.value
    ? `${t("action.windowDrag")} · ${t("common.enabled")}`
    : `${t("action.windowDrag")} · ${t("common.disabled")}`
);
const layoutClass = computed(() => (props.layout === "col" ? "flex-col gap-2" : "flex-row gap-2"));
const positionClass = computed(() =>
  props.floating ? "absolute -bottom-8 right-0" : "relative"
);

async function syncWindowBehavior() {
  try {
    const behavior = await getWindowBehavior();
    if (!behavior) return;
    clickThroughEnabled.value = behavior.clickThrough;
    windowDragEnabled.value = behavior.dragEnabled;
  } catch {}
}

async function toggleClickThrough() {
  const next = !clickThroughEnabled.value;
  clickThroughEnabled.value = next;
  try {
    const behavior = await setClickThrough(next);
    if (!behavior) return;
    clickThroughEnabled.value = behavior.clickThrough;
    windowDragEnabled.value = behavior.dragEnabled;
  } catch {
    clickThroughEnabled.value = !next;
  }
}

async function toggleWindowDrag() {
  const next = !windowDragEnabled.value;
  windowDragEnabled.value = next;
  try {
    const behavior = await setDragEnabled(next);
    if (!behavior) return;
    clickThroughEnabled.value = behavior.clickThrough;
    windowDragEnabled.value = behavior.dragEnabled;
  } catch {
    windowDragEnabled.value = !next;
  }
}

onMounted(() => {
  if (!desktopAvailable) return;
  void syncWindowBehavior();
});

function toggleStageViewOverlay() {
  const rect = stageViewButtonRef.value?.getBoundingClientRect();
  if (!rect) {
    stageViewOverlayStore.toggleAt(null);
    return;
  }
  stageViewOverlayStore.toggleAt({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
}

watch(
  () => stageViewOverlayStore.open,
  (open) => {
    if (!open) return;
    const rect = stageViewButtonRef.value?.getBoundingClientRect();
    if (!rect) return;
    stageViewOverlayStore.openAt({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }
);
</script>

<template>
  <BackgroundDialogPicker v-model="backgroundDialogOpen" />
  <div class="flex items-center" :class="[layoutClass, positionClass]">
    <button
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      :class="stageDragEnabled ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
      :title="dragTitle"
      @click="stageDragEnabled = !stageDragEnabled"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.6"
        aria-hidden="true"
      >
        <path
          d="M12 18.5a3.5 3.5 0 01-3.5-3.5V6a1.5 1.5 0 013 0v6m0-6a1.5 1.5 0 013 0v8m0-8a1.5 1.5 0 013 0v8m0-7a1.5 1.5 0 013 0v6.5a6.5 6.5 0 11-13 0V8.5"
        />
      </svg>
    </button>

    <button
      ref="stageViewButtonRef"
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      :class="stageViewOverlayStore.open ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
      :title="viewControlsTitle"
      @click="toggleStageViewOverlay"
    >
      <div class="i-solar:tuning-outline h-5 w-5" />
    </button>

    <button
      v-if="desktopAvailable"
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      :class="clickThroughEnabled ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
      :title="clickThroughTitle"
      @click="toggleClickThrough"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.6"
        aria-hidden="true"
      >
        <path d="M4 4l7.5 16 2.2-6.5 6.3-2.2L4 4z" />
        <path d="M3 3l18 18" />
      </svg>
    </button>

    <button
      v-if="desktopAvailable"
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      :class="windowDragEnabled ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
      :title="windowDragTitle"
      @click="toggleWindowDrag"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.6"
        aria-hidden="true"
      >
        <path d="M12 2v20M2 12h20" />
        <path d="M12 2l3 3M12 2l-3 3M12 22l3-3M12 22l-3-3" />
        <path d="M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />
      </svg>
    </button>

    <button
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg neutral-500 dark:neutral-400"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      @click="() => toggleDark()"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="isDark" i-solar:moon-bold />
        <div v-else i-solar:sun-2-bold />
      </Transition>
    </button>
    <button
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg neutral-500 dark:neutral-400"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      :title="agentTitle"
      @click="chatEnabled = !chatEnabled"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="chatEnabled" i-simple-icons:chatbot />
        <div v-else i-simple-icons:robotframework />
      </Transition>
    </button>
    <button
      class="max-h-[10lh] min-h-[1lh]"
      bg="neutral-100 dark:neutral-800"
      text="lg neutral-500 dark:neutral-400"
      flex
      items-center
      justify-center
      rounded-md
      p-2
      outline-none
      transition-colors
      transition-transform
      active:scale-95
      :title="t('action.background')"
      @click="backgroundDialogOpen = true"
    >
      <div i-solar:gallery-wide-bold-duotone />
    </button>
  </div>
</template>
