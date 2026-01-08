<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import {
  buildActionTokenPrompt,
  resolveModelMappingKey,
  type DisplayModelFormat,
  useDisplayModelsStore,
  useLive2dModelMappingsStore,
  useLive2dRuntime,
  useStageI18n,
  useStageModelCapabilitiesStore,
  useStageSettingsStore,
} from "@whalewhisper/stage-core";
import SelectMenu from "./ui/SelectMenu.vue";

const props = defineProps<{
  locale?: string;
}>();

const { t: tRaw } = useStageI18n();
const resolvedLocale = computed(() => {
  if (props.locale) return props.locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
});
const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith("zh"));

const fallbackEn = {
  "common.select": "Select",
  "common.enabled": "Enabled",
  "common.disabled": "Disabled",
  "common.reset": "Reset",
  "common.close": "Close",
  "stage.display.title": "Display",
  "stage.display.format": "Format",
  "stage.display.desc": "Select the renderer and active model.",
  "stage.display.selectFormat": "Select format",
  "stage.display.selectModel": "Select model",
  "stage.actions.title": "Action Tokens",
  "stage.actions.desc": "Use tokens to drive motions and expressions.",
  "stage.actions.prompt.title": "Action prompt",
  "stage.actions.prompt.placeholder": "Prompt used for action tokens.",
  "stage.actions.prompt.fill": "Auto fill",
  "stage.actions.debug.toggle": "Toggle debug",
  "stage.actions.debug.title": "Action token debug",
  "stage.actions.debug.empty": "No token captured yet",
  "stage.add.title": "Add Model",
  "stage.add.customFormat": "Format",
  "stage.add.name": "Name",
  "stage.add.name.placeholder": "Model name",
  "stage.add.url": "URL",
  "stage.add.url.placeholder": "https://example.com/model.zip",
  "stage.add.upload": "Upload",
  "stage.add.upload.button": "Choose file",
  "stage.add.upload.hint": "ZIP for Live2D, VRM for VRM",
  "stage.add.add": "Add",
  "stage.add.remove": "Remove",
};

const fallbackZh = {
  "common.select": "请选择",
  "common.enabled": "启用",
  "common.disabled": "禁用",
  "common.reset": "重置",
  "common.close": "关闭",
  "stage.display.title": "舞台显示",
  "stage.display.format": "格式",
  "stage.display.desc": "选择渲染类型与当前模型。",
  "stage.display.selectFormat": "选择格式",
  "stage.display.selectModel": "选择模型",
  "stage.actions.title": "动作/情绪 token",
  "stage.actions.desc": "用于驱动动作和表情。",
  "stage.actions.prompt.title": "协议提示词",
  "stage.actions.prompt.placeholder": "用于动作/情绪 token 的提示词。",
  "stage.actions.prompt.fill": "自动填充",
  "stage.actions.debug.toggle": "动作 token 调试",
  "stage.actions.debug.title": "动作 token 调试",
  "stage.actions.debug.empty": "暂无动作 token 记录",
  "stage.add.title": "添加模型",
  "stage.add.customFormat": "格式",
  "stage.add.name": "名称",
  "stage.add.name.placeholder": "模型名称",
  "stage.add.url": "URL",
  "stage.add.url.placeholder": "https://example.com/model.zip",
  "stage.add.upload": "本地上传",
  "stage.add.upload.button": "选择文件",
  "stage.add.upload.hint": "Live2D 使用 ZIP，VRM 使用 .vrm",
  "stage.add.add": "添加",
  "stage.add.remove": "移除",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  const resolved = tRaw(key);
  if (resolved && resolved !== key) return resolved;
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};

const settings = useStageSettingsStore();
const displayModelsStore = useDisplayModelsStore();
const live2dRuntime = useLive2dRuntime();
const stageModelCapabilities = useStageModelCapabilitiesStore();
const live2dModelMappings = useLive2dModelMappingsStore();
const { models, selectedModelId } = storeToRefs(displayModelsStore);
const { lastSpecialToken, lastSpecialAction, lastSpecialTokenAt } =
  storeToRefs(live2dRuntime);
const {
  stageModelRenderer,
  stageActionTokensEnabled,
  stageActionTokensPrompt,
} = storeToRefs(settings);

