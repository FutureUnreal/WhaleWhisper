<script setup lang="ts">
import { computed } from "vue";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import Collapsable from "../misc/Collapsable.vue";

const props = defineProps<{
  id: string;
  result?: string | { type: string; text?: string }[];
}>();

const formattedResult = computed(() => {
  if (!props.result) {
    return "";
  }
  if (typeof props.result === "string") {
    return props.result;
  }
  return props.result
    .map((entry) => (entry.type === "text" ? entry.text ?? "" : JSON.stringify(entry)))
    .join("\n");
});

const { t } = useI18n();
const fallbackLabel = computed(() =>
  t("tool.result.fallback").replace("{id}", props.id)
);
</script>

<template>
  <Collapsable
    :class="[
      'bg-neutral-100/60 dark:bg-neutral-900/60 rounded-lg px-2 pb-2 pt-2',
      'flex flex-col gap-2 items-start',
    ]"
  >
    <template #trigger="{ visible, setVisible }">
      <button class="w-full text-start" @click="setVisible(!visible)">
        <div i-solar:shield-keyhole-bold-duotone class="mr-1 inline-block translate-y-1 op-50" />
        <code>{{ t("tool.result.title") }}</code>
      </button>
    </template>
    <div
      :class="[
        'rounded-md p-2 w-full',
        'bg-neutral-50/80 text-sm text-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200',
      ]"
    >
      <div class="whitespace-pre-wrap break-words font-mono">
        {{ formattedResult || fallbackLabel }}
      </div>
    </div>
  </Collapsable>
</template>
