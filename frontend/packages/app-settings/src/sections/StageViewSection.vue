<script setup lang="ts">
import { computed } from "vue";

import { StageViewSection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";

const { locale } = useI18n();
const localeValue = computed(() => locale.value || "en");
</script>

<template>
  <StageViewSection :locale="localeValue" />
</template>