const displayFormat = ref<DisplayModelFormat>("live2d");
const showActionTokenDebug = ref(false);
const filteredModels = computed(() =>
  models.value.filter((model) => model.format === displayFormat.value)
);
const modelOptions = computed(() =>
  filteredModels.value.map((model) => ({
    id: model.id,
    label: model.name,
    description: model.format.toUpperCase(),
  }))
);
const selectedModel = computed(() =>
  models.value.find((model) => model.id === selectedModelId.value)
);
const isCustomModel = computed(() => selectedModel.value?.source === "custom");
const actionPromptContext = computed(() => {
  const model = selectedModel.value;
  if (!model?.id) return undefined;
  if (model.format === "live2d") {
    const caps = stageModelCapabilities.getLive2dCapabilities(model.id);
    const mappingKey = resolveModelMappingKey(model);
    const mapping = live2dModelMappings.getMapping(mappingKey);
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
const lastSpecialTokenTime = computed(() => {
  if (!lastSpecialTokenAt.value) return "";
  return new Date(lastSpecialTokenAt.value).toLocaleTimeString(resolvedLocale.value);
});

const newModelName = ref("");
const newModelUrl = ref("");
const newModelFormat = ref<DisplayModelFormat>("live2d");
const fileInput = ref<HTMLInputElement | null>(null);
const fileAccept = computed(() => (newModelFormat.value === "vrm" ? ".vrm" : ".zip"));

watch(
  selectedModel,
  (model) => {
    if (!model?.format) return;
    if (displayFormat.value !== model.format) {
      displayFormat.value = model.format;
    }
    stageModelRenderer.value = model.format;
  },
  { immediate: true }
);

watch(
  displayFormat,
  (format) => {
    const current = selectedModel.value;
    if (current?.format !== format) {
      const fallback = models.value.find((model) => model.format === format);
      if (fallback) {
        displayModelsStore.selectModel(fallback.id);
      }
    }
    stageModelRenderer.value = format;
  },
  { immediate: true }
);

function handleAddModel() {
  const name = newModelName.value.trim();
  const url = newModelUrl.value.trim();
  if (!name || !url) return;
  displayModelsStore.addCustomModel({
    name,
    url,
    format: newModelFormat.value,
  });
  newModelName.value = "";
  newModelUrl.value = "";
  newModelFormat.value = "live2d";
}

function handleRemoveModel() {
  if (selectedModel.value?.id) {
    displayModelsStore.removeCustomModel(selectedModel.value.id);
  }
}

function triggerUpload() {
  fileInput.value?.click();
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const isLive2D = newModelFormat.value === "live2d";
  const isVrm = newModelFormat.value === "vrm";
  if (isLive2D && !file.name.toLowerCase().endsWith(".zip")) {
    target.value = "";
    return;
  }
  if (isVrm && !file.name.toLowerCase().endsWith(".vrm")) {
    target.value = "";
    return;
  }

  try {
    await displayModelsStore.addCustomFileModel({
      file,
      format: newModelFormat.value,
      name: newModelName.value.trim() || file.name,
    });
    newModelName.value = "";
  } catch (error) {
    console.error("Failed to add local model:", error);
  } finally {
    target.value = "";
  }
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("stage.display.title") }}
      </div>
      <div class="mt-3 grid gap-2">
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("stage.display.format") }}
        </label>
        <SelectMenu
          v-model="displayFormat"
          :options="[
            { id: 'live2d', label: 'Live2D' },
            { id: 'vrm', label: 'VRM' },
          ]"
          :placeholder="t('stage.display.selectFormat')"
          list-class="max-h-[120px]"
          item-class="h-[40px]"
        />
      </div>
      <div class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("stage.display.desc") }}
      </div>
      <div class="mt-3">
        <SelectMenu
          v-model="selectedModelId"
          :options="modelOptions"
          :placeholder="t('stage.display.selectModel')"
        />
      </div>
      <div class="mt-4 flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
        <div>
          <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {{ t("stage.actions.title") }}
          </div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t("stage.actions.desc") }}
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-xs transition hover:text-neutral-900"
          :class="
            stageActionTokensEnabled
              ? 'border-primary-300 bg-primary-50 text-primary-600 dark:border-primary-500/40 dark:bg-primary-900/40 dark:text-primary-200'
              : 'border-neutral-200 bg-white/80 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300'
          "
          @click="stageActionTokensEnabled = !stageActionTokensEnabled"
        >
          {{ stageActionTokensEnabled ? t("common.disabled") : t("common.enabled") }}
        </button>
      </div>
      <div class="mt-3 grid gap-2">
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("stage.actions.prompt.title") }}
        </label>
        <textarea
          v-model="stageActionTokensPrompt"
          rows="4"
          :placeholder="t('stage.actions.prompt.placeholder')"
          class="min-h-[120px] w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
        />
        <div class="flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
            @click="stageActionTokensPrompt = ''"
          >
            {{ t("common.reset") }}
          </button>
          <button
            type="button"
            class="ml-2 rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
            @click="
              stageActionTokensPrompt = buildActionTokenPrompt(
                resolvedLocale || 'en',
                actionPromptContext
              )
            "
          >
            {{ t("stage.actions.prompt.fill") }}
          </button>
        </div>
      </div>
    </div>

    <div class="group rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("stage.add.title") }}
      </div>
      <div class="grid gap-2">
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("stage.add.customFormat") }}
        </label>
        <SelectMenu
          v-model="newModelFormat"
          :options="[
            { id: 'live2d', label: 'Live2D' },
            { id: 'vrm', label: 'VRM' },
          ]"
          :placeholder="t('stage.display.selectFormat')"
          list-class="max-h-[120px]"
          item-class="h-[40px]"
        />
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("stage.add.name") }}
        </label>
        <input
          v-model="newModelName"
          type="text"
          :placeholder="t('stage.add.name.placeholder')"
          class="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
        />
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("stage.add.url") }}
        </label>
        <input
          v-model="newModelUrl"
          type="text"
          :placeholder="t('stage.add.url.placeholder')"
          class="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
        />
        <label class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("stage.add.upload") }}
        </label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
            @click="triggerUpload"
          >
            {{ t("stage.add.upload.button") }}
          </button>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            :accept="fileAccept"
            @change="handleUpload"
          />
          <span class="text-xs text-neutral-400 dark:text-neutral-500">
            {{ t("stage.add.upload.hint") }}
          </span>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <button
            class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-sm text-neutral-600 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
            type="button"
            @click="handleAddModel"
          >
            {{ t("stage.add.add") }}
          </button>
          <button
            v-if="isCustomModel"
            class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1 text-sm text-neutral-600 transition hover:text-red-500 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
            type="button"
            @click="handleRemoveModel"
          >
            {{ t("stage.add.remove") }}
          </button>
          <button
            type="button"
            class="ml-auto rounded-lg border p-1 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
            :class="
              showActionTokenDebug
                ? 'border-primary-300 bg-primary-50 text-primary-600 opacity-100 dark:border-primary-500/40 dark:bg-primary-900/40 dark:text-primary-200'
                : 'border-neutral-200/70 bg-white/80 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-400'
            "
            :title="t('stage.actions.debug.toggle')"
            @click="showActionTokenDebug = !showActionTokenDebug"
          >
            <div class="i-solar:code-circle-linear h-4 w-4"></div>
          </button>
        </div>
        <div
          v-if="showActionTokenDebug"
          class="mt-3 rounded-xl border border-dashed border-neutral-200/70 bg-white/70 p-3 text-xs text-neutral-600 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-300"
        >
          <div class="flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
            <span>{{ t("stage.actions.debug.title") }}</span>
            <button
              type="button"
              class="text-neutral-400 transition hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
              :aria-label="t('common.close')"
              @click="showActionTokenDebug = false"
            >
              x
            </button>
          </div>
          <div class="mt-2 break-all text-[11px] text-neutral-500 dark:text-neutral-400">
            <div>{{ lastSpecialToken || t("stage.actions.debug.empty") }}</div>
            <div v-if="lastSpecialAction" class="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
              → {{ lastSpecialAction }}
            </div>
            <div v-if="lastSpecialTokenTime" class="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
              {{ lastSpecialTokenTime }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
