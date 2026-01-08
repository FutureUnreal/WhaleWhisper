<script setup lang="ts">
import HeaderLink from "./HeaderLink.vue";
import ActionAbout from "./InteractiveArea/Actions/About.vue";
import LanguageSelect from "./LanguageSelect.vue";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useUiStore } from "@whalewhisper/app-core/stores/ui";

const uiStore = useUiStore();
const { t } = useI18n();
</script>

<template>
  <header mb-1 w-full flex items-start justify-between gap-2>
    <HeaderLink />
    <div flex items-center gap-2>
      <ActionAbout />
      <LanguageSelect />
      <button
        border="2 solid neutral-100/60 dark:neutral-800/30"
        bg="neutral-50/70 dark:neutral-800/70"
        w-fit
        flex
        items-center
        justify-center
        rounded-xl
        p-2
        backdrop-blur-md
        :title="t('header.settings')"
        type="button"
        @click="uiStore.toggleSettings()"
      >
        <div i-solar:settings-minimalistic-bold-duotone size-5 text="neutral-500 dark:neutral-400" />
      </button>
    </div>
  </header>
</template>
