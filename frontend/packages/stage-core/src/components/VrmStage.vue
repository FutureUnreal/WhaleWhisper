<script setup lang="ts">
import { useElementBounding } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM, VRMUtils, VRMLoaderPlugin } from "@pixiv/three-vrm";

import { useStageI18n } from "../composables/stage-i18n";
import { useLive2d } from "../stores/live2d";
import { useStageModelCapabilitiesStore } from "../stores/stage-model-capabilities";
import { extractVrmCapabilities } from "../utils/model-capabilities";

const props = withDefaults(
  defineProps<{
    modelSrc?: string | File;
    modelId?: string;
    paused?: boolean;
  }>(),
  {
    paused: false,
  }
);

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const { width, height } = useElementBounding(containerRef, { immediate: true });

const live2dStore = useLive2d();
const { scale, position } = storeToRefs(live2dStore);
const { t } = useStageI18n();
const stageModelCapabilities = useStageModelCapabilitiesStore();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let currentVrm: VRM | null = null;
const clock = new THREE.Clock();
let animationFrameId = 0;
let loadToken = 0;

function updateRendererSize() {
  if (!renderer || !camera) return;
  const safeWidth = Math.max(1, width.value);
  const safeHeight = Math.max(1, height.value);
  renderer.setSize(safeWidth, safeHeight, false);
  camera.aspect = safeWidth / safeHeight;
  camera.updateProjectionMatrix();
  updateVrmRect();
}

function applyTransform() {
  if (!currentVrm) return;
  const s = Math.max(0.1, Number(scale.value || 1));
  const x = (position.value.x ?? 0) * 0.02;
  const y = (position.value.y ?? 0) * 0.02;
  const z = (position.value.z ?? 0) * 0.02;
  currentVrm.scene.scale.setScalar(s);
  currentVrm.scene.position.set(x, y, z);
  updateVrmRect();
}

function updateVrmRect() {
  if (!currentVrm || !camera) return;
  const safeWidth = Math.max(1, width.value);
  const safeHeight = Math.max(1, height.value);

  currentVrm.scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(currentVrm.scene);
  if (box.isEmpty()) return;

  const points = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const projected = point.clone().project(camera);
    const x = (projected.x + 1) * 0.5 * safeWidth;
    const y = (-projected.y + 1) * 0.5 * safeHeight;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
  live2dStore.setModelRect({
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
  });
  live2dStore.setModelBounds({
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  });
}

async function loadModel(src?: string | File) {
  if (!scene) return;
  const token = ++loadToken;
  const objectUrl = src instanceof File ? URL.createObjectURL(src) : "";
  const resolvedSrc = typeof src === "string" ? src : objectUrl || undefined;

  if (!resolvedSrc) {
    if (currentVrm) {
      scene.remove(currentVrm.scene);
      VRMUtils.deepDispose(currentVrm.scene);
      currentVrm = null;
    }
    live2dStore.setModelRect({ left: 0, top: 0, right: 0, bottom: 0 });
    live2dStore.setModelBounds({ width: 0, height: 0 });
    return;
  }

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  try {
    const gltf = await loader.loadAsync(resolvedSrc);
    if (token !== loadToken) return;

    if (currentVrm) {
      scene.remove(currentVrm.scene);
      VRMUtils.deepDispose(currentVrm.scene);
      currentVrm = null;
    }

    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);

    const vrm = gltf.userData.vrm as VRM;
    currentVrm = vrm;
    scene.add(vrm.scene);
    applyTransform();
    updateVrmRect();
    if (props.modelId) {
      const capabilities = extractVrmCapabilities(vrm);
      stageModelCapabilities.setVrmCapabilities(props.modelId, capabilities);
    }
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function tick() {
  animationFrameId = requestAnimationFrame(tick);
  if (!renderer || !scene || !camera) return;
  const delta = clock.getDelta();
  if (!props.paused) {
    currentVrm?.update(delta);
  }
  renderer.render(scene, camera);
}

onMounted(() => {
  if (!canvasRef.value) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.4, 2.6);
  camera.lookAt(new THREE.Vector3(0, 1.3, 0));

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(1, 1, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  updateRendererSize();
  void loadModel(props.modelSrc);
  tick();
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  if (currentVrm && scene) {
    scene.remove(currentVrm.scene);
    VRMUtils.deepDispose(currentVrm.scene);
    currentVrm = null;
  }
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
});

watch([width, height], updateRendererSize);
watch(() => props.modelSrc, (src) => void loadModel(src));
watch([scale, position], applyTransform, { deep: true });

defineExpose({
  canvasElement: () => canvasRef.value ?? undefined,
});
</script>

<template>
  <div ref="containerRef" class="relative h-full w-full">
    <canvas ref="canvasRef" class="h-full w-full" />
    <div
      v-if="!modelSrc"
      class="absolute inset-0 flex items-center justify-center rounded-xl border border-neutral-200/60 bg-white/50 text-sm text-neutral-500 dark:border-neutral-800/60 dark:bg-neutral-950/50 dark:text-neutral-400"
    >
      {{ t("stage.vrm.empty") }}
    </div>
  </div>
</template>
