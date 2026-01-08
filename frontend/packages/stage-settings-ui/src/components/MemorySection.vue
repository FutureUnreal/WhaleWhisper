<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

type MemoryFact = {
  id: number;
  content: string;
  tags?: string[];
  created_at?: number;
};

type MemoryCandidate = {
  id: number;
  content: string;
  reason: string;
  created_at?: number;
};

type MemorySummary = {
  id: number;
  content: string;
  created_at?: number;
};

const props = withDefaults(
  defineProps<{
    locale?: string;
    t?: (key: string) => string;
    facts?: MemoryFact[];
    candidates?: MemoryCandidate[];
    summaries?: MemorySummary[];
    sortedCandidates?: MemoryCandidate[];
    filteredFacts?: MemoryFact[];
    filteredSummaries?: MemorySummary[];
    search?: string;
    isLoading?: boolean;
    error?: string | null;
    autoRefresh?: boolean;
    onRefresh?: () => void | Promise<void>;
    onUpdateSearch?: (value: string) => void;
    onAcceptCandidate?: (id: number) => void | Promise<void>;
    onRejectCandidate?: (id: number) => void | Promise<void>;
    onDeleteFact?: (id: number) => void | Promise<void>;
    onDeleteSummary?: (id: number) => void | Promise<void>;
    onExport?: () => Promise<unknown> | unknown;
    onImport?: (payload: unknown) => Promise<{ facts: number; summaries: number } | void> | void;
  }>(),
  {
    facts: () => [],
    candidates: () => [],
    summaries: () => [],
    autoRefresh: true,
    isLoading: false,
  }
);

const feedback = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const resolvedLocale = computed(() => {
  if (props.locale) return props.locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
});
const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith("zh"));

const fallbackEn = {
  "memory.local.title": "Local Memory",
  "memory.local.description": "Store long-term memory locally for privacy and offline access.",
  "memory.local.storage.label": "Storage",
  "memory.local.storage.value": "SQLite (Local)",
  "memory.local.indexing.label": "Indexing",
  "memory.local.indexing.value": "Local embeddings",
  "memory.manage.title": "Memory management",
  "memory.manage.desc": "Review, delete, or back up saved memories.",
  "memory.manage.search": "Search memories",
  "memory.manage.empty": "No saved memories yet.",
  "memory.manage.delete": "Delete",
  "memory.manage.deleteConfirm": "Delete this memory?",
  "memory.manage.export": "Export",
  "memory.manage.import": "Import",
  "memory.manage.exported": "Memory exported.",
  "memory.manage.exportFailed": "Export failed.",
  "memory.manage.imported": "Imported: {facts} facts, {summaries} summaries.",
  "memory.manage.importFailed": "Import failed.",
  "memory.candidates.title": "Pending memories",
  "memory.candidates.desc": "Potential long-term memories detected by the system.",
  "memory.candidates.empty": "No pending memories.",
  "memory.candidates.accept": "Accept",
  "memory.candidates.reject": "Dismiss",
  "memory.candidates.reason": "Reason:",
  "memory.summaries.title": "Conversation summaries",
  "memory.summaries.desc": "Brief summaries used for recall, for reference only.",
  "memory.summaries.empty": "No summaries yet.",
  "memory.summaries.delete": "Delete",
  "memory.summaries.deleteConfirm": "Delete this summary?",
  "memory.reason.name": "Name",
  "memory.reason.identity": "Identity",
  "memory.reason.role": "Role",
  "memory.reason.preference": "Preference",
  "memory.reason.learning": "Learning",
  "memory.reason.goal": "Goal",
  "common.check": "Check",
  "common.checking": "Checking",
};

