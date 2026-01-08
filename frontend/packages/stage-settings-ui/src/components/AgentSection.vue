<script setup lang="ts">
import { computed, onMounted } from "vue";

import SelectMenu from "./ui/SelectMenu.vue";

type EngineOption = {
  id: string;
  label: string;
  description?: string;
};

type EngineRuntime = {
  isChecking?: boolean;
  lastError?: string;
};

type EngineParam = {
  name: string;
  description?: string;
  required?: boolean;
  type?: string;
};

type PluginInfo = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  providers?: string[];
};

type ProviderStatus = "online" | "offline" | "unknown";

const props = withDefaults(
  defineProps<{
    locale?: string;
    t?: (key: string) => string;
    agentEngineId?: string;
    engineOptions?: EngineOption[];
    status?: ProviderStatus;
    runtime?: EngineRuntime;
    params?: EngineParam[];
    paramValues?: Record<string, unknown>;
    chatEnabled?: boolean;
    memoryBridgeEnabled?: boolean;
    isLoading?: boolean;
    lastError?: string | null;
    plugins?: PluginInfo[];
    pluginsLoading?: boolean;
    pluginsError?: string | null;
    onUpdateEngineId?: (value: string) => void;
    onToggleChat?: () => void;
    onToggleMemoryBridge?: () => void;
    onUpdateParam?: (name: string, value: unknown) => void;
    onRefreshHealth?: () => void;
    onRefreshEngines?: () => void;
    onRefreshPlugins?: () => void;
  }>(),
  {
    engineOptions: () => [],
    params: () => [],
    plugins: () => [],
    status: "unknown",
  }
);

const resolvedLocale = computed(() => {
  if (props.locale) return props.locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
});
const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith("zh"));

const fallbackEn = {
  "agent.title": "Agent",
  "agent.desc": "Configure external agent platforms (Dify / Coze / FastGPT).",
  "agent.chat.title": "Agent chat",
  "agent.chat.desc": "When enabled, chat requests are sent through the agent engine.",
  "agent.memory_bridge.title": "Memory bridge",
  "agent.memory_bridge.desc": "Inject local memory summaries into agent requests (off by default).",
  "agent.engine.placeholder": "Choose agent engine",
  "agent.params.title": "Parameters",
  "agent.params.desc": "Provide the parameters required by the agent.",
  "agent.params.empty": "No parameters required for this agent.",
  "agent.plugins.title": "Extensions",
  "agent.plugins.desc": "Browse available plugins and connectors for agent integrations.",
  "agent.plugins.empty": "No extensions available yet.",
  "common.enabled": "Enabled",
  "common.disabled": "Disabled",
  "common.status": "Status",
  "common.check": "Check",
  "common.checking": "Checking",
  "common.online": "Online",
  "common.offline": "Offline",
  "common.unknown": "Unknown",
};

const fallbackZh = {
  "agent.title": "智能体",
  "agent.desc": "配置外部智能体平台（Dify / Coze / FastGPT 等）。",
  "agent.chat.title": "聊天接入智能体",
  "agent.chat.desc": "启用后，聊天将通过智能体引擎执行。",
  "agent.memory_bridge.title": "记忆桥接",
  "agent.memory_bridge.desc": "将本地记忆摘要注入智能体请求（默认关闭）。",
  "agent.engine.placeholder": "选择智能体引擎",
  "agent.params.title": "参数",
  "agent.params.desc": "填写智能体平台所需参数。",
  "agent.params.empty": "该智能体无需额外参数。",
  "agent.plugins.title": "扩展目录",
  "agent.plugins.desc": "查看可用的插件/连接器，用于扩展智能体能力。",
  "agent.plugins.empty": "暂无可用扩展。",
  "common.enabled": "启用",
  "common.disabled": "禁用",
  "common.status": "状态",
  "common.check": "检查",
  "common.checking": "检查中",
  "common.online": "在线",
  "common.offline": "离线",
  "common.unknown": "未知",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  if (props.t) {
    const resolved = props.t(key);
    if (resolved && resolved !== key) return resolved;
  }
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};

const engineId = computed({
  get: () => props.agentEngineId ?? "",
  set: (value: string) => props.onUpdateEngineId?.(value),
});

const statusText = computed(() => {
  if (props.runtime?.isChecking) {
    return t("common.checking");
  }
  if (props.status === "online") {
    return t("common.online");
  }
  if (props.status === "offline") {
    return t("common.offline");
  }
  return t("common.unknown");
});

function getParamValue(name: string) {
  return props.paramValues?.[name] ?? "";
}

function setParamValue(name: string, value: unknown) {
  props.onUpdateParam?.(name, value);
}

