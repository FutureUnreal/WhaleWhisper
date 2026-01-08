import { defineStore } from "pinia";
import { ref } from "vue";

import type { PluginDesc } from "../data/plugin-catalog";
import { listPluginCatalog } from "../services/catalogs";

export const usePluginsStore = defineStore("plugins", () => {
  const plugins = ref<PluginDesc[]>([]);
  const isLoading = ref(false);
  const lastError = ref<string | null>(null);

  async function refreshPlugins() {
    isLoading.value = true;
    lastError.value = null;
    try {
      plugins.value = await listPluginCatalog();
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : "Failed to load plugins.";
      plugins.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  return {
    plugins,
    isLoading,
    lastError,
    refreshPlugins,
  };
});
