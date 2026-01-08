<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

export type PersonaCard = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  personality: string;
  scenario: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  createdAt: number;
  isDefault?: boolean;
};

type PersonaPayload = Omit<PersonaCard, "id" | "createdAt" | "isDefault">;

type ImportResult =
  | boolean
  | void
  | {
      ok: boolean;
      message?: string;
    };

const props = withDefaults(
  defineProps<{
    locale?: string;
    t?: (key: string) => string;
    cards?: PersonaCard[];
    activeCardId?: string;
    onInitialize?: () => void | Promise<void>;
    onAddCard?: (payload: PersonaPayload) => string | Promise<string>;
    onUpdateCard?: (id: string, payload: PersonaPayload) => void | Promise<void>;
    onRemoveCard?: (id: string) => void | Promise<void>;
    onSetActive?: (id: string) => void | Promise<void>;
    onExport?: () => Promise<unknown> | unknown;
    onImport?: (payload: unknown) => Promise<ImportResult> | ImportResult;
  }>(),
  {
    cards: () => [],
  }
);

const resolvedLocale = computed(() => {
  if (props.locale) return props.locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
});
const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith("zh"));

const fallbackEn = {
  "persona.title": "Persona",
  "persona.desc": "Define the character prompt (developer instructions).",
  "persona.search": "Search persona cards",
  "persona.sort.nameAsc": "Name A-Z",
  "persona.sort.nameDesc": "Name Z-A",
  "persona.sort.recent": "Recently created",
  "persona.create": "Create card",
  "persona.import": "Import",
  "persona.export": "Export",
  "persona.active": "Active",
  "persona.use": "Set active",
  "persona.save": "Save",
  "persona.delete": "Delete",
  "persona.exported": "Persona exported.",
  "persona.imported": "Persona imported.",
  "persona.importFailed": "Import failed.",
  "persona.exportFailed": "Export failed.",
  "persona.deleteConfirm.title": "Delete persona card?",
  "persona.deleteConfirm.desc": "This action cannot be undone.",
  "persona.name.label": "Persona name",
  "persona.name.placeholder": "e.g. WhaleWhisper",
  "persona.desc.label": "Description",
  "persona.desc.placeholder": "Describe the persona background briefly.",
  "persona.prompt.label": "Persona prompt",
  "persona.prompt.placeholder": "Describe identity, tone, preferences, and boundaries.",
  "persona.prompt.help": "Defines the persona tone, behavior, and boundaries.",
  "persona.personality.label": "Personality",
  "persona.personality.placeholder": "Describe personality traits.",
  "persona.scenario.label": "Scenario",
  "persona.scenario.placeholder": "Describe the current context or setting.",
  "persona.systemPrompt.label": "System prompt",
  "persona.systemPrompt.placeholder": "Supplemental system-level instructions.",
  "persona.postHistory.label": "Post-history prompt",
  "persona.postHistory.placeholder": "Extra constraints appended after history.",
  "persona.tab.basic": "Basic",
  "persona.tab.behavior": "Behavior",
  "persona.tab.advanced": "Advanced",
  "persona.card.edit": "Edit",
  "persona.card.nameFallback": "Untitled persona",
  "persona.card.descEmpty": "No description yet.",
  "persona.card.promptEmpty": "No persona prompt yet.",
  "persona.dialog.title": "Persona prompt",
  "persona.dialog.desc": "Edit name, description, and prompt.",
  "persona.dialog.close": "Close persona dialog",
  "common.close": "Close",
  "common.add": "Add",
};

