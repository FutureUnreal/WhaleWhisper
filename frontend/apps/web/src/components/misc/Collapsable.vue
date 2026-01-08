<script setup lang="ts">
import { watchEffect } from "vue";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { TransitionVertical } from "@whalewhisper/stage-settings-ui";

const props = defineProps<{
  default?: boolean;
  label?: string;
}>();

const visible = defineModel<boolean>({ default: false });
const { t } = useI18n();

watchEffect(() => {
  if (props.default != null) {
    visible.value = !!props.default;
  }
});

function setVisible(value: boolean) {
  visible.value = value;
  return value;
}
</script>

<template>
  <div>
    <slot name="trigger" v-bind="{ visible, setVisible }">
      <button
        sticky
        top-0
        z-10
        flex
        items-center
        justify-between
        px-2
        py-1
        text-sm
        backdrop-blur-xl
        @click="visible = !visible"
      >
        <span>{{ props.label ?? t("common.collapse") }}</span>
        <span op50>{{ visible ? "▲" : "▼" }}</span>
      </button>
    </slot>
    <TransitionVertical>
      <slot v-if="visible" v-bind="{ visible, setVisible }" />
    </TransitionVertical>
  </div>
</template>
