import { useLocalStorage } from "@vueuse/core";
import localforage from "localforage";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export type DisplayModelFormat = "live2d" | "vrm";
export type DisplayModelSource = "preset" | "custom";
export type DisplayModelKind = "url" | "file";

type DisplayModelBase = {
  id: string;
  name: string;
  format: DisplayModelFormat;
  source: DisplayModelSource;
  kind: DisplayModelKind;
  importedAt: number;
};

export type DisplayModelUrl = DisplayModelBase & {
  kind: "url";
  url: string;
};

export type DisplayModelFile = DisplayModelBase & {
  kind: "file";
  fileKey: string;
  file: File;
};

export type DisplayModel = DisplayModelUrl | DisplayModelFile;

type StoredCustomModel =
  | (DisplayModelBase & { kind: "url"; url: string })
  | (DisplayModelBase & { kind: "file"; fileKey: string });

const presetModels: DisplayModelUrl[] = [
  {
    id: "preset-live2d-whale",
    name: "Calico Cat",
    format: "live2d",
    url: "/live2d/Calico-Cat.zip",
    source: "preset",
    kind: "url",
    importedAt: 0,
  },
];

const fileStore = localforage.createInstance({
  name: "whalewhisper",
  storeName: "stage-model-files",
});

export const useDisplayModelsStore = defineStore("display-models", () => {
  const customModels = useLocalStorage<StoredCustomModel[]>(
    "whalewhisper/stage/models/custom",
    []
  );
  const selectedModelId = useLocalStorage<string>(
    "whalewhisper/stage/model",
    presetModels[0]?.id ?? ""
  );
  const customModelsResolved = ref<DisplayModel[]>([]);
  const customModelsReady = ref(false);
  const customModelsLoading = ref(false);
  let hydrationLock = false;

  function normalizeCustomModel(model: StoredCustomModel) {
    if (!model?.id || !model.format) return null;

    const base = {
      id: model.id,
      name: model.name || model.id,
      format: model.format,
      source: "custom" as DisplayModelSource,
      kind: model.kind,
      importedAt: Number.isFinite(model.importedAt) ? model.importedAt : Date.now(),
    };

    if (model.kind === "file") {
      if (!model.fileKey) return null;
      return { ...base, kind: "file", fileKey: model.fileKey };
    }

    if (model.kind === "url" && model.url) {
      return { ...base, kind: "url", url: model.url };
    }

    const legacyUrl = (model as DisplayModelUrl).url;
    if (legacyUrl) {
      return { ...base, kind: "url", url: legacyUrl };
    }

    return null;
  }

  async function hydrateCustomModels() {
    if (hydrationLock) return;
    hydrationLock = true;
    customModelsLoading.value = true;

    try {
      const normalized: StoredCustomModel[] = [];
      for (const model of customModels.value) {
        const normalizedModel = normalizeCustomModel(model);
        if (normalizedModel) normalized.push(normalizedModel);
      }

      if (normalized.length !== customModels.value.length) {
        customModels.value = normalized;
      }

      const resolved: DisplayModel[] = [];
      const missingIds: string[] = [];

      for (const model of normalized) {
        if (model.kind === "url") {
          resolved.push(model);
          continue;
        }

        const file = await fileStore.getItem<File>(model.fileKey);
        if (file) {
          resolved.push({ ...model, file });
        } else {
          missingIds.push(model.id);
        }
      }

      if (missingIds.length) {
        customModels.value = normalized.filter((model) => !missingIds.includes(model.id));
      }

      customModelsResolved.value = resolved;
    } finally {
      customModelsReady.value = true;
      customModelsLoading.value = false;
      hydrationLock = false;
    }
  }

  watch(
    customModels,
    () => {
      void hydrateCustomModels();
    },
    { deep: true, immediate: true }
  );

  const models = computed(() => [...presetModels, ...customModelsResolved.value]);
  const activeModel = computed(() => {
    return (
      models.value.find((model) => model.id === selectedModelId.value) ??
      models.value[0]
    );
  });
  const activeModelSource = computed(() => {
    if (!activeModel.value) return undefined;
    return activeModel.value.kind === "file"
      ? activeModel.value.file
      : activeModel.value.url;
  });

  watch(
    [models, customModelsReady],
    () => {
      if (!customModelsReady.value) return;
      const exists = models.value.some((model) => model.id === selectedModelId.value);
      if (!exists) {
        selectedModelId.value = presetModels[0]?.id ?? "";
      }
    },
    { immediate: true }
  );

  function selectModel(modelId: string) {
    selectedModelId.value = modelId;
  }

  function addCustomModel(payload: { name: string; url: string; format: DisplayModelFormat }) {
    const id = `custom-${Date.now()}`;
    customModels.value = [
      ...customModels.value,
      {
        id,
        name: payload.name,
        format: payload.format,
        url: payload.url,
        source: "custom",
        kind: "url",
        importedAt: Date.now(),
      },
    ];
    selectedModelId.value = id;
  }

  async function addCustomFileModel(payload: {
    file: File;
    format: DisplayModelFormat;
    name?: string;
  }) {
    const id = `custom-${Date.now()}`;
    const fileKey = `display-model-${id}`;
    await fileStore.setItem(fileKey, payload.file);

    customModels.value = [
      ...customModels.value,
      {
        id,
        name: payload.name || payload.file.name,
        format: payload.format,
        fileKey,
        source: "custom",
        kind: "file",
        importedAt: Date.now(),
      },
    ];
    selectedModelId.value = id;
    await hydrateCustomModels();
  }

  async function removeCustomModel(modelId: string) {
    const entry = customModels.value.find((model) => model.id === modelId);
    if (entry?.kind === "file") {
      await fileStore.removeItem(entry.fileKey);
    }

    customModels.value = customModels.value.filter((model) => model.id !== modelId);
    if (selectedModelId.value === modelId) {
      selectedModelId.value = presetModels[0]?.id ?? "";
    }
    await hydrateCustomModels();
  }

  return {
    models,
    activeModel,
    activeModelSource,
    selectedModelId,
    customModelsLoading,
    selectModel,
    addCustomModel,
    addCustomFileModel,
    removeCustomModel,
  };
});
