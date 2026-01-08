<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { useScreenSafeArea } from "@vueuse/core";

import { useI18n } from "@whalewhisper/app-core/composables/use-i18n";
import { useChatStore } from "@whalewhisper/app-core/stores/chat";
import { useTheme } from "@whalewhisper/app-core/composables/use-theme";
import { useUiStore } from "@whalewhisper/app-core/stores/ui";
import { useSettingsStore } from "@whalewhisper/app-core/stores/settings";
import ChatArea from "../widgets/ChatArea.vue";
import ChatHistory from "../widgets/ChatHistory.vue";
import { BackgroundDialogPicker } from "@whalewhisper/app-settings/backgrounds";
import ActionViewControls from "./InteractiveArea/Actions/ViewControls.vue";
import ViewControlInputs from "./ViewControls/Inputs.vue";

const chatStore = useChatStore();
const { messages, sending, streamingMessage } = storeToRefs(chatStore);

const { isDark, toggleDark } = useTheme();
const uiStore = useUiStore();
const settingsStore = useSettingsStore();
const { stageViewControlsEnabled, stageDragEnabled } = storeToRefs(settingsStore);
const viewControlsActiveMode = ref<"x" | "y" | "z" | "scale">("scale");
const viewControlsInputsRef = ref<InstanceType<typeof ViewControlInputs> | null>(null);
const backgroundDialogOpen = ref(false);
const screenSafeArea = useScreenSafeArea();
const { t } = useI18n();
const dragTitle = computed(() =>
  stageDragEnabled.value
    ? `${t("action.drag")} · ${t("common.enabled")}`
    : `${t("action.drag")} · ${t("common.disabled")}`
);

const emit = defineEmits<{
  (e: "settings-open", open: boolean): void;
}>();

watch(backgroundDialogOpen, (open) => {
  emit("settings-open", open);
});
</script>

<template>
  <div fixed bottom-0 w-full flex flex-col>
    <BackgroundDialogPicker v-model="backgroundDialogOpen" />
    <KeepAlive>
      <Transition name="fade">
        <ChatHistory
          v-if="!stageViewControlsEnabled"
          variant="mobile"
          :messages="messages"
          :sending="sending"
          :streaming-message="streamingMessage"
          max-w="[calc(100%-3.5rem)]"
          w-full
          self-start
          pb-3
          pl-3
          class="chat-history"
          :class="[
            'relative z-20',
          ]"
        />
      </Transition>
    </KeepAlive>
    <div relative w-full self-end>
      <div translate-y="[-100%]" absolute right-0 w-full px-3 pb-3 font-sans>
        <div flex="~ col" w-full gap-1>
          <div class="flex justify-end pr-1">
            <ViewControlInputs ref="viewControlsInputsRef" :mode="viewControlsActiveMode" />
          </div>
          <button
            border="2 solid neutral-100/60 dark:neutral-800/30"
            bg="neutral-50/70 dark:neutral-800/70"
            w-fit
            flex
            items-center
            self-end
            justify-center
            rounded-xl
            p-2
            backdrop-blur-md
            :title="t('action.theme')"
            @click="toggleDark()"
          >
            <Transition name="fade" mode="out-in">
              <div v-if="isDark" i-solar:moon-outline size-5 text="neutral-500 dark:neutral-400" />
              <div v-else i-solar:sun-2-outline size-5 text="neutral-500 dark:neutral-400" />
            </Transition>
          </button>
          <button
            border="2 solid neutral-100/60 dark:neutral-800/30"
            bg="neutral-50/70 dark:neutral-800/70"
            w-fit
            flex
            items-center
            self-end
            justify-center
            rounded-xl
            p-2
            backdrop-blur-md
            :title="t('action.background')"
            @click="backgroundDialogOpen = true"
          >
            <div i-solar:gallery-wide-bold-duotone size-5 text="neutral-500 dark:neutral-400" />
          </button>
          <ActionViewControls
            v-model="viewControlsActiveMode"
            @reset="() => viewControlsInputsRef?.resetOnMode()"
          />
          <button
            border="2 solid neutral-100/60 dark:neutral-800/30"
            bg="neutral-50/70 dark:neutral-800/70"
            w-fit
            flex
            items-center
            self-end
            justify-center
            rounded-xl
            p-2
            backdrop-blur-md
            :title="dragTitle"
            :class="stageDragEnabled ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
            @click="stageDragEnabled = !stageDragEnabled"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.6"
              aria-hidden="true"
            >
              <path
                d="M12 18.5a3.5 3.5 0 01-3.5-3.5V6a1.5 1.5 0 013 0v6m0-6a1.5 1.5 0 013 0v8m0-8a1.5 1.5 0 013 0v8m0-7a1.5 1.5 0 013 0v6.5a6.5 6.5 0 11-13 0V8.5"
              />
            </svg>
          </button>
          <button
            border="2 solid neutral-100/60 dark:neutral-800/30"
            bg="neutral-50/70 dark:neutral-800/70"
            w-fit
            flex
            items-center
            self-end
            justify-center
            rounded-xl
            p-2
            backdrop-blur-md
            :title="t('action.settings')"
            @click="uiStore.openSettings()"
          >
            <div i-solar:settings-outline size-5 text="neutral-500 dark:neutral-400" />
          </button>
          <button
            border="2 solid neutral-100/60 dark:neutral-800/30"
            bg="neutral-50/70 dark:neutral-800/70"
            w-fit
            flex
            items-center
            self-end
            justify-center
            rounded-xl
            p-2
            backdrop-blur-md
            :title="t('sessions.toggle')"
            @click="uiStore.toggleSessions()"
          >
            <div class="i-solar:chat-round-line-bold" />
          </button>
        </div>
      </div>
      <div
        bg="white/40 dark:neutral-900/50"
        max-h-[100dvh]
        max-w-[100dvw]
        w-full
        flex
        gap-1
        overflow-auto
        px-3
        pt-2
        backdrop-blur-md
        :style="{ paddingBottom: `${Math.max(Number.parseFloat(screenSafeArea.bottom.value.replace('px', '')), 12)}px` }"
      >
        <ChatArea variant="mobile" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes scan {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-scan {
  animation: scan 2s infinite linear;
}

.chat-history {
  --gradient: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%);
  -webkit-mask-image: var(--gradient);
  mask-image: var(--gradient);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: bottom;
  mask-position: bottom;
  max-height: 35dvh;
}
</style>
