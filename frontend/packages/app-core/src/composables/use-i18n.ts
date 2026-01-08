import { storeToRefs } from "pinia";

import { messages } from "../i18n/messages";
import { useLocaleStore } from "../stores/locale";

export function useI18n() {
  const localeStore = useLocaleStore();
  const { locale } = storeToRefs(localeStore);

  function t(key: string, fallback?: string) {
    const table = messages[locale.value] ?? messages.en;
    return table[key] ?? messages.en[key] ?? fallback ?? key;
  }

  return {
    t,
    locale,
  };
}
