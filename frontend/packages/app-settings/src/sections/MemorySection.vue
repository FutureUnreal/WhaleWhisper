<script setup lang="ts">
import { computed } from "vue";

import { MemorySection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useMemoryStore } from "@whalewhisper/app-core/stores/memory";

const memoryStore = useMemoryStore();
const { t, locale } = useI18n();
const localeValue = computed(() => locale.value || "en");
</script>

<template>
  <MemorySection
    :locale="localeValue"
    :t="t"
    :facts="memoryStore.facts"
    :candidates="memoryStore.candidates"
    :summaries="memoryStore.summaries"
    :sorted-candidates="memoryStore.sortedCandidates"
    :filtered-facts="memoryStore.filteredFacts"
    :filtered-summaries="memoryStore.filteredSummaries"
    :search="memoryStore.search"
    :is-loading="memoryStore.isLoading"
    :error="memoryStore.error"
    :on-refresh="memoryStore.refreshAll"
    :on-update-search="(value) => (memoryStore.search = value)"
    :on-accept-candidate="memoryStore.acceptCandidate"
    :on-reject-candidate="memoryStore.rejectCandidate"
    :on-delete-fact="memoryStore.removeFact"
    :on-delete-summary="memoryStore.removeSummary"
    :on-export="memoryStore.exportData"
    :on-import="memoryStore.importData"
  />
</template>
