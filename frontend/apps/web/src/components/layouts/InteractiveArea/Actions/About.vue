<script setup lang="ts">
import { ref } from "vue";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";

const show = ref(false);
const { t } = useI18n();
</script>

<template>
  <button
    border="2 solid neutral-100/60 dark:neutral-800/30"
    bg="neutral-50/70 dark:neutral-800/70"
    w-fit
    flex
    items-center
    self-end
    justify-center
    rounded-xl
    p-2
    backdrop-blur-md
    :title="t('about.buttonTitle')"
    @click="show = true"
  >
    <div i-solar:info-circle-outline size-5 text="neutral-500 dark:neutral-400" />
  </button>

  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      class="absolute inset-0 bg-black/40 backdrop-blur-sm"
      type="button"
      :aria-label="t('aria.closeAboutDialog')"
      @click="show = false"
    />
    <div class="relative z-10 w-full max-w-md rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur-md dark:bg-neutral-900/90">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">WhaleWhisper</div>
        <button
          type="button"
          class="rounded-xl border border-neutral-200 bg-white/70 p-2 text-neutral-500 shadow-sm transition hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300"
          @click="show = false"
        >
          <div class="i-solar:close-circle-bold-duotone h-5 w-5" />
        </button>
      </div>
      <p class="text-sm text-neutral-600 dark:text-neutral-300">
        {{ t("about.description") }}
      </p>
    </div>
  </div>
</template>
