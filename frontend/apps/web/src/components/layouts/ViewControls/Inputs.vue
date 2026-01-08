<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useLive2d } from "@whalewhisper/app-core/stores/live2d";
import { useSettingsStore } from "@whalewhisper/app-core/stores/settings";
import VerticalRange from "../../ui/VerticalRange.vue";

const props = defineProps<{
  mode: "x" | "y" | "z" | "scale";
}>();

const settings = useSettingsStore();
const { stageModelRenderer, stageViewControlsEnabled } = storeToRefs(settings);
const { scale: live2dScale, position: live2dPosition } = storeToRefs(useLive2d());

const viewControlsValueX = computed({
  get: () => {
    return live2dPosition.value.x;
  },
  set: (value) => {
    live2dPosition.value.x = value;
  },
});

const viewControlsValueY = computed({
  get: () => {
    return live2dPosition.value.y;
  },
  set: (value) => {
    live2dPosition.value.y = value;
  },
});

const viewControlsValueZ = computed({
  get: () => {
    if (stageModelRenderer.value === "vrm") {
      return live2dPosition.value.z ?? 0;
    }
    return 0;
  },
  set: (value) => {
    if (stageModelRenderer.value === "vrm") {
      live2dPosition.value.z = value;
    }
  },
});

const viewControlsValueScale = computed({
  get: () => {
    return live2dScale.value;
  },
  set: (value) => {
    live2dScale.value = value;
  },
});

const viewControlsValueXMin = computed(() => -50);
const viewControlsValueXMax = computed(() => 50);
const viewControlsValueYMin = computed(() => -50);
const viewControlsValueYMax = computed(() => 50);
const viewControlsValueZMin = computed(() => -50);
const viewControlsValueZMax = computed(() => 50);
const viewControlsValueScaleMin = computed(() => 0.1);
const viewControlsValueScaleMax = computed(() => 2);

function resetOnMode() {
  switch (props.mode) {
    case "x":
      viewControlsValueX.value = 0;
      break;
    case "y":
      viewControlsValueY.value = 0;
      break;
    case "z":
      viewControlsValueZ.value = 0;
      break;
    case "scale":
      viewControlsValueScale.value = 1;
      break;
  }
}

defineExpose({
  resetOnMode,
});
</script>

<template>
  <Transition name="fade-side-pops-in">
    <div v-if="stageViewControlsEnabled">
      <Transition name="fade-side-pops-in" mode="out-in">
        <div v-if="props.mode === 'x'" relative class="[&_.range-tooltip]:hover:opacity-100">
          <VerticalRange v-model="viewControlsValueX" :min="viewControlsValueXMin" :max="viewControlsValueXMax" :step="1" />
          <div class="range-tooltip" top="50%" translate-y="[-50%]" absolute left-12 font-mono text-xs op-0 transition="all duration-200 ease-in-out">
            {{ viewControlsValueX.toFixed(0) }}
          </div>
        </div>
        <div v-else-if="props.mode === 'y'" relative class="[&_.range-tooltip]:hover:opacity-100">
          <VerticalRange v-model="viewControlsValueY" :min="viewControlsValueYMin" :max="viewControlsValueYMax" :step="1" />
          <div class="range-tooltip" top="50%" translate-y="[-50%]" absolute left-12 font-mono text-xs op-0 transition="all duration-200 ease-in-out">
            {{ viewControlsValueY.toFixed(0) }}
          </div>
        </div>
        <div v-else-if="stageModelRenderer === 'vrm' && props.mode === 'z'" relative class="[&_.range-tooltip]:hover:opacity-100">
          <VerticalRange v-model="viewControlsValueZ" :min="viewControlsValueZMin" :max="viewControlsValueZMax" :step="1" />
          <div class="range-tooltip" top="50%" translate-y="[-50%]" absolute left-12 font-mono text-xs op-0 transition="all duration-200 ease-in-out">
            {{ viewControlsValueZ.toFixed(0) }}
          </div>
        </div>
        <div v-else-if="props.mode === 'scale'" relative class="[&_.range-tooltip]:hover:opacity-100">
          <VerticalRange v-model="viewControlsValueScale" :min="viewControlsValueScaleMin" :max="viewControlsValueScaleMax" :step="0.01" />
          <div class="range-tooltip" top="50%" translate-y="[-50%]" absolute left-12 font-mono text-xs op-0 transition="all duration-200 ease-in-out">
            {{ viewControlsValueScale.toFixed(2) }}
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.fade-side-pops-in-enter-active,
.fade-side-pops-in-leave-active {
  transition: all 0.2s ease-in-out;
}

.fade-side-pops-in-enter-from,
.fade-side-pops-in-leave-to {
  opacity: 0;
  transform: translateX(-100%) scale(0.8);
}

.fade-side-pops-in-enter-to,
.fade-side-pops-in-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}
</style>
