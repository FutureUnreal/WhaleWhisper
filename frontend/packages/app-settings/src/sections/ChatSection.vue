<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { ChatSection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useAgentStore } from "@whalewhisper/app-core/stores/agent";
import { useChatStore } from "@whalewhisper/app-core/stores/chat";

const chatStore = useChatStore();
const { chatEnabled } = storeToRefs(useAgentStore());
const { status } = storeToRefs(chatStore);
const { t, locale } = useI18n();
const localeValue = computed(() => locale.value || "en");
</script>

<template>
  <ChatSection
    :locale="localeValue"
    :t="t"
    :chat-enabled="chatEnabled"
    :status="status"
    :on-clear="() => chatStore.cleanupMessages()"
  />
</template>
