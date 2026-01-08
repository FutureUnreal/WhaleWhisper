<script setup lang="ts">
import type { ChatAssistantMessage, ChatHistoryItem } from "../../types/chat";

import { computed, onMounted, ref, watch } from "vue";

import ChatAssistantItem from "./ChatAssistantItem.vue";
import ChatErrorItem from "./ChatErrorItem.vue";
import ChatUserItem from "./ChatUserItem.vue";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";

const props = withDefaults(
  defineProps<{
    messages: ChatHistoryItem[];
    streamingMessage?: ChatAssistantMessage | null;
    sending?: boolean;
    assistantLabel?: string;
    userLabel?: string;
    errorLabel?: string;
    variant?: "desktop" | "mobile";
  }>(),
  {
    sending: false,
    variant: "desktop",
  }
);

const chatHistoryRef = ref<HTMLDivElement>();
const { t } = useI18n();

const labels = computed(() => ({
  assistant: props.assistantLabel ?? t("chat.label.assistant"),
  user: props.userLabel ?? t("chat.label.user"),
  error: props.errorLabel ?? t("chat.label.system"),
}));

function scrollToBottom() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!chatHistoryRef.value) return;
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
    });
  });
}

watch([() => props.messages, () => props.streamingMessage], scrollToBottom, {
  deep: true,
  flush: "post",
});
watch(() => props.sending, scrollToBottom, { flush: "post" });
onMounted(scrollToBottom);

const streaming = computed<ChatAssistantMessage>(() => {
  return (
    props.streamingMessage ?? {
      id: "streaming",
      role: "assistant",
      content: "",
      slices: [],
      tool_results: [],
      createdAt: Date.now(),
    }
  );
});

const showStreamingPlaceholder = computed(
  () => (streaming.value.slices?.length ?? 0) === 0 && !streaming.value.content
);
const streamingTs = computed(() => streaming.value?.createdAt);
const renderMessages = computed<ChatHistoryItem[]>(() => {
  if (!props.sending) {
    return props.messages;
  }

  const streamTs = streamingTs.value;
  if (!streamTs) {
    return props.messages;
  }

  const hasStreamAlready = streamTs
    ? props.messages.some((msg) => msg?.createdAt === streamTs)
    : false;
  if (hasStreamAlready) {
    return props.messages;
  }

  return [...props.messages, streaming.value];
});
</script>

<template>
  <div
    ref="chatHistoryRef"
    v-auto-animate
    flex="~ col"
    relative
    h-full
    w-full
    overflow-y-auto
    rounded-xl
    class="lt-sm:px-2 lt-sm:py-2"
    :class="variant === 'mobile' ? 'gap-1' : 'gap-2'"
  >
    <template v-for="(message, index) in renderMessages" :key="message?.createdAt ?? index">
      <div v-if="message.role === 'error'">
        <ChatErrorItem
          :message="message"
          :label="labels.error"
          :show-placeholder="sending && index === renderMessages.length - 1"
          :variant="variant"
        />
      </div>

      <div v-else-if="message.role === 'assistant'">
        <ChatAssistantItem
          :message="message"
          :label="labels.assistant"
          :show-placeholder="(message.context?.createdAt ?? message.createdAt) === streamingTs ? showStreamingPlaceholder : false"
          :variant="variant"
        />
      </div>

      <div v-else-if="message.role === 'user'">
        <ChatUserItem
          :message="message"
          :label="labels.user"
          :variant="variant"
        />
      </div>
    </template>
  </div>
</template>