const fallbackZh = {
  "persona.title": "角色设定",
  "persona.desc": "为数字人定义角色提示词（开发者指令）。",
  "persona.search": "搜索角色卡片",
  "persona.sort.nameAsc": "名称 A-Z",
  "persona.sort.nameDesc": "名称 Z-A",
  "persona.sort.recent": "最近创建",
  "persona.create": "新建角色卡",
  "persona.import": "导入",
  "persona.export": "导出",
  "persona.active": "使用中",
  "persona.use": "设为当前",
  "persona.save": "保存",
  "persona.delete": "删除",
  "persona.exported": "已导出角色卡。",
  "persona.imported": "已导入角色卡。",
  "persona.importFailed": "导入失败。",
  "persona.exportFailed": "导出失败。",
  "persona.deleteConfirm.title": "删除角色卡？",
  "persona.deleteConfirm.desc": "删除后将无法恢复。",
  "persona.name.label": "角色名称",
  "persona.name.placeholder": "例如：WhaleWhisper",
  "persona.desc.label": "角色描述",
  "persona.desc.placeholder": "用几句话说明角色背景或定位。",
  "persona.prompt.label": "角色提示词",
  "persona.prompt.placeholder": "描述角色身份、语气、偏好和行为边界。",
  "persona.prompt.help": "用于定义角色的语气、行为与边界。",
  "persona.personality.label": "性格",
  "persona.personality.placeholder": "描述角色的性格特征。",
  "persona.scenario.label": "场景",
  "persona.scenario.placeholder": "描述角色当前所处的环境或背景。",
  "persona.systemPrompt.label": "系统提示词",
  "persona.systemPrompt.placeholder": "补充系统层的行为指令。",
  "persona.postHistory.label": "后置提示词",
  "persona.postHistory.placeholder": "用于对话历史之后的补充约束。",
  "persona.tab.basic": "基础",
  "persona.tab.behavior": "行为",
  "persona.tab.advanced": "高级",
  "persona.card.edit": "编辑",
  "persona.card.nameFallback": "未命名角色",
  "persona.card.descEmpty": "暂无描述",
  "persona.card.promptEmpty": "暂无角色提示词",
  "persona.dialog.title": "角色提示词",
  "persona.dialog.desc": "调整角色名称、描述与提示词。",
  "persona.dialog.close": "关闭角色提示词",
  "common.close": "关闭",
  "common.add": "添加",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  if (props.t) {
    const resolved = props.t(key);
    if (resolved && resolved !== key) return resolved;
  }
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};

const dialogOpen = ref(false);
const createDialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const cardDraft = ref<PersonaCard | null>(null);
const newCardDraft = ref(createEmptyCard());
const searchQuery = ref("");
const sortOption = ref("nameAsc");
const cardToDelete = ref<PersonaCard | null>(null);
const editTab = ref("basic");
const createTab = ref("basic");
const feedback = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const cardsArray = computed(() => props.cards ?? []);
const activeCardId = computed(() => props.activeCardId ?? "");

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return cardsArray.value;
  return cardsArray.value.filter((card) => {
    return (
      card.name.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query) ||
      card.prompt.toLowerCase().includes(query)
    );
  });
});

const sortedCards = computed(() => {
  const items = [...filteredCards.value];
  if (sortOption.value === "nameAsc") {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sortOption.value === "nameDesc") {
    return items.sort((a, b) => b.name.localeCompare(a.name));
  }
  if (sortOption.value === "recent") {
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }
  return items;
});

const canCreate = computed(() => typeof props.onAddCard === "function");
const canEdit = computed(() => typeof props.onUpdateCard === "function");
const canRemove = computed(() => typeof props.onRemoveCard === "function");
const canSetActive = computed(() => typeof props.onSetActive === "function");
const canExport = computed(() => typeof props.onExport === "function");
const canImport = computed(() => typeof props.onImport === "function");

