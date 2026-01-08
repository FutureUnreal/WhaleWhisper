<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import { useChatStore } from "@whalewhisper/app-core/stores/chat";
import DesktopChatOverlay from "./components/DesktopChatOverlay.vue";
import { closeChatWindow, emitDesktopActionToken } from "./services/desktop";

const fillStyle = {
  left: "0px",
  top: "0px",
  width: "100%",
  height: "100%",
};
const chatStore = useChatStore();
let disposeSpecialToken: null | (() => void) = null;

async function handleClose() {
  await closeChatWindow();
}

onMounted(() => {
  disposeSpecialToken = chatStore.onTokenSpecial(async (special) => {
    await emitDesktopActionToken(special);
  });
});

onUnmounted(() => {
  disposeSpecialToken?.();
});
</script>

<template>
  <div class="relative h-full w-full" :style="{ width: '100%', height: '100%' }">
    <DesktopChatOverlay
      :visible="true"
      :position-style="fillStyle"
      @close="handleClose"
    />
  </div>
</template>
