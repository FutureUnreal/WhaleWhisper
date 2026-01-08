import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { appConfig } from "../config";
import type {
  MemoryCandidate,
  MemoryExportPayload,
  MemoryFact,
  MemorySummary,
} from "../services/memory";
import {
  acceptMemoryCandidate,
  deleteMemoryFact,
  deleteMemorySummary,
  exportMemory,
  importMemory,
  listMemoryCandidates,
  listMemoryFacts,
  listMemorySummaries,
  rejectMemoryCandidate,
} from "../services/memory";

export const useMemoryStore = defineStore("memory", () => {
  const userId = appConfig.userId || "default";
  const profileId = appConfig.profileId || "default";

  const facts = ref<MemoryFact[]>([]);
  const candidates = ref<MemoryCandidate[]>([]);
  const summaries = ref<MemorySummary[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const search = ref("");

  const reasonPriority: Record<string, number> = {
    preference: 0,
    goal: 1,
    learning: 1,
    identity: 2,
    role: 2,
    name: 2,
    other: 3,
  };

  const sortedCandidates = computed(() => {
    return [...candidates.value].sort((a, b) => {
      const priorityA = reasonPriority[a.reason] ?? 99;
      const priorityB = reasonPriority[b.reason] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const timeA = a.created_at ?? 0;
      const timeB = b.created_at ?? 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id - a.id;
    });
  });

  const filteredFacts = computed(() => {
    const keyword = search.value.trim().toLowerCase();
    if (!keyword) return facts.value;
    return facts.value.filter(
      (fact) =>
        fact.content.toLowerCase().includes(keyword) ||
        fact.tags.some((tag) => tag.toLowerCase().includes(keyword))
    );
  });

  const filteredSummaries = computed(() => {
    const keyword = search.value.trim().toLowerCase();
    if (!keyword) return summaries.value;
    return summaries.value.filter((summary) =>
      summary.content.toLowerCase().includes(keyword)
    );
  });

  async function refreshAll() {
    isLoading.value = true;
    error.value = null;
    try {
      const [factsList, candidatesList, summariesList] = await Promise.all([
        listMemoryFacts({ userId, profileId, limit: 200 }),
        listMemoryCandidates({ userId, profileId, status: "pending", limit: 100 }),
        listMemorySummaries({ userId, profileId, limit: 200 }),
      ]);
      facts.value = factsList;
      candidates.value = candidatesList;
      summaries.value = summariesList;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load memory.";
    } finally {
      isLoading.value = false;
    }
  }

  async function acceptCandidate(candidateId: number) {
    try {
      const fact = await acceptMemoryCandidate({ candidateId, userId, profileId });
      if (fact) {
        facts.value = [fact, ...facts.value];
      }
      candidates.value = candidates.value.filter((item) => item.id !== candidateId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to accept memory.";
      throw err;
    }
  }

  async function rejectCandidate(candidateId: number) {
    try {
      await rejectMemoryCandidate({ candidateId, userId, profileId });
      candidates.value = candidates.value.filter((item) => item.id !== candidateId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to reject memory.";
      throw err;
    }
  }

  async function removeFact(factId: number) {
    try {
      await deleteMemoryFact({ factId, userId, profileId });
      facts.value = facts.value.filter((item) => item.id !== factId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete memory.";
      throw err;
    }
  }

  async function removeSummary(summaryId: number) {
    try {
      await deleteMemorySummary({ summaryId, userId, profileId });
      summaries.value = summaries.value.filter((item) => item.id !== summaryId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete summary.";
      throw err;
    }
  }

  async function exportData(): Promise<MemoryExportPayload> {
    return await exportMemory({ userId, profileId });
  }

  async function importData(payload: MemoryExportPayload) {
    return await importMemory({ userId, profileId, payload });
  }

  return {
    facts,
    candidates,
    summaries,
    sortedCandidates,
    filteredFacts,
    filteredSummaries,
    search,
    isLoading,
    error,
    refreshAll,
    acceptCandidate,
    rejectCandidate,
    removeFact,
    removeSummary,
    exportData,
    importData,
  };
});