const fallbackZh = {
  "memory.local.title": "本地记忆",
  "memory.local.description": "将长期记忆保存在本地，兼顾隐私与离线访问。",
  "memory.local.storage.label": "存储",
  "memory.local.storage.value": "SQLite（本地）",
  "memory.local.indexing.label": "索引",
  "memory.local.indexing.value": "本地向量",
  "memory.manage.title": "记忆管理",
  "memory.manage.desc": "查看、删除或备份已保存的记忆。",
  "memory.manage.search": "搜索记忆",
  "memory.manage.empty": "暂无已保存记忆。",
  "memory.manage.delete": "删除",
  "memory.manage.deleteConfirm": "确定删除这条记忆吗？",
  "memory.manage.export": "导出",
  "memory.manage.import": "导入",
  "memory.manage.exported": "已导出记忆。",
  "memory.manage.exportFailed": "导出失败。",
  "memory.manage.imported": "已导入：事实 {facts}，摘要 {summaries}。",
  "memory.manage.importFailed": "导入失败。",
  "memory.candidates.title": "待确认记忆",
  "memory.candidates.desc": "系统识别到可能有价值的长期记忆。",
  "memory.candidates.empty": "暂无待确认记忆。",
  "memory.candidates.accept": "确认",
  "memory.candidates.reject": "忽略",
  "memory.candidates.reason": "原因：",
  "memory.summaries.title": "对话摘要",
  "memory.summaries.desc": "用于回忆的简要摘要，仅供参考。",
  "memory.summaries.empty": "暂无摘要记录。",
  "memory.summaries.delete": "删除",
  "memory.summaries.deleteConfirm": "确定删除这条摘要吗？",
  "memory.reason.name": "姓名",
  "memory.reason.identity": "身份",
  "memory.reason.role": "职业",
  "memory.reason.preference": "偏好",
  "memory.reason.learning": "学习",
  "memory.reason.goal": "目标",
  "common.check": "检查",
  "common.checking": "检查中",
};

const fallbackText = computed(() => (isZh.value ? fallbackZh : fallbackEn));
const t = (key: string) => {
  if (props.t) {
    const resolved = props.t(key);
    if (resolved && resolved !== key) return resolved;
  }
  return fallbackText.value[key as keyof typeof fallbackEn] ?? key;
};

const candidates = computed(() => props.sortedCandidates ?? props.candidates ?? []);
const facts = computed(() => props.filteredFacts ?? props.facts ?? []);
const summaries = computed(() => props.filteredSummaries ?? props.summaries ?? []);

const reasonLabels = computed(() => ({
  name: t("memory.reason.name"),
  identity: t("memory.reason.identity"),
  role: t("memory.reason.role"),
  preference: t("memory.reason.preference"),
  learning: t("memory.reason.learning"),
  goal: t("memory.reason.goal"),
}));

const canSearch = computed(() => typeof props.onUpdateSearch === "function");
const searchValue = computed({
  get: () => props.search ?? "",
  set: (value: string) => {
    props.onUpdateSearch?.(value);
  },
});

function formatMessage(template: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
    template
  );
}

function formatReason(reason: string) {
  return reasonLabels.value[reason as keyof typeof reasonLabels.value] ?? reason;
}

function formatDate(ts?: number) {
  if (!ts) return "";
  const date = new Date(ts * 1000);
  return date.toLocaleString(resolvedLocale.value);
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
    link.download = "whalewhisper-memory.json";
    link.click();
    URL.revokeObjectURL(url);
    feedback.value = t("memory.manage.exported");
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : t("memory.manage.exportFailed");
  }
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
    const stats = await props.onImport(payload);
    if (stats && typeof stats === "object") {
      const { facts: factsCount = 0, summaries: summariesCount = 0 } = stats as {
        facts?: number;
        summaries?: number;
      };
      feedback.value = formatMessage(t("memory.manage.imported"), {
        facts: factsCount,
        summaries: summariesCount,
      });
    } else {
      feedback.value = t("memory.manage.imported");
    }
    await props.onRefresh?.();
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : t("memory.manage.importFailed");
  } finally {
    target.value = "";
  }
}

async function handleAccept(id: number) {
  await props.onAcceptCandidate?.(id);
}

async function handleReject(id: number) {
  await props.onRejectCandidate?.(id);
}

async function handleDeleteFact(id: number) {
  const confirmed = window.confirm(t("memory.manage.deleteConfirm"));
  if (!confirmed) return;
  await props.onDeleteFact?.(id);
}

async function handleDeleteSummary(id: number) {
  const confirmed = window.confirm(t("memory.summaries.deleteConfirm"));
  if (!confirmed) return;
  await props.onDeleteSummary?.(id);
}

onMounted(() => {
  if (props.autoRefresh) {
    void props.onRefresh?.();
  }
});
</script>

