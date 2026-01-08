import type { PersonaCard } from "../stores/persona-cards";

export type PersonaExportPayload = {
  format: "whalewhisper-persona-v1";
  active?: string;
  cards: Array<{
    id?: string;
    name: string;
    description: string;
    prompt: string;
    personality?: string;
    scenario?: string;
    systemPrompt?: string;
    postHistoryInstructions?: string;
    createdAt?: number;
  }>;
};

export function isWhaleWhisperExport(payload: any): payload is PersonaExportPayload {
  return payload && payload.format === "whalewhisper-persona-v1" && Array.isArray(payload.cards);
}

export function toWhaleWhisperExport(cards: PersonaCard[], activeId: string | null) {
  return {
    format: "whalewhisper-persona-v1",
    active: activeId ?? undefined,
    cards: cards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      prompt: card.prompt,
      personality: card.personality,
      scenario: card.scenario,
      systemPrompt: card.systemPrompt,
      postHistoryInstructions: card.postHistoryInstructions,
      createdAt: card.createdAt,
    })),
  } satisfies PersonaExportPayload;
}

export function fromWhaleWhisperExport(
  payload: PersonaExportPayload,
  createCard: (payload: Omit<PersonaCard, "id" | "createdAt">) => string,
  setActive: (id: string) => void
) {
  let activeId: string | null = null;
  const importedIds: string[] = [];
  payload.cards.forEach((card) => {
    const id = createCard({
      name: card.name ?? "",
      description: card.description ?? "",
      prompt: card.prompt ?? "",
      personality: card.personality ?? "",
      scenario: card.scenario ?? "",
      systemPrompt: card.systemPrompt ?? "",
      postHistoryInstructions: card.postHistoryInstructions ?? "",
    });
    importedIds.push(id);
    if (card.id && payload.active && card.id === payload.active) {
      activeId = id;
    }
  });
  if (activeId) {
    setActive(activeId);
    return;
  }
  if (importedIds.length === 1) {
    setActive(importedIds[0]);
  }
}
