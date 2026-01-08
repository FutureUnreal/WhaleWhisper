<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { onClickOutside } from "@vueuse/core";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useChatSessionsStore } from "@whalewhisper/app-core/stores/chat-sessions";
import { useUiStore } from "@whalewhisper/app-core/stores/ui";

const uiStore = useUiStore();
const sessionsStore = useChatSessionsStore();
const { sessionsOpen } = storeToRefs(uiStore);
const { orderedSessions, activeSessionId } = storeToRefs(sessionsStore);
const { t } = useI18n();

const containerRef = ref<HTMLDivElement | null>(null);
const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

onClickOutside(containerRef, () => {
  if (sessionsOpen.value) {
    uiStore.closeSessions();
  }
});

const sessions = computed(() => orderedSessions.value);

function handleCreateSession() {
  sessionsStore.createSession();
}

function handleSelectSession(id: string) {
  sessionsStore.setActiveSession(id);
}

function handleDeleteSession(id: string) {
  if (!confirm(t("sessions.deleteConfirm"))) return;
  sessionsStore.deleteSession(id);
}

function formatTimestamp(timestamp: number) {
  if (!timestamp) return "";
  return timestampFormatter.format(new Date(timestamp));
}
</script>

<template>
  <Transition name="session-panel">
    <aside
      v-if="sessionsOpen"
      ref="containerRef"
      class="absolute left-3 top-16 z-[60] w-80 pointer-events-auto"
      border="1 solid neutral-200/70 dark:neutral-800/70"
      bg="white/80 dark:neutral-950/80"
      rounded-xl
      shadow-lg
      backdrop-blur-md
    >
      <div class="flex items-center justify-between px-3 py-3">
        <div class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {{ t("sessions.title") }}
        </div>
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
          bg="neutral-100/70 dark:neutral-800/70"
          @click="handleCreateSession"
        >
          <div i-solar:add-circle-bold-duotone />
          <span>{{ t("sessions.new") }}</span>
        </button>
      </div>
      <div class="max-h-[70dvh] overflow-y-auto px-2 pb-3">
        <div
          v-if="!sessions.length"
          class="rounded-lg border border-dashed border-neutral-200/60 px-3 py-4 text-center text-xs text-neutral-500 dark:border-neutral-800/60 dark:text-neutral-400"
        >
          {{ t("sessions.empty") }}
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="flex items-center gap-2"
          >
            <button
              type="button"
              class="flex h-12 flex-1 flex-col items-start justify-center overflow-hidden rounded-lg px-3 py-2 text-left transition"
              :class="session.id === activeSessionId ? 'bg-primary-500/15 text-primary-700 dark:text-primary-200' : 'bg-neutral-100/70 text-neutral-700 hover:bg-neutral-200/70 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800/80'"
              @click="handleSelectSession(session.id)"
            >
              <div class="w-full truncate text-sm font-medium">
                {{ session.title }}
              </div>
              <div class="w-full truncate text-xs text-neutral-500 dark:text-neutral-400">
                {{ formatTimestamp(session.updatedAt) }}
              </div>
            </button>
            <button
              type="button"
              class="flex items-center justify-center self-stretch aspect-square rounded-lg p-2 text-neutral-500 transition hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400"
              bg="neutral-100/70 dark:neutral-900/60"
              :title="t('sessions.delete')"
              @click="handleDeleteSession(session.id)"
            >
              <div i-solar:trash-bin-trash-bold-duotone />
            </button>
          </div>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.session-panel-enter-active,
.session-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.session-panel-enter-from,
.session-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
