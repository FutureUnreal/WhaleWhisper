<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { AgentSection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useAgentStore } from "@whalewhisper/app-core/stores/agent";
import { usePluginsStore } from "@whalewhisper/app-core/stores/plugins";

const agentStore = useAgentStore();
const pluginsStore = usePluginsStore();
const { t, locale } = useI18n();
const localeValue = computed(() => locale.value || "en");

const { agentEngineId, chatEnabled, engineOptions, params, isLoading, lastError } =
  storeToRefs(agentStore);
const { plugins, isLoading: pluginsLoading, lastError: pluginsError } =
  storeToRefs(pluginsStore);

const options = computed(() =>
  engineOptions.value.map((engine) => ({
    id: engine.id,
    label: engine.label,
    description: engine.description,
  }))
);

const runtime = computed(() => agentStore.getEngineRuntime(agentEngineId.value));
const status = computed(() => agentStore.getEngineStatus(agentEngineId.value));
const paramValues = computed(() => agentStore.getEngineConfig(agentEngineId.value));
const memoryBridgeEnabled = computed(() => {
  const raw = agentStore.getEngineConfig(agentEngineId.value).memory_bridge;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") return raw.trim().toLowerCase() === "true";
  return false;
});

function setEngineId(value: string) {
  agentEngineId.value = value;
}

function toggleChat() {
  chatEnabled.value = !chatEnabled.value;
}

function toggleMemoryBridge() {
  agentStore.updateEngineConfig(agentEngineId.value, "memory_bridge", !memoryBridgeEnabled.value);
}

function updateParam(name: string, value: unknown) {
  agentStore.updateEngineConfig(agentEngineId.value, name, value);
}

function refreshHealth() {
  void agentStore.refreshHealth(agentEngineId.value);
}
</script>

<template>
  <AgentSection
    :locale="localeValue"
    :t="t"
    :agent-engine-id="agentEngineId"
    :engine-options="options"
    :status="status"
    :runtime="runtime"
    :params="params"
    :param-values="paramValues"
    :chat-enabled="chatEnabled"
    :memory-bridge-enabled="memoryBridgeEnabled"
    :is-loading="isLoading"
    :last-error="lastError"
    :plugins="plugins"
    :plugins-loading="pluginsLoading"
    :plugins-error="pluginsError"
    :on-update-engine-id="setEngineId"
    :on-toggle-chat="toggleChat"
    :on-toggle-memory-bridge="toggleMemoryBridge"
    :on-update-param="updateParam"
    :on-refresh-health="refreshHealth"
    :on-refresh-engines="agentStore.refreshEngines"
    :on-refresh-plugins="pluginsStore.refreshPlugins"
  />
</template>
