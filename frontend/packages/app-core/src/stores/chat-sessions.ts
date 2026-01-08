import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";

import { useI18n } from "../composables/use-i18n";
import type { ChatHistoryItem, ChatSession } from "../types/chat";

const LEGACY_MESSAGES_KEY = "whalewhisper/chat/messages";
const SESSIONS_KEY = "whalewhisper/chat/sessions";
const ACTIVE_SESSION_KEY = "whalewhisper/chat/active-session";

type SessionSeed = {
  id?: string;
  sessionId?: string;
  title?: string;
  messages?: ChatHistoryItem[];
};

export const useChatSessionsStore = defineStore("chat-sessions", () => {
  const { t } = useI18n();
  const legacyMessages = useLocalStorage<ChatHistoryItem[]>(LEGACY_MESSAGES_KEY, []);
  const sessions = useLocalStorage<ChatSession[]>(SESSIONS_KEY, []);
  const activeSessionId = useLocalStorage<string | null>(ACTIVE_SESSION_KEY, null);

  const activeSession = computed(() => {
    const currentId = activeSessionId.value;
    if (!currentId) return null;
    return sessions.value.find((session) => session.id === currentId) ?? null;
  });

  const orderedSessions = computed(() =>
    [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
  );

  function ensureActiveSession() {
    if (!sessions.value.length) {
      const migrated = migrateLegacy();
      if (migrated) {
        return migrated;
      }
      const fresh = buildSession();
      sessions.value = [fresh];
      activeSessionId.value = fresh.id;
      return fresh;
    }
    if (!activeSession.value) {
      activeSessionId.value = sessions.value[0]?.id ?? null;
    }
    return activeSession.value ?? null;
  }

  function migrateLegacy() {
    if (!legacyMessages.value.length) return null;
    const derivedTitle = deriveTitleFromMessages(legacyMessages.value);
    const session = buildSession({ title: derivedTitle, messages: legacyMessages.value });
    sessions.value = [session];
    activeSessionId.value = session.id;
    legacyMessages.value = [];
    return session;
  }

  function buildSession(seed: SessionSeed = {}): ChatSession {
    const now = Date.now();
    const messages = seed.messages ?? [];
    const createdAt = resolveCreatedAt(messages) ?? now;
    const updatedAt = resolveUpdatedAt(messages) ?? now;
    return {
      id: seed.id ?? createId(),
      sessionId: seed.sessionId ?? createSessionId(),
      title: seed.title ?? t("sessions.default"),
      createdAt,
      updatedAt,
      messages,
      agentConversationIds: {},
    };
  }

  function createSession(title?: string) {
    const session = buildSession({ title });
    sessions.value = [session, ...sessions.value];
    activeSessionId.value = session.id;
    return session;
  }

  function setActiveSession(id: string) {
    if (!id) return;
    if (!sessions.value.find((session) => session.id === id)) return;
    activeSessionId.value = id;
  }

  function deleteSession(id: string) {
    if (!id) return;
    sessions.value = sessions.value.filter((session) => session.id !== id);
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0]?.id ?? null;
    }
  }

  function renameSession(id: string, title: string) {
    const session = sessions.value.find((item) => item.id === id);
    if (!session) return;
    session.title = title;
    session.updatedAt = Date.now();
    sessions.value = [...sessions.value];
  }

  function appendMessage(message: ChatHistoryItem) {
    const session = ensureActiveSession();
    if (!session) return;
    const hasUserMessage = session.messages.some((item) => item.role === "user");
    session.messages = [...session.messages, message];
    session.updatedAt = Date.now();
    if (!hasUserMessage && message.role === "user") {
      const title = deriveTitleFromMessage(message);
      if (title) {
        session.title = title;
      }
    }
    sessions.value = [...sessions.value];
  }

  function replaceActiveMessages(messages: ChatHistoryItem[]) {
    const session = ensureActiveSession();
    if (!session) return;
    session.messages = [...messages];
    session.updatedAt = Date.now();
    sessions.value = [...sessions.value];
  }

  function clearActiveMessages(resetTitle = false) {
    const session = ensureActiveSession();
    if (!session) return;
    session.messages = [];
    session.updatedAt = Date.now();
    if (resetTitle) {
      session.title = t("sessions.default");
    }
    sessions.value = [...sessions.value];
  }

  function getAgentConversationId(engineId: string) {
    if (!engineId) return undefined;
    const session = ensureActiveSession();
    return session?.agentConversationIds?.[engineId];
  }

  function setAgentConversationId(engineId: string, conversationId: string) {
    if (!engineId || !conversationId) return;
    const session = ensureActiveSession();
    if (!session) return;
    if (!session.agentConversationIds) {
      session.agentConversationIds = {};
    }
    session.agentConversationIds[engineId] = conversationId;
    session.updatedAt = Date.now();
    sessions.value = [...sessions.value];
  }

  function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createSessionId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return createId();
  }

  function resolveCreatedAt(messages: ChatHistoryItem[]) {
    if (!messages.length) return undefined;
    const first = messages[0];
    return typeof first?.createdAt === "number" ? first.createdAt : undefined;
  }

  function resolveUpdatedAt(messages: ChatHistoryItem[]) {
    if (!messages.length) return undefined;
    const last = messages[messages.length - 1];
    if (typeof last?.createdAt === "number") {
      return last.createdAt;
    }
    return undefined;
  }

  function deriveTitleFromMessages(messages: ChatHistoryItem[]) {
    const firstUser = messages.find((item) => item.role === "user");
    return firstUser ? deriveTitleFromMessage(firstUser) : t("sessions.default");
  }

  function deriveTitleFromMessage(message: ChatHistoryItem) {
    if (message.role !== "user") return "";
    const text = extractText(message.content);
    if (!text) return "";
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    return normalized.length > 40 ? `${normalized.slice(0, 40)}...` : normalized;
  }

  function extractText(content: ChatHistoryItem["content"]) {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";
    return content.map((part) => part.text).join("");
  }

  ensureActiveSession();

  return {
    sessions,
    orderedSessions,
    activeSession,
    activeSessionId,
    ensureActiveSession,
    createSession,
    setActiveSession,
    deleteSession,
    renameSession,
    appendMessage,
    replaceActiveMessages,
    clearActiveMessages,
    getAgentConversationId,
    setAgentConversationId,
  };
});
