<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useChatStore } from "@whalewhisper/app-core/stores/chat";
import { useSettingsStore } from "@whalewhisper/app-core/stores/settings";
import BasicTextarea from "../ui/BasicTextarea.vue";

const props = withDefaults(
  defineProps<{
    variant?: "desktop" | "mobile";
    submitOnEnter?: boolean;
  }>(),
  {
    variant: "desktop",
  }
);

const messageInput = ref("");
const isComposing = ref(false);

const chatStore = useChatStore();
const { t } = useI18n();
const { themeColorsHueDynamic } = storeToRefs(useSettingsStore());
const isMobile = computed(() => props.variant === "mobile");
const submitOnEnter = computed(() =>
  typeof props.submitOnEnter === "boolean"
    ? props.submitOnEnter
    : !isMobile.value
);
const showSendButton = computed(
  () => Boolean(messageInput.value.trim()) || isComposing.value
);

function handleSend() {
  if (!messageInput.value.trim() || isComposing.value) {
    return;
  }

  chatStore.send(messageInput.value);
  messageInput.value = "";
}
</script>

<template>
  <div v-if="isMobile" class="ph-no-capture flex w-full gap-1">
    <BasicTextarea
      v-model="messageInput"
      :placeholder="t('chat.input.placeholder')"
      :submit-on-enter="submitOnEnter"
      rows="1"
      border="solid 2 neutral-200/60 dark:neutral-700/60"
      text="neutral-500 hover:neutral-600 dark:neutral-100 dark:hover:neutral-200 placeholder:neutral-400 placeholder:hover:neutral-500 placeholder:dark:neutral-300 placeholder:dark:hover:neutral-400"
      bg="neutral-100/80 dark:neutral-950/80"
      max-h="[10lh]" min-h="[calc(1lh+4px+4px)]"
      w-full resize-none overflow-y-scroll rounded="[1lh]" px-4 py-0.5 outline-none backdrop-blur-md
      transition="all duration-250 ease-in-out placeholder:all placeholder:duration-250 placeholder:ease-in-out"
      :class="[themeColorsHueDynamic ? 'transition-colors-none placeholder:transition-colors-none' : '']"
      @submit="handleSend"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
    />
    <button
      v-if="showSendButton"
      w="[calc(1lh+4px+4px)]" h="[calc(1lh+4px+4px)]"
      aspect-square
      flex
      items-center
      self-end
      justify-center
      rounded-full
      outline-none
      backdrop-blur-md
      text="neutral-500 hover:neutral-600 dark:neutral-900 dark:hover:neutral-800"
      bg="primary-50/80 dark:neutral-100/80 hover:neutral-50"
      transition="all duration-250 ease-in-out"
      @click="handleSend"
    >
      <div class="i-solar:arrow-up-outline" />
    </button>
  </div>
  <div v-else flex gap-2 class="ph-no-capture lt-md:h-full">
    <div
      :class="[
        'relative',
        'w-full',
        'bg-primary-200/20 dark:bg-primary-400/20',
      ]"
    >
      <BasicTextarea
        v-model="messageInput"
        :placeholder="t('chat.input.placeholder')"
        :submit-on-enter="submitOnEnter"
        text="primary-600 dark:primary-100 placeholder:primary-500 dark:placeholder:primary-200"
        bg="transparent"
        min-h="[100px]" max-h="[300px]" w-full
        rounded-t-xl p-4 font-medium
        outline-none transition="all duration-250 ease-in-out placeholder:all placeholder:duration-250 placeholder:ease-in-out"
        @submit="handleSend"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
      />
    </div>
  </div>
</template>
