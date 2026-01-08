import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";

import { appConfig } from "../config";

export type PersonaCard = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  personality: string;
  scenario: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  createdAt: number;
  isDefault?: boolean;
  isBuiltin?: boolean;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultCard(): PersonaCard {
  return {
    id: "default",
    name: appConfig.persona?.name || "WhaleWhisper",
    description: appConfig.persona?.description || "",
    prompt: appConfig.persona?.prompt || "",
    personality: "",
    scenario: "",
    systemPrompt: "",
    postHistoryInstructions: "",
    createdAt: Date.now(),
    isDefault: true,
    isBuiltin: true,
  };
}

export const usePersonaCardStore = defineStore("persona-cards", () => {
  const cards = useLocalStorage<PersonaCard[]>("whalewhisper/persona/cards", []);
  const activeCardId = useLocalStorage("whalewhisper/persona/active", "default");

  const activeCard = computed(() => {
    return cards.value.find((card) => card.id === activeCardId.value) ?? null;
  });

  const activePrompt = computed(() => {
    const card = activeCard.value;
    if (!card) return "";
    return [card.systemPrompt, card.prompt, card.personality].filter(Boolean).join("\n");
  });

  function normalizeCard(card: PersonaCard): PersonaCard {
    const isDefault = card.id === "default" || card.isDefault === true;
    return {
      ...card,
      name: card.name ?? "",
      description: card.description ?? "",
      prompt: card.prompt ?? "",
      personality: (card as PersonaCard).personality ?? "",
      scenario: (card as PersonaCard).scenario ?? "",
      systemPrompt: (card as PersonaCard).systemPrompt ?? "",
      postHistoryInstructions: (card as PersonaCard).postHistoryInstructions ?? "",
      createdAt: card.createdAt ?? Date.now(),
      isDefault,
      isBuiltin: (card as PersonaCard).isBuiltin ?? false,
    };
  }

  function initialize(defaults?: Partial<PersonaCard>) {
    if (!cards.value.length) {
      cards.value = [
        {
          ...createDefaultCard(),
          ...defaults,
          isDefault: true,
        },
      ];
      activeCardId.value = cards.value[0]?.id || "default";
      return;
    }

    cards.value = cards.value.map((card) => normalizeCard(card));
    if (!cards.value.find((card) => card.id === activeCardId.value)) {
      activeCardId.value = cards.value[0]?.id || "default";
    }

    if (defaults) {
      updateDefaultCard(defaults);
    }
  }

  function addCard(payload: Omit<PersonaCard, "id" | "createdAt">) {
    const card: PersonaCard = {
      id: createId(),
      createdAt: Date.now(),
      isDefault: false,
      ...payload,
    };
    cards.value = [card, ...cards.value];
    return card.id;
  }

  function addBuiltinCard(payload: Omit<PersonaCard, "createdAt">) {
    const existing = cards.value.find((card) => card.id === payload.id);
    if (existing) return existing.id;
    const card: PersonaCard = {
      ...payload,
      createdAt: Date.now(),
      isBuiltin: payload.isBuiltin ?? true,
    };
    cards.value = [...cards.value, card];
    return card.id;
  }

  function updateCard(
    id: string,
    payload: Partial<PersonaCard>,
    options: { preserveDefault?: boolean } = {}
  ) {
    cards.value = cards.value.map((card) => {
      if (card.id !== id) return card;
      const isDefaultCard = card.id === "default" || card.isDefault === true;
      return {
        ...card,
        ...payload,
        isDefault: options.preserveDefault ? card.isDefault : isDefaultCard,
      };
    });
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter((card) => card.id !== id);
    if (activeCardId.value === id) {
      activeCardId.value = cards.value[0]?.id || "default";
    }
  }

  function setActive(id: string) {
    if (cards.value.find((card) => card.id === id)) {
      activeCardId.value = id;
    }
  }

  function updateDefaultCard(defaults: Partial<PersonaCard>) {
    const defaultCard = cards.value.find((card) => card.id === "default");
    if (!defaultCard) {
      return;
    }
    updateCard("default", defaults, { preserveDefault: true });
  }

  return {
    cards,
    activeCardId,
    activeCard,
    activePrompt,
    initialize,
    addCard,
    updateCard,
    removeCard,
    setActive,
    updateDefaultCard,
    addBuiltinCard,
  };
});
