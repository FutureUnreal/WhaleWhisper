import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { AgentEngine, AgentHealthResponse, AgentParam } from "../services/agent";
import {
  checkAgentHealth,
  getDefaultAgentEngine,
  listAgentEngines,
  listAgentParams,
} from "../services/agent";
import { useI18n } from "../composables/use-i18n";
import { formatHealthError, formatHealthMessage } from "../utils/health";

export type AgentConfig = Record<string, unknown>;
export type AgentStatus = "online" | "offline" | "unknown";

export type AgentRuntime = {
  status: AgentStatus;
  isChecking: boolean;
  lastError?: string;
  lastHealth?: AgentHealthResponse;
};

export const useAgentStore = defineStore("agent", () => {
  const agentEngineId = useLocalStorage("whalewhisper/agent/engine", "default");
  const chatEnabled = useLocalStorage("whalewhisper/agent/chat-enabled", false);
  const engineConfigs = useLocalStorage<Record<string, AgentConfig>>(
    "whalewhisper/agent/configs",
    {}
  );
  const engines = ref<AgentEngine[]>([]);
  const params = ref<AgentParam[]>([]);
  const isLoading = ref(false);
  const lastError = ref<string | null>(null);
  const runtime = ref<Record<string, AgentRuntime>>({});
  const { t } = useI18n();

  const engineOptions = computed(() => engines.value);

  function ensureRuntime(engineId: string) {
    if (!engineId) return;
    if (!runtime.value[engineId]) {
      runtime.value = {
        ...runtime.value,
        [engineId]: {
          status: "unknown",
          isChecking: false,
          lastError: undefined,
          lastHealth: undefined,
        },
      };
    }
  }

  function getEngineRuntime(engineId: string) {
    ensureRuntime(engineId);
    return runtime.value[engineId];
  }

  function getEngineStatus(engineId: string): AgentStatus {
    return getEngineRuntime(engineId)?.status ?? "unknown";
  }

  function getEngineConfig(engineId: string) {
    if (!engineId) return {};
    if (!engineConfigs.value[engineId]) {
      engineConfigs.value = {
        ...engineConfigs.value,
        [engineId]: {},
      };
    }
    return engineConfigs.value[engineId] ?? {};
  }

  function updateEngineConfig(engineId: string, key: string, value: unknown) {
    if (!engineId) return;
    const current = getEngineConfig(engineId);
    engineConfigs.value = {
      ...engineConfigs.value,
      [engineId]: {
        ...current,
        [key]: value,
      },
    };
  }

  function ensureParamDefaults(engineId: string, paramList: AgentParam[]) {
    if (!engineId) return;
    const current = getEngineConfig(engineId);
    const next = { ...current };
    paramList.forEach((param) => {
      if (param.default === undefined || param.default === null) return;
      if (next[param.name] !== undefined && String(next[param.name]).trim() !== "") return;
      next[param.name] = String(param.default);
    });
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      engineConfigs.value = {
        ...engineConfigs.value,
        [engineId]: next,
      };
    }
  }

  async function refreshEngines() {
    isLoading.value = true;
    lastError.value = null;
    try {
      const list = await listAgentEngines();
      engines.value = list;
      list.forEach((engine) => ensureRuntime(engine.id));
      let activeId = agentEngineId.value;
      if (!activeId || activeId === "default" || !list.find((engine) => engine.id === activeId)) {
        const fallback = await getDefaultAgentEngine();
        activeId = fallback?.id || list[0]?.id || "";
        if (activeId && activeId !== agentEngineId.value) {
          agentEngineId.value = activeId;
        }
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : "Failed to load agents.";
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshParams(engineId: string) {
    if (!engineId || engineId === "default") {
      params.value = [];
      return;
    }
    isLoading.value = true;
    lastError.value = null;
    try {
      const list = await listAgentParams(engineId);
      params.value = list;
      ensureParamDefaults(engineId, list);
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : "Failed to load agent params.";
      params.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshHealth(engineId: string) {
    if (!engineId || engineId === "default") return false;
    const state = getEngineRuntime(engineId);
    if (!state) return false;
    state.isChecking = true;
    state.lastError = undefined;
    try {
      const health = await checkAgentHealth(engineId, sanitizeConfig(getEngineConfig(engineId)));
      state.lastHealth = health;
      state.status = health.ok ? "online" : "offline";
      if (!health.ok) {
        state.lastError = formatHealthMessage(health, t) || t("health.failed", "Health check failed.");
      }
      return health.ok;
    } catch (error) {
      state.status = "offline";
      state.lastError = formatHealthError(error, t);
      return false;
    } finally {
      state.isChecking = false;
    }
  }

  function sanitizeConfig(config: Record<string, unknown>) {
    return Object.entries(config ?? {}).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      if (typeof value === "string" && value.trim() === "") return acc;
      acc[key] = value;
      return acc;
    }, {});
  }

  watch(
    () => agentEngineId.value,
    (next) => {
      void refreshParams(next);
      void refreshHealth(next);
    },
    { immediate: true }
  );

  return {
    agentEngineId,
    chatEnabled,
    engineOptions,
    engines,
    params,
    isLoading,
    lastError,
    runtime,
    getEngineConfig,
    updateEngineConfig,
    getEngineRuntime,
    getEngineStatus,
    refreshEngines,
    refreshParams,
    refreshHealth,
  };
});
