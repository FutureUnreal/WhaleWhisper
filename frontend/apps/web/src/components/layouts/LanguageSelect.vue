<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { languageOptions } from "@whalewhisper/app-core/data/language-options";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useLocaleStore } from "@whalewhisper/app-core/stores/locale";
import SelectMenu from "../ui/SelectMenu.vue";

const props = withDefaults(
  defineProps<{
    sizeClass?: string;
    listClass?: string;
    itemClass?: string;
  }>(),
  {
    sizeClass: "w-28",
    listClass: "max-h-[180px]",
    itemClass: "min-h-[48px]",
  }
);

const localeStore = useLocaleStore();
const { locale } = storeToRefs(localeStore);
const { t } = useI18n();

const placeholder = computed(() => t("language.placeholder", "Language"));
</script>

<template>
  <div :class="props.sizeClass">
    <SelectMenu
      v-model="locale"
      :options="languageOptions"
      :placeholder="placeholder"
      :list-class="props.listClass"
      :item-class="props.itemClass"
    />
  </div>
</template>