function getInputType(type?: string) {
  return type === "secret" ? "password" : "text";
}

onMounted(() => {
  void props.onRefreshEngines?.();
  void props.onRefreshPlugins?.();
});
</script>

<template>
  <div class="grid gap-4">
    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("agent.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("agent.desc") }}
      </div>
      <div class="mt-4 flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
        <div>
          <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {{ t("agent.chat.title") }}
          </div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t("agent.chat.desc") }}
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
          :disabled="!props.onToggleChat"
          @click="props.onToggleChat?.()"
        >
          {{ props.chatEnabled ? t("common.enabled") : t("common.disabled") }}
        </button>
      </div>
      <div class="mt-3 flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
        <div>
          <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {{ t("agent.memory_bridge.title") }}
          </div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t("agent.memory_bridge.desc") }}
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
          :disabled="!props.onToggleMemoryBridge"
          @click="props.onToggleMemoryBridge?.()"
        >
          {{ props.memoryBridgeEnabled ? t("common.enabled") : t("common.disabled") }}
        </button>
      </div>
      <div class="mt-4 flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-400">
        <div class="flex items-center gap-2">
          <span>{{ t("common.status") }}</span>
          <span class="font-medium text-neutral-700 dark:text-neutral-200">
            {{ statusText }}
          </span>
        </div>
        <button
          type="button"
          class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
          :disabled="props.runtime?.isChecking || !props.onRefreshHealth"
          @click="props.onRefreshHealth?.()"
        >
          {{ t("common.check") }}
        </button>
      </div>
      <div class="mt-4">
        <SelectMenu
          v-model="engineId"
          :options="props.engineOptions"
          :status="props.status"
          :placeholder="t('agent.engine.placeholder')"
        />
      </div>
      <div v-if="props.runtime?.lastError" class="mt-3 rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-500 dark:border-rose-500/30 dark:bg-rose-950/40">
        {{ props.runtime.lastError }}
      </div>
      <div v-if="props.lastError" class="mt-3 rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-500 dark:border-rose-500/30 dark:bg-rose-950/40">
        {{ props.lastError }}
      </div>
      <div v-if="props.isLoading" class="mt-3 text-xs text-neutral-400">
        {{ t("common.checking") }}
      </div>
    </div>

    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("agent.params.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("agent.params.desc") }}
      </div>
      <div v-if="!props.params.length" class="mt-4 rounded-lg border border-dashed border-neutral-200/70 bg-white/60 px-3 py-2 text-xs text-neutral-400 dark:border-neutral-800/70 dark:bg-neutral-900/40 dark:text-neutral-500">
        {{ t("agent.params.empty") }}
      </div>
      <div v-else class="mt-4 grid gap-3">
        <div v-for="param in props.params" :key="param.name" class="grid gap-1">
          <label class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ param.name }}
            <span v-if="param.required" class="text-rose-500"> *</span>
          </label>
          <input
            :value="String(getParamValue(param.name) ?? '')"
            :type="getInputType(param.type)"
            :placeholder="param.description || param.name"
            class="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :disabled="!props.onUpdateParam"
            @input="setParamValue(param.name, ($event.target as HTMLInputElement).value)"
          />
          <div v-if="param.description" class="text-xs text-neutral-400 dark:text-neutral-500">
            {{ param.description }}
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("agent.plugins.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("agent.plugins.desc") }}
      </div>
      <div
        v-if="props.pluginsError"
        class="mt-4 rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-500 dark:border-rose-500/30 dark:bg-rose-950/40"
      >
        {{ props.pluginsError }}
      </div>
      <div v-else-if="props.pluginsLoading" class="mt-4 text-xs text-neutral-400">
        {{ t("common.checking") }}
      </div>
      <div
        v-else-if="!props.plugins.length"
        class="mt-4 rounded-lg border border-dashed border-neutral-200/70 bg-white/60 px-3 py-2 text-xs text-neutral-400 dark:border-neutral-800/70 dark:bg-neutral-900/40 dark:text-neutral-500"
      >
        {{ t("agent.plugins.empty") }}
      </div>
      <div v-else class="mt-4 grid gap-2">
        <div
          v-for="plugin in props.plugins"
          :key="plugin.id"
          class="rounded-xl border border-neutral-200/70 bg-white/70 px-3 py-2 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-900/60"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {{ plugin.name }}
            </div>
            <div v-if="plugin.version" class="text-xs text-neutral-400">
              v{{ plugin.version }}
            </div>
          </div>
          <div v-if="plugin.description" class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ plugin.description }}
          </div>
          <div v-if="plugin.providers?.length" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="provider in plugin.providers"
              :key="provider"
              class="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {{ provider }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
