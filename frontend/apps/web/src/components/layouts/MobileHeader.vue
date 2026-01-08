<script setup lang="ts">
import MobileHeaderLink from "./MobileHeaderLink.vue";
import LanguageSelect from "./LanguageSelect.vue";
</script>

<template>
  <header mb-1 w-full relative>
    <div w-full flex justify-center>
      <MobileHeaderLink />
    </div>
    <div class="absolute right-2 top-0">
      <LanguageSelect size-class="w-24" list-class="max-h-[180px]" item-class="min-h-[48px]" />
    </div>
  </header>
</template>
