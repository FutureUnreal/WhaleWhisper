type WindowBehavior = {
  clickThrough: boolean;
  dragEnabled: boolean;
};

type ControlsBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { emit as tauriEmit, listen as tauriListen } from "@tauri-apps/api/event";

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type TauriListen = <T>(
  event: string,
  handler: (event: { payload: T }) => void
) => Promise<() => void>;
type TauriEmit = (event: string, payload?: unknown) => Promise<void>;

type HoverPayload = {
  faded: boolean;
};

type CursorPayload = {
  cursorX: number;
  cursorY: number;
  windowLeft: number;
  windowTop: number;
  windowRight: number;
  windowBottom: number;
  scaleFactor: number;
  insideWindow: boolean;
};

type ChatOverlayPayload = {
  action?: "open" | "close" | "toggle";
};

type ActionTokenPayload = {
  token: string;
};


function isTauriRuntime() {
  if (typeof window === "undefined") return false;
  const runtime = window as Window & { __TAURI_INTERNALS__?: any; __TAURI__?: any };
  return Boolean(runtime.__TAURI_INTERNALS__ || runtime.__TAURI__);
}

function resolveInvoke(): TauriInvoke | null {
  if (!isTauriRuntime()) return null;
  return tauriInvoke;
}

function resolveListen(): TauriListen | null {
  if (!isTauriRuntime()) return null;
  return tauriListen;
}

function resolveEmit(): TauriEmit | null {
  if (!isTauriRuntime()) return null;
  return tauriEmit;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>) {
  const invoker = resolveInvoke();
  if (!invoker) return null;
  try {
    return await invoker<T>(cmd, args);
  } catch (error) {
    console.warn(`[desktop] invoke ${cmd} failed`, error);
    throw error;
  }
}

export async function getWindowBehavior() {
  return await invoke<WindowBehavior>("get_window_behavior");
}

export async function setClickThrough(enabled: boolean) {
  return await invoke<WindowBehavior>("set_click_through", { enabled });
}

export async function setDragEnabled(enabled: boolean) {
  return await invoke<WindowBehavior>("set_drag_enabled", { enabled });
}

export async function setControlsBounds(bounds: ControlsBounds | null) {
  return await invoke<WindowBehavior>("set_controls_bounds", {
    bounds,
  });
}

export async function listenDesktopHover(
  handler: (payload: HoverPayload) => void
) {
  const listener = resolveListen();
  if (!listener) return null;
  return await listener<HoverPayload>("whalewhisper:desktop-hover", (event) => {
    handler(event.payload);
  });
}

export async function listenDesktopCursor(
  handler: (payload: CursorPayload) => void
) {
  const listener = resolveListen();
  if (!listener) return null;
  return await listener<CursorPayload>("whalewhisper:desktop-cursor", (event) => {
    handler(event.payload);
  });
}

export async function listenDesktopChat(
  handler: (payload: ChatOverlayPayload) => void
) {
  const listener = resolveListen();
  if (!listener) return null;
  return await listener<ChatOverlayPayload>("whalewhisper:desktop-chat", (event) => {
    handler(event.payload);
  });
}

export async function listenDesktopActionToken(
  handler: (payload: ActionTokenPayload) => void
) {
  const listener = resolveListen();
  if (!listener) return null;
  return await listener<ActionTokenPayload>(
    "whalewhisper:desktop-action-token",
    (event) => {
      handler(event.payload);
    }
  );
}

export async function emitDesktopActionToken(token: string) {
  const emitter = resolveEmit();
  if (!emitter) return;
  await emitter("whalewhisper:desktop-action-token", { token });
}

export async function openChatWindow() {
  await invoke("open_chat_window");
}

export async function closeChatWindow() {
  await invoke("close_chat_window");
}

export async function syncChatWindowBounds(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  await invoke("sync_chat_window_bounds", { bounds });
}

export async function openSettingsWindow() {
  await invoke("open_settings_window");
}

export async function closeSettingsWindow() {
  await invoke("close_settings_window");
}
