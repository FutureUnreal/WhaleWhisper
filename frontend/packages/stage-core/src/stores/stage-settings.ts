import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export type StageModelRenderer = "live2d" | "vrm";

export const useStageSettingsStore = defineStore("stage-settings", () => {
  const stageModelRenderer = ref<StageModelRenderer>("live2d");
  const stageViewControlsEnabled = ref(false);
  const stageDragEnabled = ref(false);
  const stageActionTokensEnabled = useLocalStorage(
    "whalewhisper/stage/action-tokens-enabled",
    true
  );
  const stageActionTokensPrompt = useLocalStorage(
    "whalewhisper/stage/action-tokens-prompt",
    ""
  );

  function toggleViewControls() {
    stageViewControlsEnabled.value = !stageViewControlsEnabled.value;
  }

  return {
    stageModelRenderer,
    stageViewControlsEnabled,
    stageDragEnabled,
    stageActionTokensEnabled,
    stageActionTokensPrompt,
    toggleViewControls,
  };
});
