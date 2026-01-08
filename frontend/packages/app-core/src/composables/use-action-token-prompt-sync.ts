import { computed, watch } from "vue";
import { storeToRefs } from "pinia";

import { useDisplayModelsStore } from "../stores/display-models";
import { useLive2dModelMappingsStore } from "../stores/live2d-model-mappings";
import { useLocaleStore } from "../stores/locale";
import { useSettingsStore } from "../stores/settings";
import { useStageModelCapabilitiesStore } from "../stores/stage-model-capabilities";
import { buildActionTokenPrompt } from "../utils/action-token-prompt";
import { resolveModelMappingKey } from "../utils/model-mapping-key";

export function useActionTokenPromptSync() {
  const settingsStore = useSettingsStore();
  const displayModelsStore = useDisplayModelsStore();
  const stageModelCapabilities = useStageModelCapabilitiesStore();
  const live2dModelMappings = useLive2dModelMappingsStore();
  const localeStore = useLocaleStore();
  const { activeModel } = storeToRefs(displayModelsStore);
  const { locale } = storeToRefs(localeStore);

  const modelMappingKey = computed(() => resolveModelMappingKey(activeModel.value));

  const live2dCaps = computed(() => {
    const model = activeModel.value;
    if (!model?.id || model.format !== "live2d") return undefined;
    return stageModelCapabilities.getLive2dCapabilities(model.id);
  });

  watch(
    [modelMappingKey, live2dCaps],
    ([key, caps]) => {
      live2dModelMappings.ensureTemplate(key, caps);
    },
    { immediate: true }
  );

  const actionPromptContext = computed(() => {
    const model = activeModel.value;
    if (!model?.id) return undefined;
    if (model.format === "live2d") {
      const caps = stageModelCapabilities.getLive2dCapabilities(model.id);
      const mapping = live2dModelMappings.getMapping(modelMappingKey.value);
      return {
        format: "live2d",
        motions: caps?.motions ?? mapping?.motions,
        expressions: caps?.expressions ?? mapping?.expressions,
        emotes: mapping?.emotes,
      };
    }
    if (model.format === "vrm") {
      const caps = stageModelCapabilities.getVrmCapabilities(model.id);
      return { format: "vrm", expressions: caps?.expressions };
    }
    return undefined;
  });

  const nextPrompt = computed(() =>
    buildActionTokenPrompt(locale.value || "en", actionPromptContext.value)
  );

  watch(
    nextPrompt,
    (prompt) => {
      if (prompt && prompt !== settingsStore.stageActionTokensPrompt) {
        settingsStore.stageActionTokensPrompt = prompt;
      }
    },
    { immediate: true }
  );
}