const promptPreview = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return t("persona.card.promptEmpty");
  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}...` : trimmed;
};

function createEmptyCard() {
  return {
    id: "",
    name: "",
    description: "",
    prompt: "",
    personality: "",
    scenario: "",
    systemPrompt: "",
    postHistoryInstructions: "",
    createdAt: Date.now(),
    isDefault: false,
  } satisfies PersonaCard;
}

function handleSelectCard(cardId: string) {
  const card = cardsArray.value.find((item) => item.id === cardId) ?? null;
  cardDraft.value = card ? { ...card } : null;
  dialogOpen.value = true;
  editTab.value = "basic";
}

function handleSave() {
  if (!cardDraft.value || !props.onUpdateCard) return;
  props.onUpdateCard(cardDraft.value.id, {
    name: cardDraft.value.name.trim() || t("persona.card.nameFallback"),
    description: cardDraft.value.description.trim(),
    prompt: cardDraft.value.prompt.trim(),
    personality: cardDraft.value.personality.trim(),
    scenario: cardDraft.value.scenario.trim(),
    systemPrompt: cardDraft.value.systemPrompt.trim(),
    postHistoryInstructions: cardDraft.value.postHistoryInstructions.trim(),
  });
  dialogOpen.value = false;
}

async function handleCreate() {
  if (!props.onAddCard) return;
  const payload = {
    name: newCardDraft.value.name.trim() || t("persona.card.nameFallback"),
    description: newCardDraft.value.description.trim(),
    prompt: newCardDraft.value.prompt.trim(),
    personality: newCardDraft.value.personality.trim(),
    scenario: newCardDraft.value.scenario.trim(),
    systemPrompt: newCardDraft.value.systemPrompt.trim(),
    postHistoryInstructions: newCardDraft.value.postHistoryInstructions.trim(),
  };
  const id = await props.onAddCard(payload);
  if (id && props.onSetActive) {
    await props.onSetActive(id);
  }
  newCardDraft.value = createEmptyCard();
  createDialogOpen.value = false;
}

function handleDeleteConfirm(card: PersonaCard) {
  cardToDelete.value = card;
  deleteDialogOpen.value = true;
}

function confirmDelete() {
  if (cardToDelete.value && props.onRemoveCard) {
    void props.onRemoveCard(cardToDelete.value.id);
  }
  cardToDelete.value = null;
  deleteDialogOpen.value = false;
}

function triggerImport() {
  if (!props.onImport) return;
  fileInput.value?.click();
}

async function handleImport(event: Event) {
  if (!props.onImport) return;
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const result = await props.onImport(payload);
    if (result && typeof result === "object" && "ok" in result) {
      feedback.value = result.ok ? result.message || t("persona.imported") : result.message || t("persona.importFailed");
    } else if (result === false) {
      feedback.value = t("persona.importFailed");
    } else {
      feedback.value = t("persona.imported");
    }
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : t("persona.importFailed");
  } finally {
    target.value = "";
  }
}

async function handleExport() {
  if (!props.onExport) return;
  try {
    const payload = await props.onExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "whalewhisper-persona.json";
    link.click();
    URL.revokeObjectURL(url);
    feedback.value = t("persona.exported");
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : t("persona.exportFailed");
  }
}

onMounted(() => {
  void props.onInitialize?.();
});
</script>

<template>
  <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
    <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
      {{ t("persona.title") }}
    </div>
    <div class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ t("persona.desc") }}
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <div class="relative min-w-[200px] flex-1">
        <input
          v-model="searchQuery"
          type="search"
          class="w-full rounded-xl border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-600 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
          :placeholder="t('persona.search')"
        />
      </div>
      <select
        v-model="sortOption"
        class="rounded-xl border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-600 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
      >
        <option value="nameAsc">{{ t("persona.sort.nameAsc") }}</option>
        <option value="nameDesc">{{ t("persona.sort.nameDesc") }}</option>
        <option value="recent">{{ t("persona.sort.recent") }}</option>
      </select>
      <button
        type="button"
        class="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-sm text-neutral-600 transition hover:text-neutral-800 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
        :disabled="!canExport"
        @click="handleExport"
      >
        {{ t("persona.export") }}
      </button>
      <button
        type="button"
        class="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-sm text-neutral-600 transition hover:text-neutral-800 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
        :disabled="!canImport"
        @click="triggerImport"
      >
        {{ t("persona.import") }}
      </button>
      <button
        type="button"
        class="rounded-xl border border-primary-300 bg-primary-50 px-3 py-2 text-sm text-primary-600 transition hover:text-primary-700 disabled:opacity-60 dark:border-primary-500/30 dark:bg-primary-900/40 dark:text-primary-200"
        :disabled="!canCreate"
        @click="createTab = 'basic'; createDialogOpen = true"
      >
        {{ t("persona.create") }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="handleImport"
      />
    </div>
    <div v-if="feedback" class="mt-2 text-xs text-neutral-400">
      {{ feedback }}
    </div>

    <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
      <button
        v-for="card in sortedCards"
        :key="card.id"
        type="button"
        class="rounded-xl border border-neutral-200/70 bg-white/80 p-4 text-left shadow-sm transition hover:border-primary-300/60 dark:border-neutral-800/70 dark:bg-neutral-900/70"
        @click="handleSelectCard(card.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
              {{ card.name || t("persona.card.nameFallback") }}
            </div>
            <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {{ card.description || t("persona.card.descEmpty") }}
            </div>
            <div class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              {{ promptPreview(card.prompt) }}
            </div>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-2">
            <span
              v-if="card.id === activeCardId"
              class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
            >
              {{ t("persona.active") }}
            </span>
            <span class="text-[11px] text-primary-600 dark:text-primary-300">
              {{ t("persona.card.edit") }}
            </span>
          </div>
        </div>
      </button>
    </div>
  </div>

  <teleport to="body">
    <div v-if="dialogOpen && cardDraft" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        type="button"
        :aria-label="t('persona.dialog.close')"
        @click="dialogOpen = false"
      />
      <div class="relative z-10 w-full max-w-3xl rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur-md dark:bg-neutral-900/90 max-h-[90vh] overflow-y-auto">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {{ t("persona.dialog.title") }}
            </div>
            <div class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ t("persona.dialog.desc") }}
            </div>
          </div>
          <button
            type="button"
            class="rounded-xl border border-neutral-200 bg-white/70 p-2 text-neutral-500 shadow-sm transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
            @click="dialogOpen = false"
          >
            <div class="i-solar:close-circle-bold-duotone h-5 w-5" />
          </button>
        </div>

      <div class="mb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm"
            :class="editTab === 'basic'
              ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-300 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'"
            @click="editTab = 'basic'"
          >
            {{ t("persona.tab.basic") }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm"
            :class="editTab === 'behavior'
              ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-300 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'"
            @click="editTab = 'behavior'"
          >
            {{ t("persona.tab.behavior") }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm"
            :class="editTab === 'advanced'
              ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-300 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'"
            @click="editTab = 'advanced'"
          >
            {{ t("persona.tab.advanced") }}
          </button>
        </div>
      </div>

      <div v-if="editTab === 'basic'" class="grid gap-4">
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.name.label") }}
          </span>
          <input
            v-model="cardDraft.name"
            type="text"
            class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.name.placeholder')"
            :disabled="!canEdit"
          />
        </label>

        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.desc.label") }}
          </span>
          <textarea
            v-model="cardDraft.description"
            rows="3"
            class="min-h-[96px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.desc.placeholder')"
            :disabled="!canEdit"
          />
        </label>

        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.prompt.label") }}
          </span>
          <textarea
            v-model="cardDraft.prompt"
            rows="8"
            class="min-h-[180px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.prompt.placeholder')"
            :disabled="!canEdit"
          />
          <span class="text-[11px] text-neutral-400">
            {{ t("persona.prompt.help") }}
          </span>
        </label>
      </div>

      <div v-else-if="editTab === 'behavior'" class="grid gap-4">
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.personality.label") }}
          </span>
          <textarea
            v-model="cardDraft.personality"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.personality.placeholder')"
            :disabled="!canEdit"
          />
        </label>
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.scenario.label") }}
          </span>
          <textarea
            v-model="cardDraft.scenario"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.scenario.placeholder')"
            :disabled="!canEdit"
          />
        </label>
      </div>

      <div v-else class="grid gap-4">
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.systemPrompt.label") }}
          </span>
          <textarea
            v-model="cardDraft.systemPrompt"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.systemPrompt.placeholder')"
            :disabled="!canEdit"
          />
        </label>
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.postHistory.label") }}
          </span>
          <textarea
            v-model="cardDraft.postHistoryInstructions"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.postHistory.placeholder')"
            :disabled="!canEdit"
          />
        </label>
      </div>

      <div class="mt-5 flex flex-wrap justify-between gap-2">
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-sm text-neutral-600 transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
            :disabled="!canSetActive"
            @click="cardDraft && props.onSetActive?.(cardDraft.id)"
          >
            {{ cardDraft.id === activeCardId ? t("persona.active") : t("persona.use") }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 transition hover:text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300"
            :disabled="!canRemove || !cardDraft"
            @click="cardDraft && handleDeleteConfirm(cardDraft)"
          >
            {{ t("persona.delete") }}
          </button>
        </div>
        <button
          type="button"
          class="rounded-xl border border-primary-300 bg-primary-50 px-4 py-2 text-sm text-primary-600 transition hover:text-primary-700 dark:border-primary-500/30 dark:bg-primary-900/40 dark:text-primary-200"
          :disabled="!canEdit"
          @click="handleSave"
        >
          {{ t("persona.save") }}
        </button>
      </div>
      </div>
    </div>
  </teleport>

  <teleport to="body">
    <div v-if="createDialogOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        type="button"
        :aria-label="t('persona.dialog.close')"
        @click="createDialogOpen = false"
      />
      <div class="relative z-10 w-full max-w-3xl rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur-md dark:bg-neutral-900/90 max-h-[90vh] overflow-y-auto">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {{ t("persona.create") }}
            </div>
            <div class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ t("persona.dialog.desc") }}
            </div>
          </div>
          <button
            type="button"
            class="rounded-xl border border-neutral-200 bg-white/70 p-2 text-neutral-500 shadow-sm transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
            @click="createDialogOpen = false"
          >
            <div class="i-solar:close-circle-bold-duotone h-5 w-5" />
          </button>
        </div>

      <div class="mb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm"
            :class="createTab === 'basic'
              ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-300 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'"
            @click="createTab = 'basic'"
          >
            {{ t("persona.tab.basic") }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm"
            :class="createTab === 'behavior'
              ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-300 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'"
            @click="createTab = 'behavior'"
          >
            {{ t("persona.tab.behavior") }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm"
            :class="createTab === 'advanced'
              ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-300 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'"
            @click="createTab = 'advanced'"
          >
            {{ t("persona.tab.advanced") }}
          </button>
        </div>
      </div>

      <div v-if="createTab === 'basic'" class="grid gap-4">
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.name.label") }}
          </span>
          <input
            v-model="newCardDraft.name"
            type="text"
            class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.name.placeholder')"
            :disabled="!canCreate"
          />
        </label>

        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.desc.label") }}
          </span>
          <textarea
            v-model="newCardDraft.description"
            rows="3"
            class="min-h-[96px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.desc.placeholder')"
            :disabled="!canCreate"
          />
        </label>

        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.prompt.label") }}
          </span>
          <textarea
            v-model="newCardDraft.prompt"
            rows="8"
            class="min-h-[180px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.prompt.placeholder')"
            :disabled="!canCreate"
          />
          <span class="text-[11px] text-neutral-400">
            {{ t("persona.prompt.help") }}
          </span>
        </label>
      </div>

      <div v-else-if="createTab === 'behavior'" class="grid gap-4">
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.personality.label") }}
          </span>
          <textarea
            v-model="newCardDraft.personality"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.personality.placeholder')"
            :disabled="!canCreate"
          />
        </label>
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.scenario.label") }}
          </span>
          <textarea
            v-model="newCardDraft.scenario"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.scenario.placeholder')"
            :disabled="!canCreate"
          />
        </label>
      </div>

      <div v-else class="grid gap-4">
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.systemPrompt.label") }}
          </span>
          <textarea
            v-model="newCardDraft.systemPrompt"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.systemPrompt.placeholder')"
            :disabled="!canCreate"
          />
        </label>
        <label class="grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ t("persona.postHistory.label") }}
          </span>
          <textarea
            v-model="newCardDraft.postHistoryInstructions"
            rows="4"
            class="min-h-[120px] rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-700 shadow-sm outline-none transition focus:border-primary-400 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
            :placeholder="t('persona.postHistory.placeholder')"
            :disabled="!canCreate"
          />
        </label>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-sm text-neutral-600 transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          @click="createDialogOpen = false"
        >
          {{ t("common.close") }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-primary-300 bg-primary-50 px-4 py-2 text-sm text-primary-600 transition hover:text-primary-700 disabled:opacity-60 dark:border-primary-500/30 dark:bg-primary-900/40 dark:text-primary-200"
          :disabled="!canCreate"
          @click="handleCreate"
        >
          {{ t("common.add") }}
        </button>
      </div>
      </div>
    </div>
  </teleport>

  <teleport to="body">
    <div v-if="deleteDialogOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        type="button"
        :aria-label="t('persona.dialog.close')"
        @click="deleteDialogOpen = false"
      />
      <div class="relative z-10 w-full max-w-md rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur-md dark:bg-neutral-900/90">
        <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {{ t("persona.deleteConfirm.title") }}
        </div>
        <div class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {{ t("persona.deleteConfirm.desc") }}
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-sm text-neutral-600 transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
            @click="deleteDialogOpen = false"
          >
            {{ t("common.close") }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 transition hover:text-rose-700 disabled:opacity-60 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300"
            :disabled="!canRemove"
            @click="confirmDelete"
          >
            {{ t("persona.delete") }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>
