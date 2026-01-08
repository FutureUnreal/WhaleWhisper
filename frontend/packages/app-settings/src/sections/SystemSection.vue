<script setup lang="ts">
import { computed } from "vue";

import { SystemSection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { appConfig } from "@whalewhisper/app-core/config";

const { t, locale } = useI18n();
const localeValue = computed(() => locale.value || "en");
</script>

<template>
  <SystemSection
    :locale="localeValue"
    :t="t"
    :user-id="appConfig.userId"
    :profile-id="appConfig.profileId"
    :ws-url="appConfig.wsUrl"
  />
</template>