<template>
  <div class="grid gap-4">
    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("memory.local.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("memory.local.description") }}
      </div>
      <div class="mt-4 grid gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <div class="flex items-center justify-between rounded-lg border border-neutral-200/70 bg-white/80 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
          <span>{{ t("memory.local.storage.label") }}</span>
          <span class="font-medium text-neutral-700 dark:text-neutral-200">
            {{ t("memory.local.storage.value") }}
          </span>
        </div>
        <div class="flex items-center justify-between rounded-lg border border-neutral-200/70 bg-white/80 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/60">
          <span>{{ t("memory.local.indexing.label") }}</span>
          <span class="font-medium text-neutral-700 dark:text-neutral-200">
            {{ t("memory.local.indexing.value") }}
          </span>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          :disabled="!props.onExport"
          @click="handleExport"
        >
          {{ t("memory.manage.export") }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          :disabled="!props.onImport"
          @click="triggerImport"
        >
          {{ t("memory.manage.import") }}
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
      <div v-if="props.error" class="mt-2 text-xs text-rose-500">
        {{ props.error }}
      </div>
    </div>

    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("memory.candidates.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("memory.candidates.desc") }}
      </div>
      <div v-if="!candidates.length" class="mt-4 text-xs text-neutral-400">
        {{ t("memory.candidates.empty") }}
      </div>
      <div v-else class="mt-4 grid gap-2">
        <div
          v-for="candidate in candidates"
          :key="candidate.id"
          class="rounded-xl border border-neutral-200/70 bg-white/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                {{ candidate.content }}
              </div>
              <div class="mt-1 text-[11px] text-neutral-400">
                {{ t("memory.candidates.reason") }} {{ formatReason(candidate.reason) }}
                <span v-if="candidate.created_at"> · {{ formatDate(candidate.created_at) }}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-600 transition hover:text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300"
                @click="handleAccept(candidate.id)"
              >
                {{ t("memory.candidates.accept") }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-neutral-200 bg-white/80 px-2 py-1 text-[11px] text-neutral-500 transition hover:text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
                @click="handleReject(candidate.id)"
              >
                {{ t("memory.candidates.reject") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("memory.summaries.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("memory.summaries.desc") }}
      </div>
      <div v-if="!summaries.length" class="mt-4 text-xs text-neutral-400">
        {{ t("memory.summaries.empty") }}
      </div>
      <div v-else class="mt-4 grid gap-2">
        <div
          v-for="summary in summaries"
          :key="summary.id"
          class="rounded-xl border border-neutral-200/70 bg-white/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                {{ summary.content }}
              </div>
              <div class="mt-1 text-[11px] text-neutral-400">
                <span v-if="summary.created_at"> · {{ formatDate(summary.created_at) }}</span>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-neutral-200 bg-white/80 px-2 py-1 text-[11px] text-neutral-500 transition hover:text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
              @click="handleDeleteSummary(summary.id)"
            >
              {{ t("memory.summaries.delete") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-950/60">
      <div class="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t("memory.manage.title") }}
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ t("memory.manage.desc") }}
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <input
          v-model="searchValue"
          type="text"
          class="flex-1 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs text-neutral-600 shadow-sm outline-none transition focus:border-primary-400 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200"
          :placeholder="t('memory.manage.search')"
          :disabled="!canSearch"
        />
        <button
          type="button"
          class="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-xs text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          :disabled="!props.onRefresh"
          @click="props.onRefresh?.()"
        >
          {{ t("common.check") }}
        </button>
        <span v-if="props.isLoading" class="text-xs text-neutral-400">
          {{ t("common.checking") }}
        </span>
      </div>
      <div v-if="!facts.length" class="mt-4 text-xs text-neutral-400">
        {{ t("memory.manage.empty") }}
      </div>
      <div v-else class="mt-4 grid gap-2">
        <div
          v-for="fact in facts"
          :key="fact.id"
          class="rounded-xl border border-neutral-200/70 bg-white/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                {{ fact.content }}
              </div>
              <div class="mt-1 text-[11px] text-neutral-400">
                <span v-if="fact.tags?.length">{{ fact.tags.join(", ") }}</span>
                <span v-if="fact.created_at"> · {{ formatDate(fact.created_at) }}</span>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-neutral-200 bg-white/80 px-2 py-1 text-[11px] text-neutral-500 transition hover:text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
              @click="handleDeleteFact(fact.id)"
            >
              {{ t("memory.manage.delete") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
