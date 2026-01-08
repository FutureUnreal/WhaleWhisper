import { defineStore } from "pinia";
import { ref } from "vue";

export type StageViewOverlayAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const useStageViewOverlayStore = defineStore("stage-view-overlay", () => {
  const open = ref(false);
  const anchorRect = ref<StageViewOverlayAnchor | null>(null);

  function openAt(anchor: StageViewOverlayAnchor | null) {
    anchorRect.value = anchor;
    open.value = true;
  }

  function toggleAt(anchor: StageViewOverlayAnchor | null) {
    if (open.value) {
      open.value = false;
      return;
    }
    openAt(anchor);
  }

  function close() {
    open.value = false;
  }

  return {
    open,
    anchorRect,
    openAt,
    toggleAt,
    close,
  };
});
