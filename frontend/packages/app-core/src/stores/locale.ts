import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, watch } from "vue";

import { languageOptions, type LanguageId } from "../data/language-options";

export type LocaleId = LanguageId;

export const useLocaleStore = defineStore("locale", () => {
  const locale = useLocalStorage<LocaleId>("whalewhisper/locale", "zh-CN");
  const current = computed(() => {
    return languageOptions.find((option) => option.id === locale.value) ?? languageOptions[0];
  });

  watch(
    locale,
    (value) => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = value;
      }
    },
    { immediate: true }
  );

  return {
    locale,
    current,
  };
});
