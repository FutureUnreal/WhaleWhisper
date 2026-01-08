<script setup lang="ts">
import { computed } from "vue";

import { AppearanceSection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useTheme } from "@whalewhisper/app-core/composables/use-theme";
import { BackgroundDialogPicker } from "../backgrounds";

const { isDark, toggleDark } = useTheme();
const { t, locale } = useI18n();
const localeValue = computed(() => locale.value || "en");
</script>

<template>
  <AppearanceSection
    :locale="localeValue"
    :t="t"
    :is-dark="isDark"
    :on-toggle-theme="toggleDark"
    :background-dialog="BackgroundDialogPicker"
  />
</template>
