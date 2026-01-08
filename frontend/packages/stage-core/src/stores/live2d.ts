import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const defaultScale = 0.4;

export const useLive2d = defineStore("live2d", () => {
  const scale = useLocalStorage("whalewhisper/stage/scale", defaultScale);
  if (scale.value === 0.85 || scale.value === 1) {
    scale.value = defaultScale;
  }
  const position = useLocalStorage("whalewhisper/stage/position", {
    x: 0,
    y: 0,
    z: 0,
  });
  if (position.value.x === 50 && position.value.y === 100) {
    position.value = { x: 0, y: 0, z: 0 };
  }
  if (typeof position.value.z !== "number") {
    position.value = { ...position.value, z: 0 };
  }

  const positionInPercentageString = computed(() => ({
    x: `${position.value.x}%`,
    y: `${position.value.y}%`,
  }));

  const modelBounds = ref<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const modelRect = ref<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });

  function setScale(next: number) {
    scale.value = next;
  }

  function setPosition(next: Partial<{ x: number; y: number; z: number }>) {
    position.value = {
      ...position.value,
      ...next,
    };
  }

  function resetView() {
    scale.value = defaultScale;
    position.value = { x: 0, y: 0, z: 0 };
  }

  function setModelBounds(bounds: { width: number; height: number }) {
    modelBounds.value = {
      width: Math.max(0, bounds.width),
      height: Math.max(0, bounds.height),
    };
  }

  function setModelRect(rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }) {
    modelRect.value = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  }

  return {
    scale,
    position,
    positionInPercentageString,
    modelBounds,
    modelRect,
    setScale,
    setPosition,
    resetView,
    setModelBounds,
    setModelRect,
  };
});
