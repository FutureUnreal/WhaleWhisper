import { createApp } from "vue";
import { createPinia } from "pinia";

import "@unocss/reset/tailwind.css";
import "uno.css";
import "./style.css";

type RuntimeConfig = {
  wsUrl?: string;
  providers?: {
    apiBaseUrl?: string;
    proxyUrl?: string;
  };
};

type BackendEndpointPayload = {
  host: string;
  port: number;
  apiBaseUrl: string;
  wsUrl: string;
};

async function initRuntimeConfig() {
  if (typeof window === "undefined") return;
  const runtime = window as Window & {
    __TAURI_INTERNALS__?: any;
    __TAURI__?: any;
    __WHALEWHISPER_RUNTIME_CONFIG__?: RuntimeConfig;
  };
  if (!runtime.__TAURI_INTERNALS__ && !runtime.__TAURI__) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const endpoint = await invoke<BackendEndpointPayload | null>("get_backend_endpoint");
    if (!endpoint?.apiBaseUrl || !endpoint?.wsUrl) return;
    runtime.__WHALEWHISPER_RUNTIME_CONFIG__ = {
      wsUrl: endpoint.wsUrl,
      providers: {
        apiBaseUrl: endpoint.apiBaseUrl,
      },
    };
  } catch (error) {
    console.warn("[desktop] failed to load backend endpoint", error);
  }
}

async function resolveView() {
  if (typeof window === "undefined") return "stage";
  const params = new URLSearchParams(window.location.search);
  const open = params.get("open");
  if (open === "settings") return "settings";
  if (open === "chat") return "chat";
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "/settings" || hash === "settings") return "settings";
  if (hash === "/chat" || hash === "chat") return "chat";
  const runtime = window as Window & { __TAURI_INTERNALS__?: any; __TAURI__?: any };
  if (runtime.__TAURI_INTERNALS__ || runtime.__TAURI__) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const label = getCurrentWindow().label;
      if (label === "settings") return "settings";
      if (label === "chat") return "chat";
    } catch (error) {
      console.warn("[desktop] resolve view from window label failed", error);
    }
  }
  return "stage";
}

async function bootstrap() {
  await initRuntimeConfig();
  const view = await resolveView();
  document.documentElement.dataset.desktopView = view;
  document.body.dataset.desktopView = view;

  const root =
    view === "settings"
      ? (await import("./SettingsApp.vue")).default
      : view === "chat"
        ? (await import("./ChatApp.vue")).default
      : (await import("./App.vue")).default;
  const app = createApp(root);
  app.use(createPinia());
  app.mount("#app");
}

void bootstrap();
