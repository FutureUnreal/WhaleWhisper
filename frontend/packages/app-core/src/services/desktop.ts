type WindowBehavior = {
  clickThrough: boolean;
  dragEnabled: boolean;
};

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function resolveInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") return null;
  const tauri = (window as Window & { __TAURI__?: any }).__TAURI__;
  return (
    tauri?.core?.invoke ??
    tauri?.tauri?.invoke ??
    null
  );
}

export function isDesktopApp() {
  return Boolean(resolveInvoke());
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>) {
  const invoker = resolveInvoke();
  if (!invoker) return null;
  return await invoker<T>(cmd, args);
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
