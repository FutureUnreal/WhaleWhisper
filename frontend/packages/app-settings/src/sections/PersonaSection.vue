<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { PersonaSection } from "@whalewhisper/stage-settings-ui";
import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { appConfig } from "@whalewhisper/app-core/config";
import { usePersonaCardStore, type PersonaCard } from "@whalewhisper/app-core/stores/persona-cards";
import {
  fromWhaleWhisperExport,
  isWhaleWhisperExport,
  toWhaleWhisperExport,
} from "@whalewhisper/app-core/utils/persona-card";

const personaStore = usePersonaCardStore();
const { cards, activeCardId } = storeToRefs(personaStore);
const { t, locale } = useI18n();
const localeValue = computed(() => locale.value || "en");

function initialize() {
  personaStore.initialize();
  const defaultCard = cards.value.find((card) => card.id === "default");
  if (defaultCard && !defaultCard.name) {
    personaStore.updateDefaultCard({
      name: appConfig.persona?.name ?? "小鲸鱼",
      description: appConfig.persona?.description ?? "",
      prompt: appConfig.persona?.prompt ?? "",
    });
  }
  cards.value
    .filter((card) => card.id !== "default")
    .forEach((card) => personaStore.removeCard(card.id));
}

function addCard(payload: Omit<PersonaCard, "id" | "createdAt" | "isDefault">) {
  return personaStore.addCard(payload);
}

function updateCard(id: string, payload: Omit<PersonaCard, "id" | "createdAt" | "isDefault">) {
  personaStore.updateCard(id, payload);
}

function removeCard(id: string) {
  personaStore.removeCard(id);
}

function setActive(id: string) {
  personaStore.setActive(id);
}

function handleExport() {
  return toWhaleWhisperExport(cards.value, activeCardId.value);
}

function handleImport(payload: unknown) {
  if (isWhaleWhisperExport(payload)) {
    fromWhaleWhisperExport(payload, personaStore.addCard, personaStore.setActive);
    return { ok: true };
  }
  return { ok: false };
}
</script>

<template>
  <PersonaSection
    :locale="localeValue"
    :t="t"
    :cards="cards"
    :active-card-id="activeCardId"
    :on-initialize="initialize"
    :on-add-card="addCard"
    :on-update-card="updateCard"
    :on-remove-card="removeCard"
    :on-set-active="setActive"
    :on-export="handleExport"
    :on-import="handleImport"
  />
</template>
