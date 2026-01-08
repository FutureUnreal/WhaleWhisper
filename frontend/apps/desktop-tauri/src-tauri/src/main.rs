#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;
mod commands;
mod debug_tools;
mod tray;
mod window_effects;

use tauri::{Manager, PhysicalPosition, PhysicalSize, WindowEvent};

fn main() {
    let app = tauri::Builder::default()
        .manage(window_effects::WindowBehaviorState::default())
        .manage(backend::BackendProcess::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_window_behavior,
            commands::set_click_through,
            commands::set_drag_enabled,
            commands::set_controls_bounds,
            commands::get_backend_endpoint,
            commands::open_chat_window,
            commands::close_chat_window,
            commands::sync_chat_window_bounds,
            commands::open_settings_window,
            commands::close_settings_window
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("main window not found")?;
            apply_initial_window_bounds(&window);
            let _ = window.set_ignore_cursor_events(false);
            let _ = window.set_always_on_top(true);
            let _ = window.show();
            let _ = window.set_focus();
            debug_tools::open_devtools_if_enabled(&window);
            if let Err(err) = backend::start(&app.handle()) {
                eprintln!("failed to start backend: {err}");
            }
            let state = app
                .state::<window_effects::WindowBehaviorState>()
                .inner()
                .clone();
            window_effects::start_window_listener(window, state);
            tray::setup_tray(&app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    return;
                }
                if window.label() == "settings" {
                    api.prevent_close();
                    let _ = window.hide();
                    return;
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { .. } => {
            backend::stop(app_handle);
        }
        tauri::RunEvent::Exit { .. } => {
            backend::stop(app_handle);
        }
        _ => {}
    });
}

fn apply_initial_window_bounds(window: &tauri::WebviewWindow) {
    let target_size = PhysicalSize::new(640, 720);
    let _ = window.set_size(target_size);
    let _ = window.center();
    if let Ok(Some(monitor)) = window.current_monitor() {
        let size = monitor.size();
        let x = size.width.saturating_sub(target_size.width + 24) as i32;
        let y = size.height.saturating_sub(target_size.height + 80) as i32;
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}
