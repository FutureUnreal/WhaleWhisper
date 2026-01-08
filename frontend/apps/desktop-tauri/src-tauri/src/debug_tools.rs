use tauri::WebviewWindow;

pub fn should_open_devtools() -> bool {
    std::env::var("WHALEWHISPER_DEVTOOLS")
        .ok()
        .map(|value| matches!(value.to_lowercase().as_str(), "1" | "true" | "yes"))
        .unwrap_or(false)
}

pub fn open_devtools_if_enabled(window: &WebviewWindow) {
    if should_open_devtools() {
        let _ = window.open_devtools();
    }
}
