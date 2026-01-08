import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";

import baseMappings from "../live2d-model-mappings.json";
import type { Live2dModelCapabilities } from "./stage-model-capabilities";

export type Live2dModelMapping = {
  emotes?: Record<string, string>;
  motions?: string[];
  expressions?: string[];
  updatedAt?: number;
};

type Live2dModelMappingsConfig = {
  models?: Record<string, Live2dModelMapping>;
};

const initialMappings =
  (baseMappings as Live2dModelMappingsConfig).models ?? {};

export const useLive2dModelMappingsStore = defineStore(
  "live2d-model-mappings",
  () => {
    const mappings = useLocalStorage<Record<string, Live2dModelMapping>>(
      "whalewhisper/stage/live2d-mappings",
      initialMappings
    );

    function getMapping(modelKey?: string) {
      if (!modelKey) return undefined;
      return mappings.value[modelKey];
    }

    function setMapping(modelKey: string, next: Live2dModelMapping) {
      if (!modelKey) return;
      mappings.value = {
        ...mappings.value,
        [modelKey]: { ...next, updatedAt: Date.now() },
      };
    }

    function ensureTemplate(
      modelKey: string | undefined,
      caps?: Live2dModelCapabilities
    ) {
      if (!modelKey || !caps) return;
      const existing = mappings.value[modelKey];
      const next = {
        emotes: existing?.emotes ?? {},
        motions: normalizeList(caps.motions ?? []),
        expressions: normalizeList(caps.expressions ?? []),
        updatedAt: existing?.updatedAt ?? Date.now(),
      };
      if (
        existing &&
        arraysEqual(existing.motions, next.motions) &&
        arraysEqual(existing.expressions, next.expressions)
      ) {
        return;
      }
      setMapping(modelKey, next);
    }

    return {
      mappings,
      getMapping,
      setMapping,
      ensureTemplate,
    };
  }
);

function normalizeList(list: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const trimmed = String(item ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function arraysEqual(a?: string[], b?: string[]) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
