<script setup lang="ts">
import { computed, ref, watch } from "vue";

type WaveDirection = "up" | "down";
type MovementDirection = "left" | "right";

interface WaveProps {
  height?: number;
  amplitude?: number;
  waveLength?: number;
  fillColor?: string;
  direction?: WaveDirection;
  movementDirection?: MovementDirection;
  animationSpeed?: number;
}

const props = withDefaults(defineProps<WaveProps>(), {
  height: 60,
  amplitude: 22,
  waveLength: 350,
  fillColor: "rgba(200, 235, 255, 0.85)",
  direction: "down",
  movementDirection: "left",
  animationSpeed: 70,
});

const waveHeight = ref(props.height);
const waveAmplitude = ref(props.amplitude);
const waveLength = ref(props.waveLength);
const waveFillColor = ref(props.fillColor);
const direction = ref<WaveDirection>(props.direction);
const movementDirection = ref<MovementDirection>(props.movementDirection);

// Generate a more complex wave path with multiple harmonics
function generateComplexWavePath(
  width: number,
  height: number,
  amplitude: number,
  waveLength: number,
  direction: WaveDirection
): string {
  const points: string[] = [];
  const numberOfWaves = Math.ceil(width / waveLength);
  const totalWavesWidth = numberOfWaves * waveLength;
  const step = 2;
  const baseY = direction === "up" ? amplitude * 1.5 : height - amplitude * 1.5;

  points.push(`M 0 ${baseY}`);

  const factor = (Math.PI * 2) / waveLength;
  for (let x = 0; x <= totalWavesWidth; x += step) {
    // Primary wave
    const primaryWave = amplitude * Math.sin(factor * x);
    // Secondary harmonic for complexity
    const secondaryWave = (amplitude * 0.3) * Math.sin(factor * x * 2 + Math.PI / 4);
    // Tertiary harmonic for subtle variation
    const tertiaryWave = (amplitude * 0.15) * Math.sin(factor * x * 3);
    
    const deltaY = primaryWave + secondaryWave + tertiaryWave;
    const y = direction === "up" ? baseY - deltaY : baseY + deltaY;
    points.push(`L ${x} ${y}`);
  }

  const closeY = direction === "up" ? height : 0;
  points.push(`L ${totalWavesWidth} ${closeY}`);
  points.push(`L 0 ${closeY} Z`);

  return points.join(" ");
}

const fullHeight = computed(() => waveHeight.value + waveAmplitude.value * 3);

const maskImage = computed(() => {
  const svg = `<svg width="${waveLength.value}" height="${fullHeight.value}" xmlns="http://www.w3.org/2000/svg">
    <path d="${generateComplexWavePath(
      waveLength.value,
      fullHeight.value,
      waveAmplitude.value,
      waveLength.value,
      direction.value
    )}"/>
  </svg>`;
  return `url(data:image/svg+xml;base64,${btoa(svg)})`;
});

watch(
  () => [
    props.height,
    props.amplitude,
    props.waveLength,
    props.fillColor,
    props.direction,
    props.movementDirection,
  ],
  () => {
    waveHeight.value = props.height!;
    waveAmplitude.value = props.amplitude!;
    waveLength.value = props.waveLength!;
    waveFillColor.value = props.fillColor!;
    direction.value = props.direction!;
    movementDirection.value = props.movementDirection!;
  },
  { immediate: true }
);
</script>

<template>
  <div class="relative">
    <slot />
    <div absolute left-0 right-0 top-0 w-full overflow-hidden>
      <div
        class="colored-area wave-flow"
        :style="{
          background: waveFillColor,
          height: `${fullHeight}px`,
          maskImage,
          WebkitMaskImage: maskImage,
          '--wave-translate': `${-waveLength}px`,
          '--animation-duration': `${waveLength / animationSpeed}s`,
          'animation-direction': movementDirection === 'left' ? 'normal' : 'reverse',
        }"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes wave-flow-animation {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(var(--wave-translate, -350px), 0);
  }
}

@keyframes data-pulse {
  0%, 100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

.wave-flow {
  width: 200vw;
  mask-repeat: repeat-x;
  -webkit-mask-repeat: repeat-x;
  will-change: transform, opacity;
  animation: 
    wave-flow-animation var(--animation-duration, 5s) cubic-bezier(0.4, 0, 0.6, 1) infinite,
    data-pulse 3s ease-in-out infinite;
  filter: blur(0.3px) drop-shadow(0 0 8px rgba(0, 180, 255, 0.3));
}
</style>
