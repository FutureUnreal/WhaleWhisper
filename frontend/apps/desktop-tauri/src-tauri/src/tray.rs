use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Wry,
};

use crate::window_effects::{toggle_click_through, toggle_drag_mode, WindowBehaviorState};

const MENU_TOGGLE_VISIBILITY: &str = "toggle_visibility";
const MENU_OPEN_CHAT: &str = "open_chat";
const MENU_OPEN_SETTINGS: &str = "open_settings";
const MENU_TOGGLE_CLICK_THROUGH: &str = "toggle_click_through";
const MENU_TOGGLE_DRAG_MODE: &str = "toggle_drag_mode";
const MENU_QUIT: &str = "quit";

pub fn setup_tray(app: &AppHandle<Wry>) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text(MENU_TOGGLE_VISIBILITY, "Show / Hide")
        .text(MENU_OPEN_CHAT, "Open Chat")
        .text(MENU_OPEN_SETTINGS, "Open Settings")
        .separator()
        .text(MENU_TOGGLE_CLICK_THROUGH, "Toggle Click-through")
        .text(MENU_TOGGLE_DRAG_MODE, "Toggle Drag Mode")
        .separator()
        .text(MENU_QUIT, "Quit")
        .build()?;

    let mut builder = TrayIconBuilder::new().menu(&menu).show_menu_on_left_click(true);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_TOGGLE_VISIBILITY => {
                if let Some(window) = app.get_webview_window("main") {
                    let visible = window.is_visible().unwrap_or(true);
                    if visible {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            MENU_TOGGLE_CLICK_THROUGH => {
                if let Some(window) = app.get_webview_window("main") {
                    let state = app.state::<WindowBehaviorState>();
                    let _ = toggle_click_through(&window, &state);
                }
            }
            MENU_OPEN_CHAT => {
                let _ = crate::commands::open_chat_window(app.clone());
            }
            MENU_OPEN_SETTINGS => {
                let _ = crate::commands::open_settings_window(app.clone());
            }
            MENU_TOGGLE_DRAG_MODE => {
                let state = app.state::<WindowBehaviorState>();
                let _ = toggle_drag_mode(&state);
            }
            MENU_QUIT => {
                crate::backend::stop(app);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
