import type { Live2DModel } from "pixi-live2d-display/cubism4";

import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";

import { getLive2dConfig } from "../config";
import { useDisplayModelsStore } from "./display-models";
import { useLive2dModelMappingsStore } from "./live2d-model-mappings";
import { useStageModelCapabilitiesStore } from "./stage-model-capabilities";
import {
  type Live2DSpecialTokenAction,
  normalizeSpecialToken,
  resolveLive2dSpecialAction,
} from "../utils/live2d-special-tokens";
import { buildAutoEmoteMappings, buildEmoteAliases } from "../utils/live2d-token-catalog";
import { resolveModelMappingKey } from "../utils/model-mapping-key";

export const useLive2dRuntime = defineStore("live2d-runtime", () => {
  const model = ref<Live2DModel | null>(null);
  const lastSpecialTokenAt = ref(0);
  const lastSpecialToken = ref<string | null>(null);
  const lastSpecialAction = ref<string | null>(null);
  const lastActionTokenAt = ref(0);
  const expressionResetTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const pendingExpressionReset = ref(false);
  const displayModelsStore = useDisplayModelsStore();
  const { activeModel } = storeToRefs(displayModelsStore);
  const live2dModelMappings = useLive2dModelMappingsStore();
  const stageModelCapabilities = useStageModelCapabilitiesStore();

  const activeCapabilities = computed(() => {
    if (activeModel.value?.format !== "live2d") return undefined;
    return stageModelCapabilities.getLive2dCapabilities(activeModel.value.id);
  });

  function resolveTokenConfig() {
    const baseConfig = getLive2dConfig().specialTokens;
    const modelKey = resolveModelMappingKey(activeModel.value);
    const modelMapping = live2dModelMappings.getMapping(modelKey);
    const autoEmotes = buildAutoEmoteMappings(
      activeCapabilities.value?.motions ?? [],
      activeCapabilities.value?.expressions ?? []
    );
    const resolvedEmotes = {
      ...autoEmotes,
      ...(modelMapping?.emotes ?? {}),
    };
    const dynamicAliases = buildEmoteAliases(resolvedEmotes);
    return {
      ...baseConfig,
      aliases: {
        ...baseConfig.aliases,
        ...dynamicAliases,
      },
    };
  }

  function registerModel(next: Live2DModel | null) {
    model.value = next;
    clearExpressionReset();
  }

  function clearModel() {
    model.value = null;
    clearExpressionReset();
  }

  async function playMotion(group: string, index?: number, priority?: number) {
    if (!model.value) {
      return false;
    }
    const result = await model.value.motion(group, index, priority);
    return result;
  }

  async function setExpression(id?: string | number) {
    if (!model.value) {
      return false;
    }
    const result = await model.value.expression(id);
    if (result || isActiveExpression(id)) {
      pendingExpressionReset.value = true;
      scheduleExpressionReset();
    }
    return result;
  }

  function isActiveExpression(id?: string | number) {
    if (!model.value) {
      return false;
    }
    if (id === undefined || id === null) {
      return false;
    }
    const internalModel = (model.value as any)?.internalModel;
    const expressionManager =
      internalModel?.motionManager?.expressionManager ??
      internalModel?.expressionManager;
    if (!expressionManager?.expressions) {
      return false;
    }
    const targetIndex =
      typeof id === "number"
        ? id
        : expressionManager.getExpressionIndex?.(id);
    if (typeof targetIndex !== "number" || targetIndex < 0) {
      return false;
    }
    const currentIndex = expressionManager.expressions.indexOf(
      expressionManager.currentExpression
    );
    if (typeof currentIndex !== "number" || currentIndex < 0) {
      return false;
    }
    return currentIndex === targetIndex;
  }

  async function resetExpression() {
    if (!model.value) {
      return false;
    }
    const internalModel = (model.value as any)?.internalModel;
    const expressionManager =
      internalModel?.motionManager?.expressionManager ??
      internalModel?.expressionManager;
    if (!expressionManager?.resetExpression) {
      return false;
    }
    expressionManager.resetExpression();
    if (expressionManager.defaultExpression) {
      expressionManager.currentExpression = expressionManager.defaultExpression;
    }
    return true;
  }

  function clearExpressionReset() {
    pendingExpressionReset.value = false;
    if (expressionResetTimer.value) {
      clearTimeout(expressionResetTimer.value);
      expressionResetTimer.value = null;
    }
  }

  function scheduleExpressionReset() {
    const ms = getLive2dConfig().expressionAutoResetMs;
    if (!Number.isFinite(ms) || ms <= 0) {
      return;
    }
    if (expressionResetTimer.value) {
      clearTimeout(expressionResetTimer.value);
    }
    expressionResetTimer.value = setTimeout(() => {
      void resetExpression();
      pendingExpressionReset.value = false;
      expressionResetTimer.value = null;
    }, ms);
  }

  async function applySpecialToken(token: string) {
    const config = resolveTokenConfig();
    if (!config.enabled) {
      return false;
    }
    const action = resolveLive2dSpecialAction(token, config);
    if (!action) {
      return false;
    }

    lastSpecialToken.value = normalizeSpecialToken(token);
    lastSpecialAction.value = describeAction(action);

    if (action.type === "delay") {
      lastSpecialTokenAt.value = Date.now();
      if (pendingExpressionReset.value) {
        clearExpressionReset();
        await new Promise((resolve) => setTimeout(resolve, action.ms));
        await resetExpression();
        pendingExpressionReset.value = false;
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, action.ms));
      return true;
    }

    const now = Date.now();
    if (config.cooldownMs > 0 && now - lastActionTokenAt.value < config.cooldownMs) {
      return false;
    }
    lastActionTokenAt.value = now;

    if (action.type === "motion") {
      lastSpecialTokenAt.value = now;
      return playMotion(action.group, action.index, action.priority);
    }

    if (action.type === "expression") {
      lastSpecialTokenAt.value = now;
      return setExpression(action.id);
    }

    return false;
  }

  function describeAction(action: Live2DSpecialTokenAction) {
    if (action.type === "motion") {
      return `motion:${action.group}`;
    }
    if (action.type === "expression") {
      return action.id !== undefined ? `expression:${action.id}` : "expression";
    }
    if (action.type === "delay") {
      return `delay:${action.ms}ms`;
    }
    return action.type;
  }

  return {
    model,
    registerModel,
    clearModel,
    playMotion,
    setExpression,
    applySpecialToken,
    lastSpecialTokenAt,
    lastSpecialToken,
    lastSpecialAction,
  };
});
