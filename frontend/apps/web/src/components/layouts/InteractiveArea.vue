<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useChatStore } from "@whalewhisper/app-core/stores/chat";
import { useSettingsStore } from "@whalewhisper/app-core/stores/settings";
import ChatActionButtons from "../widgets/ChatActionButtons.vue";
import ChatArea from "../widgets/ChatArea.vue";
import ChatHistory from "../widgets/ChatHistory.vue";

const { messages, sending, streamingMessage } = storeToRefs(useChatStore());
const { stageDragEnabled } = storeToRefs(useSettingsStore());

const historyMessages = computed(() => messages.value);
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-30 flex flex-col items-end"
    pointer-events-none
  >
    <KeepAlive>
      <Transition name="fade">
        <div class="w-full" :class="stageDragEnabled ? 'pointer-events-none' : 'pointer-events-auto'">
          <div class="ml-auto mr-16 w-full max-w-[680px] translate-y-[8.5rem]">
            <ChatHistory
              v-if="historyMessages.length || streamingMessage"
              :messages="historyMessages"
              :sending="sending"
              :streaming-message="streamingMessage"
              variant="mobile"
              class="chat-history w-full"
            />
          </div>
        </div>
      </Transition>
    </KeepAlive>
    <div class="relative w-full px-4 pb-4 pointer-events-auto">
      <div class="ml-auto flex w-full max-w-[720px] items-end gap-3">
        <div
          class="flex-1 rounded-2xl border border-neutral-200/70 bg-white/50 px-3 py-2 backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-900/50"
        >
          <ChatArea variant="mobile" :submit-on-enter="true" />
        </div>
        <ChatActionButtons layout="col" :floating="false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-history {
  padding: 0 1rem 0.75rem;
  max-height: 45dvh;
  --gradient: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 25%);
  -webkit-mask-image: var(--gradient);
  mask-image: var(--gradient);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: bottom;
  mask-position: bottom;
}
</style>
