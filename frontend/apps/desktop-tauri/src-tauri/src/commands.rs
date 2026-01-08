use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};

use crate::backend::BackendEndpoint;
use crate::debug_tools;
use crate::window_effects::{
    apply_click_through, ControlBounds, WindowBehaviorPayload, WindowBehaviorState,
};

#[tauri::command]
pub fn get_window_behavior(state: State<WindowBehaviorState>) -> WindowBehaviorPayload {
    state.snapshot()
}

#[tauri::command]
pub fn set_click_through(
    window: WebviewWindow,
    state: State<WindowBehaviorState>,
    enabled: bool,
) -> WindowBehaviorPayload {
    apply_click_through(&window, &state, enabled);
    state.snapshot()
}

#[tauri::command]
pub fn set_drag_enabled(
    state: State<WindowBehaviorState>,
    enabled: bool,
) -> WindowBehaviorPayload {
    state.set_drag_enabled(enabled);
    state.snapshot()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControlsBoundsInput {
    left: f64,
    top: f64,
    right: f64,
    bottom: f64,
}

#[tauri::command]
pub fn set_controls_bounds(
    state: State<WindowBehaviorState>,
    bounds: Option<ControlsBoundsInput>,
) -> WindowBehaviorPayload {
    let mapped = bounds.map(|value| ControlBounds {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
    });
    state.set_controls_bounds(mapped);
    state.snapshot()
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChatOverlayEvent {
    action: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendEndpointPayload {
    host: String,
    port: u16,
    api_base_url: String,
    ws_url: String,
}

#[tauri::command]
pub fn get_backend_endpoint(app: AppHandle) -> Option<BackendEndpointPayload> {
    let BackendEndpoint { host, port } = crate::backend::endpoint(&app)?;
    let api_base_url = format!("http://{host}:{port}");
    let ws_url = format!("ws://{host}:{port}/ws");
    Some(BackendEndpointPayload {
        host,
        port,
        api_base_url,
        ws_url,
    })
}


#[tauri::command]
pub fn open_chat_window(app: AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let app_for_closure = app_handle.clone();
        let _ = app_handle.run_on_main_thread(move || {
            if let Err(error) = open_app_window(
                &app_for_closure,
                "chat",
                "WhaleWhisper Chat",
                "index.html#chat",
                420.0,
                560.0,
            ) {
                eprintln!("Failed to open chat window: {error}");
                return;
            }
            if let Some(window) = app_for_closure.get_webview_window("main") {
                if matches!(window.is_visible(), Ok(false)) {
                    let _ = window.show();
                }
                let _ = window.emit(
                    "whalewhisper:desktop-chat",
                    ChatOverlayEvent {
                        action: "open".to_string(),
                    },
                );
            }
        });
    });
    Ok(())
}

#[tauri::command]
pub fn close_chat_window(app: AppHandle) -> Result<(), String> {
    run_on_main_thread(&app, |app| {
        if let Some(window) = app.get_webview_window("chat") {
            if let Err(error) = window.close() {
                eprintln!("Failed to close chat window: {error}");
            }
        }
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.emit(
                "whalewhisper:desktop-chat",
                ChatOverlayEvent {
                    action: "close".to_string(),
                },
            );
        }
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatBoundsInput {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[tauri::command]
pub fn sync_chat_window_bounds(
    app: AppHandle,
    bounds: ChatBoundsInput,
) -> Result<(), String> {
    run_on_main_thread(&app, move |app| {
        let Some(window) = app.get_webview_window("chat") else {
            return;
        };
        let mut width = bounds.width;
        let mut height = bounds.height;
        let mut x = bounds.x;
        let mut y = bounds.y;
        let monitor = window
            .current_monitor()
            .ok()
            .flatten()
            .or_else(|| app.primary_monitor().ok().flatten());
        if let Some(monitor) = monitor {
            let position = monitor.position();
            let size = monitor.size();
            width = width.min(size.width);
            height = height.min(size.height);
            let max_x = position.x + size.width as i32 - width as i32;
            let max_y = position.y + size.height as i32 - height as i32;
            x = if max_x < position.x {
                position.x
            } else {
                x.clamp(position.x, max_x)
            };
            y = if max_y < position.y {
                position.y
            } else {
                y.clamp(position.y, max_y)
            };
        }
        let _ = window.set_size(PhysicalSize::new(width, height));
        let _ = window.set_position(PhysicalPosition::new(x, y));
    })
}

#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    run_on_main_thread(&app, |app| {
        if let Some(window) = app.get_webview_window("settings") {
            if show_and_focus_window(&window).is_ok() {
                return;
            }
            let _ = window.close();
        }

        if let Err(error) = open_app_window(
            &app,
            "settings",
            "WhaleWhisper Settings",
            "index.html#settings",
            960.0,
            720.0,
        ) {
            eprintln!("Failed to open settings window: {error}");
        }
    })
}

#[tauri::command]
pub fn close_settings_window(app: AppHandle) -> Result<(), String> {
    run_on_main_thread(&app, |app| {
        if let Some(window) = app.get_webview_window("settings") {
            if let Err(error) = window.hide() {
                eprintln!("Failed to hide settings window: {error}");
            }
        }
    })
}

fn show_and_focus_window(window: &WebviewWindow) -> Result<(), String> {
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    let _ = window.set_focus();
    Ok(())
}

fn open_app_window(
    app: &AppHandle,
    label: &str,
    title: &str,
    url: &str,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        return show_and_focus_window(&window);
    }

    let mut builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App(url.into()));
    builder = builder
        .title(title)
        .inner_size(width, height)
        .resizable(true)
        .skip_taskbar(false);
    if label == "settings" {
        builder = builder
            .transparent(true)
            .decorations(false)
            .shadow(false);
    } else if label == "chat" {
        builder = builder
            .transparent(true)
            .decorations(false)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true);
    } else {
        builder = builder
            .transparent(false)
            .decorations(true);
    }
    let window = builder
        .build()
        .map_err(|error| error.to_string())?;
    debug_tools::open_devtools_if_enabled(&window);
    let _ = show_and_focus_window(&window);
    Ok(())
}

fn run_on_main_thread(
    app: &AppHandle,
    op: impl FnOnce(AppHandle) + Send + 'static,
) -> Result<(), String> {
    let app = app.clone();
    let app_for_closure = app.clone();
    app.run_on_main_thread(move || {
        op(app_for_closure);
    })
    .map_err(|error| error.to_string())
}
