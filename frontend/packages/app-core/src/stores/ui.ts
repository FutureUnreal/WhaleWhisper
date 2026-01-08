import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const settingsOpen = ref(false);
  const sessionsOpen = ref(false);

  function openSettings() {
    settingsOpen.value = true;
  }

  function closeSettings() {
    settingsOpen.value = false;
  }

  function toggleSettings() {
    settingsOpen.value = !settingsOpen.value;
  }

  function openSessions() {
    sessionsOpen.value = true;
  }

  function closeSessions() {
    sessionsOpen.value = false;
  }

  function toggleSessions() {
    sessionsOpen.value = !sessionsOpen.value;
  }

  return {
    settingsOpen,
    sessionsOpen,
    openSettings,
    closeSettings,
    toggleSettings,
    openSessions,
    closeSessions,
    toggleSessions,
  };
});
