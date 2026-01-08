<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  locale?: string;
  chatEnabled?: boolean;
  status?: string;
  onClear?: () => void;
  t?: (key: string) => string;
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
  "chat.title": "Chat",
  "chat.connection.title": "Connection",
  "chat.connection.desc": "WebSocket status.",
  "chat.connection.desc.agent": "Chat runs via the agent SSE API.",
  "chat.history.title": "History",
  "chat.history.desc": "Clear the current conversation.",
  "chat.clear": "Clear",
  "chat.status.connected": "Connected",
  "chat.status.connecting": "Connecting",
  "chat.status.error": "Error",
  "chat.status.disconnected": "Disconnected",
  "chat.status.agent": "Agent",
};

const fallbackZh = {
  "chat.title": "聊天",
  "chat.connection.title": "连接",
  "chat.connection.desc": "WebSocket 状态。",
  "chat.connection.desc.agent": "聊天通过智能体 API（SSE）。",
  "chat.history.title": "历史记录",
  "chat.history.desc": "清空当前会话消息。",
  "chat.clear": "清空",
  "chat.status.connected": "已连接",
  "chat.status.connecting": "连接中",
  "chat.status.error": "错误",
  "chat.status.disconnected": "未连接",
  "chat.status.agent": "智能体",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  if (props.t) {
    const resolved = props.t(key);
    if (resolved && resolved !== key) return resolved;
  }
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};

const statusLabel = computed(() => {
  if (props.chatEnabled) return t("chat.status.agent");
  if (props.status === "connected") return t("chat.status.connected");
  if (props.status === "connecting") return t("chat.status.connecting");
  if (props.status === "error") return t("chat.status.error");
  return t("chat.status.disconnected");
});

const connectionDesc = computed(() =>
  props.chatEnabled ? t("chat.connection.desc.agent") : t("chat.connection.desc")
);

const canClear = computed(() => typeof props.onClear === "function");

function handleClear() {
  if (!props.onClear) return;
  props.onClear();
}
</script>

<template>
  <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
    <div class="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
      {{ t("chat.title") }}
    </div>
    <div class="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
      <div>
        <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {{ t("chat.connection.title") }}
        </div>
        <div class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ connectionDesc }}
        </div>
      </div>
      <span class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
        {{ statusLabel }}
      </span>
    </div>
    <div class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
      <div>
        <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {{ t("chat.history.title") }}
        </div>
        <div class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("chat.history.desc") }}
        </div>
      </div>
      <button
        class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-sm text-neutral-600 transition hover:text-red-500 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
        :class="!canClear ? 'cursor-not-allowed opacity-60 hover:text-neutral-600' : ''"
        type="button"
        :disabled="!canClear"
        @click="handleClear"
      >
        {{ t("chat.clear") }}
      </button>
    </div>
  </div>
</template>
