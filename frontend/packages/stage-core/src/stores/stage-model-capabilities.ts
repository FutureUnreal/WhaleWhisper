import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export type Live2dModelCapabilities = {
  motions: string[];
  expressions: string[];
  updatedAt: number;
};

export type VrmModelCapabilities = {
  expressions: string[];
  updatedAt: number;
};

export const useStageModelCapabilitiesStore = defineStore(
  "stage-model-capabilities",
  () => {
    const live2d = useLocalStorage<Record<string, Live2dModelCapabilities>>(
      "whalewhisper/stage/model-capabilities/live2d",
      {}
    );
    const vrm = useLocalStorage<Record<string, VrmModelCapabilities>>(
      "whalewhisper/stage/model-capabilities/vrm",
      {}
    );

    function setLive2dCapabilities(modelId: string, data: Omit<Live2dModelCapabilities, "updatedAt">) {
      if (!modelId) return;
      live2d.value = {
        ...live2d.value,
        [modelId]: { ...data, updatedAt: Date.now() },
      };
    }

    function setVrmCapabilities(modelId: string, data: Omit<VrmModelCapabilities, "updatedAt">) {
      if (!modelId) return;
      vrm.value = {
        ...vrm.value,
        [modelId]: { ...data, updatedAt: Date.now() },
      };
    }

    function getLive2dCapabilities(modelId?: string) {
      if (!modelId) return undefined;
      return live2d.value[modelId];
    }

    function getVrmCapabilities(modelId?: string) {
      if (!modelId) return undefined;
      return vrm.value[modelId];
    }

    function clearCapabilities(modelId: string) {
      if (!modelId) return;
      if (live2d.value[modelId]) {
        const { [modelId]: _removed, ...rest } = live2d.value;
        live2d.value = rest;
      }
      if (vrm.value[modelId]) {
        const { [modelId]: _removed, ...rest } = vrm.value;
        vrm.value = rest;
      }
    }

    return {
      setLive2dCapabilities,
      setVrmCapabilities,
      getLive2dCapabilities,
      getVrmCapabilities,
      clearCapabilities,
    };
  }
);
