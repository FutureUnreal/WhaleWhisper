import { useLocalStorage } from "@vueuse/core";
import { defineStore, storeToRefs } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";

import { requestTts, resolveAudioApiBaseUrl } from "../services/audio";
import { useProvidersStore } from "./providers";
import { useSettingsStore } from "./settings";

type VoiceOption = {
  voiceURI: string;
  name: string;
  lang?: string;
};

export const useSpeechOutputStore = defineStore("speech-output", () => {
  const enabled = useLocalStorage("whalewhisper/audio/tts/enabled", false);
  const voiceId = useLocalStorage("whalewhisper/audio/tts/voice", "");
  const rate = useLocalStorage("whalewhisper/audio/tts/rate", 1);
  const pitch = useLocalStorage("whalewhisper/audio/tts/pitch", 1);
  const volume = useLocalStorage("whalewhisper/audio/tts/volume", 1);
  const streaming = useLocalStorage("whalewhisper/audio/tts/streaming", true);

  const providersStore = useProvidersStore();
  const settingsStore = useSettingsStore();
  const { speechProviderId } = storeToRefs(settingsStore);
  const localVoices = ref<SpeechSynthesisVoice[]>([]);
  const audioApiBaseUrl = computed(() => resolveAudioApiBaseUrl());
  const useBrowserTts = computed(
    () => speechProviderId.value === "browser-local-audio-speech"
  );
  const supported = computed(() => {
    if (typeof window === "undefined") return false;
    if (useBrowserTts.value) {
      return "speechSynthesis" in window;
    }
    return Boolean(audioApiBaseUrl.value);
  });
  const providerMetadata = computed(() =>
    providersStore.getProviderMetadata(speechProviderId.value)
  );
  const providerConfig = computed(() =>
    providersStore.getProviderConfig(speechProviderId.value)
  );
  const remoteVoices = computed<VoiceOption[]>(() => {
    const options = providersStore.getProviderVoices(speechProviderId.value);
    return options.map((option) => ({
      voiceURI: option.id,
      name: option.label,
      lang: option.description,
    }));
  });
  const voices = computed<VoiceOption[]>(() => {
    if (useBrowserTts.value) {
      return localVoices.value.map((voice) => ({
        voiceURI: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
      }));
    }
    return remoteVoices.value;
  });
  const resolvedVoiceId = computed(() => voiceId.value || providerConfig.value?.voice || "");
  const audioElement = ref<HTMLAudioElement | null>(null);
  const lastError = ref<string | null>(null);
  let remoteController: AbortController | null = null;
  let streamController: AbortController | null = null;
  let activeObjectUrl: string | null = null;
  let audioContext: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let activeSources: AudioBufferSourceNode[] = [];
  let scheduledTime = 0;

  function refreshVoices() {
    if (!supported.value) return;
    if (useBrowserTts.value) {
      localVoices.value = window.speechSynthesis.getVoices();
    } else {
      void providersStore.refreshProvider(speechProviderId.value);
    }
  }

  function getSelectedVoice() {
    if (!resolvedVoiceId.value) return undefined;
    return localVoices.value.find((voice) => voice.voiceURI === resolvedVoiceId.value);
  }

  function stopRemotePlayback() {
    if (remoteController) {
      remoteController.abort();
      remoteController = null;
    }
    stopStreamingPlayback();
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value.src = "";
    }
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }
  }

  function ensureAudioElement() {
    if (!audioElement.value && typeof Audio !== "undefined") {
      audioElement.value = new Audio();
    }
    return audioElement.value;
  }

  function clampVolume(value: number) {
    return Math.min(Math.max(value, 0), 1);
  }

  function ensureAudioContext() {
    if (typeof window === "undefined") return null;
    if (!audioContext) {
      const AudioContextCtor =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioContext = new AudioContextCtor();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    }
    return audioContext;
  }

  function stopStreamingPlayback() {
    if (streamController) {
      streamController.abort();
      streamController = null;
    }
    if (activeSources.length > 0) {
      activeSources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Ignore errors when stopping already-finished sources.
        }
      });
      activeSources = [];
    }
    scheduledTime = 0;
  }

  function buildRemoteConfig() {
    const config: Record<string, unknown> = {
      ...(providerConfig.value?.extra ?? {}),
    };
    const isAlibaba = speechProviderId.value === "alibaba-cloud-model-studio-speech";
    if (providerConfig.value?.apiKey) {
      config.apiKey = providerConfig.value.apiKey;
    }
    if (providerConfig.value?.baseUrl) {
      config.baseUrl = providerConfig.value.baseUrl;
    }
    let model = providerConfig.value?.model;
    const voice = resolvedVoiceId.value || providerConfig.value?.voice;
    if (model) {
      if (isAlibaba && !model.includes("/")) {
        model = `alibaba/${model}`;
      }
      config.model = model;
    }
    if (voice) {
      config.voice = voice;
    }
    if (rate.value && rate.value !== 1) {
      if (isAlibaba) {
        config.rate = rate.value;
      } else {
        config.speed = rate.value;
      }
    }
    if (isAlibaba && pitch.value && pitch.value !== 1) {
      config.pitch = pitch.value;
    }
    return config;
  }

  function splitTtsText(text: string) {
    const hardBreaks = new Set([".", "。", "!", "！", "?", "？", "…", "\n"]);
    const softBreaks = new Set([",", "，", ";", "；", ":", "：", "、"]);
    const minChars = 12;
    const maxChars = 80;
    const chunks: string[] = [];
    let buffer = "";
    for (const char of text) {
      buffer += char;
      const isBreak = hardBreaks.has(char) || softBreaks.has(char);
      if (buffer.length >= maxChars || (isBreak && buffer.length >= minChars)) {
        const trimmed = buffer.trim();
        if (trimmed) chunks.push(trimmed);
        buffer = "";
      }
    }
    const trimmed = buffer.trim();
    if (trimmed) chunks.push(trimmed);
    return chunks;
  }

  async function fetchTtsBuffer(text: string, controller: AbortController, ctx: AudioContext) {
    const blob = await requestTts({
      baseUrl: audioApiBaseUrl.value,
      engineId: providerMetadata.value?.engineId,
      text,
      config: buildRemoteConfig(),
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const arrayBuffer = await blob.arrayBuffer();
    if (controller.signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  async function speakRemoteStreaming(text: string, ctx: AudioContext) {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (gainNode) {
      gainNode.gain.value = clampVolume(volume.value);
    }

    const controller = new AbortController();
    streamController = controller;
    const chunks = splitTtsText(text);
    if (chunks.length === 0) return;

    const pending: Array<Promise<AudioBuffer>> = [];
    let index = 0;
    const maxInFlight = 2;
    scheduledTime = ctx.currentTime;

    try {
      while (index < chunks.length || pending.length > 0) {
        while (index < chunks.length && pending.length < maxInFlight) {
          pending.push(fetchTtsBuffer(chunks[index], controller, ctx));
          index += 1;
        }
        const buffer = await pending.shift();
        if (!buffer || controller.signal.aborted) return;
        const startAt = Math.max(ctx.currentTime, scheduledTime);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        if (gainNode) {
          source.connect(gainNode);
        } else {
          source.connect(ctx.destination);
        }
        source.start(startAt);
        scheduledTime = startAt + buffer.duration;
        activeSources.push(source);
        source.onended = () => {
          activeSources = activeSources.filter((item) => item !== source);
        };
      }
    } finally {
      if (streamController === controller) {
        streamController = null;
      }
    }
  }

  async function speak(text: string) {
    lastError.value = null;
    if (!supported.value) {
      lastError.value = "Audio output is not supported or API base URL is not configured.";
      return;
    }
    if (!enabled.value) {
      lastError.value = "Text-to-speech is disabled.";
      return;
    }
    if (!text.trim()) return;

    if (useBrowserTts.value) {
      const utterance = new SpeechSynthesisUtterance(text);
      const selected = getSelectedVoice();
      if (selected) {
        utterance.voice = selected;
      }
      utterance.rate = rate.value;
      utterance.pitch = pitch.value;
      utterance.volume = Math.min(Math.max(volume.value, 0), 1);
      window.speechSynthesis.speak(utterance);
      return;
    }

    stopRemotePlayback();
    if (streaming.value) {
      const ctx = ensureAudioContext();
      if (ctx) {
        try {
          await speakRemoteStreaming(text, ctx);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          lastError.value = error instanceof Error ? error.message : String(error);
          console.warn(
            "TTS playback failed:",
            error instanceof Error ? error.message : error
          );
        }
        return;
      }
    }

    const element = ensureAudioElement();
    if (!element) return;

    const controller = new AbortController();
    remoteController = controller;
    try {
      const blob = await requestTts({
        baseUrl: audioApiBaseUrl.value,
        engineId: providerMetadata.value?.engineId,
        text,
        config: buildRemoteConfig(),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      activeObjectUrl = objectUrl;
      element.src = objectUrl;
      element.volume = clampVolume(volume.value);
      await element.play();
    } catch (error) {
      if (controller.signal.aborted) return;
      lastError.value = error instanceof Error ? error.message : String(error);
      console.warn(
        "TTS playback failed:",
        error instanceof Error ? error.message : error
      );
    } finally {
      remoteController = null;
    }
  }

  function stop() {
    if (!supported.value) return;
    if (useBrowserTts.value) {
      window.speechSynthesis.cancel();
      return;
    }
    stopRemotePlayback();
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      refreshVoices();
    };
    refreshVoices();
  }

  watch(
    () => speechProviderId.value,
    () => {
      refreshVoices();
      stop();
    }
  );

  watch(
    () => voices.value,
    (next) => {
      if (useBrowserTts.value) return;
      const voiceIds = new Set(next.map((voice) => voice.voiceURI));
      if (voiceId.value && voiceIds.has(voiceId.value)) return;
      const configuredVoice = providerConfig.value?.voice;
      if (configuredVoice && voiceIds.has(configuredVoice)) {
        voiceId.value = configuredVoice;
        return;
      }
      if (next.length > 0) {
        voiceId.value = next[0].voiceURI;
      } else {
        voiceId.value = "";
      }
    }
  );

  watch(
    () => volume.value,
    (next) => {
      if (audioElement.value) {
        audioElement.value.volume = clampVolume(next);
      }
      if (gainNode) {
        gainNode.gain.value = clampVolume(next);
      }
    }
  );

  onScopeDispose(() => {
    stop();
  });

  return {
    enabled,
    voiceId,
    rate,
    pitch,
    volume,
    streaming,
    voices,
    supported,
    lastError,
    refreshVoices,
    speak,
    stop,
  };
});
