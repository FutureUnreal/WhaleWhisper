import { useLocalStorage } from "@vueuse/core";
import { getDefaultRealTimeVADOptions, MicVAD } from "@ricky0123/vad-web";
import type { RealTimeVADOptions } from "@ricky0123/vad-web";
import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";

export type MicPermission = "unknown" | "granted" | "denied";

type VadConfig = Partial<RealTimeVADOptions>;

type VadState = {
  active: boolean;
  speaking: boolean;
};

export const useHearingStore = defineStore("hearing", () => {
  const enabled = useLocalStorage("whalewhisper/audio/input/enabled", false);
  const selectedDeviceId = useLocalStorage("whalewhisper/audio/input/device", "");
  const speechThreshold = useLocalStorage("whalewhisper/audio/input/threshold", 30);

  const audioInputs = ref<MediaDeviceInfo[]>([]);
  const permission = ref<MicPermission>("unknown");
  const volumeLevel = ref(0);
  const error = ref<string | null>(null);
  const monitoring = useLocalStorage("whalewhisper/audio/input/monitoring", true);
  const streaming = ref(false);
  const vadState = ref<VadState>({ active: false, speaking: false });

  let stream: MediaStream | null = null;
  let streamDeviceId: string | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let monitorGain: GainNode | null = null;
  let rafId: number | null = null;
  let starting = false;
  let monitorConnected = false;
  let permissionStatus: PermissionStatus | null = null;
  let micVad: MicVAD | null = null;
  let lastVadOptions: VadConfig | null = null;
  let deviceChangeHandler: (() => void) | null = null;

  const hasDevices = computed(() => audioInputs.value.length > 0);
  const isSpeaking = computed(() => volumeLevel.value >= speechThreshold.value);
  const speechDetected = computed(() =>
    vadState.value.active ? vadState.value.speaking : isSpeaking.value
  );

  function normalizePermission(state: PermissionState | "prompt") {
    if (state === "granted") return "granted";
    if (state === "denied") return "denied";
    return "unknown";
  }

  function updatePermission(state: PermissionState | "prompt") {
    permission.value = normalizePermission(state);
  }

  async function refreshPermission() {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      permissionStatus = status;
      updatePermission(status.state);
      status.onchange = () => updatePermission(status.state);
    } catch {
      // ignore permission API errors
    }
  }

  function resolveFallbackDeviceId(devices: MediaDeviceInfo[]) {
    if (!devices.length) return "";
    const defaultDevice = devices.find((device) => device.deviceId === "default");
    return defaultDevice?.deviceId ?? devices[0].deviceId;
  }

  function ensureSelectedDevice(devices: MediaDeviceInfo[]) {
    if (!devices.length) {
      if (selectedDeviceId.value) {
        selectedDeviceId.value = "";
      }
      return;
    }

    if (selectedDeviceId.value) {
      const exists = devices.some((device) => device.deviceId === selectedDeviceId.value);
      if (exists) return;
    }

    const nextDeviceId = resolveFallbackDeviceId(devices);
    if (nextDeviceId && selectedDeviceId.value !== nextDeviceId) {
      selectedDeviceId.value = nextDeviceId;
    }
  }

  async function refreshDevices() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    audioInputs.value = devices.filter((device) => device.kind === "audioinput");
    ensureSelectedDevice(audioInputs.value);
  }

  function stopAnalyser() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function stopStream() {
    stopAnalyser();
    volumeLevel.value = 0;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    streamDeviceId = null;
    streaming.value = false;

    if (audioContext) {
      void audioContext.close();
      audioContext = null;
    }

    analyser = null;
    monitorGain = null;
    monitorConnected = false;
  }

  function applyMonitoring() {
    if (!monitorGain || !audioContext) return;
    if (monitoring.value) {
      if (!monitorConnected) {
        monitorGain.connect(audioContext.destination);
        monitorConnected = true;
      }
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }
      monitorGain.gain.value = 1;
      return;
    }
    monitorGain.gain.setValueAtTime(0, audioContext.currentTime);
    if (monitorConnected) {
      try {
        monitorGain.disconnect();
      } catch {
        // ignore disconnect errors
      }
      monitorConnected = false;
    }
  }

  function setMonitoring(enabledValue: boolean) {
    monitoring.value = enabledValue;
    applyMonitoring();
  }

  function updateVolume() {
    if (!analyser) return;

    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const normalized = (buffer[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / buffer.length);
    volumeLevel.value = Math.min(100, Math.round(rms * 160));

    rafId = requestAnimationFrame(updateVolume);
  }

  function resolveDeviceConstraints() {
    if (selectedDeviceId.value && selectedDeviceId.value !== "default") {
      return {
        deviceId: { exact: selectedDeviceId.value },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
    }

    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  async function startStream(force = false) {
    error.value = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = "Microphone is not supported in this browser.";
      permission.value = "denied";
      enabled.value = false;
      return;
    }

    await refreshPermission();
    await refreshDevices();

    const nextDeviceId = selectedDeviceId.value || "";
    if (!force && streaming.value && stream && streamDeviceId === nextDeviceId) {
      applyMonitoring();
      return;
    }

    stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        audio: resolveDeviceConstraints(),
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      permission.value = "granted";
      streaming.value = true;
      const trackSettings = stream.getAudioTracks()[0]?.getSettings();
      streamDeviceId = trackSettings?.deviceId ?? nextDeviceId ?? null;

      audioContext = new AudioContext({ latencyHint: "interactive" });
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      monitorGain = audioContext.createGain();
      monitorGain.gain.value = 0;
      source.connect(monitorGain);
      applyMonitoring();
      updateVolume();

      if (micVad && lastVadOptions) {
        await restartSpeechDetection(lastVadOptions);
      }
    } catch (err) {
      permission.value = "denied";
      error.value = err instanceof Error ? err.message : "Failed to access microphone.";
      enabled.value = false;
    }
  }

  async function start() {
    if (starting) return;
    starting = true;
    await startStream();
    starting = false;
  }

  function stop() {
    stopStream();
  }

  function getStream() {
    return stream;
  }

  async function createMicVad(options: VadConfig) {
    if (!stream) return null;
    if (micVad) {
      micVad.destroy();
      micVad = null;
    }

    const defaults = {
      ...getDefaultRealTimeVADOptions("v5"),
      preSpeechPadMs: 30,
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      minSpeechMs: 30,
    } satisfies Partial<RealTimeVADOptions>;

    micVad = await MicVAD.new({
      ...defaults,
      ...options,
      getStream: async () => stream!,
      onSpeechStart: () => {
        vadState.value = { active: true, speaking: true };
      },
      onSpeechEnd: () => {
        vadState.value = { active: true, speaking: false };
      },
      onVADMisfire: () => {
        vadState.value = { active: true, speaking: false };
      },
    });

    micVad.start();
    return micVad;
  }

  async function startSpeechDetection(options: VadConfig = {}) {
    lastVadOptions = options;
    vadState.value = { active: true, speaking: false };
    if (!enabled.value) {
      enabled.value = true;
    }
    await start();
    if (!stream) {
      vadState.value = { active: false, speaking: false };
      throw new Error("Microphone stream is not available.");
    }
    const created = await createMicVad(options);
    if (!created) {
      vadState.value = { active: false, speaking: false };
      throw new Error("Failed to initialize VAD.");
    }
  }

  async function restartSpeechDetection(options: VadConfig) {
    if (!vadState.value.active) return;
    await createMicVad(options);
  }

  function stopSpeechDetection() {
    lastVadOptions = null;
    vadState.value = { active: false, speaking: false };
    if (micVad) {
      micVad.destroy();
      micVad = null;
    }
  }

  function attachDeviceChange() {
    if (!navigator.mediaDevices?.addEventListener || deviceChangeHandler) return;
    deviceChangeHandler = () => {
      void (async () => {
        await refreshDevices();
        if (enabled.value) {
          await startStream(true);
        }
      })();
    };
    navigator.mediaDevices.addEventListener("devicechange", deviceChangeHandler);
  }

  watch(enabled, (next) => {
    monitoring.value = next;
    if (next) {
      void start();
    } else {
      stop();
      stopSpeechDetection();
    }
  });

  watch(selectedDeviceId, () => {
    if (enabled.value) {
      void startStream(true);
    }
  });

  onScopeDispose(() => {
    stop();
    stopSpeechDetection();
    if (permissionStatus) {
      permissionStatus.onchange = null;
      permissionStatus = null;
    }
    if (deviceChangeHandler && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener("devicechange", deviceChangeHandler);
      deviceChangeHandler = null;
    }
  });

  if (typeof navigator !== "undefined") {
    void refreshPermission();
    void refreshDevices();
    attachDeviceChange();
  }

  return {
    enabled,
    selectedDeviceId,
    audioInputs,
    hasDevices,
    permission,
    monitoring,
    streaming,
    volumeLevel,
    speechThreshold,
    isSpeaking,
    speechDetected,
    error,
    refreshDevices,
    start,
    stop,
    setMonitoring,
    getStream,
    startSpeechDetection,
    stopSpeechDetection,
  };
});
