use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::{env, fs, io::Write};

use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct BackendEndpoint {
    pub host: String,
    pub port: u16,
}

pub struct BackendProcess {
    child: Mutex<Option<Child>>,
    endpoint: Mutex<Option<BackendEndpoint>>,
}

impl Default for BackendProcess {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
            endpoint: Mutex::new(None),
        }
    }
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<BackendProcess>();
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "backend process lock poisoned")?;
    if guard.is_some() {
        return Ok(());
    }

    let autostart = env::var("WHALEWHISPER_BACKEND_AUTOSTART")
        .ok()
        .map(|value| matches!(value.to_lowercase().as_str(), "1" | "true" | "yes"))
        .unwrap_or(!cfg!(debug_assertions));
    if !autostart {
        log_backend(app, "backend autostart disabled; skip spawn");
        return Ok(());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;
    let data_dir = env::var("WHALEWHISPER_BACKEND_DATA_DIR")
        .ok()
        .map(PathBuf::from)
        .unwrap_or(app_data_dir);
    std::fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    let memory_db = data_dir.join("memory.db");
    let host =
        env::var("WHALEWHISPER_BACKEND_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = match env::var("WHALEWHISPER_BACKEND_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
    {
        Some(value) => value,
        None => resolve_backend_port(app, &host, 8090, 3)?,
    };

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|err| err.to_string())?;
    if let Some(sidecar_path) = resolve_sidecar_path(&resource_dir) {
        let config_dir = resource_dir.join("config");
        let engine_config = config_dir.join("engines.yaml");
        let provider_config = config_dir.join("providers.yaml");
        let plugin_config = config_dir.join("plugins.yaml");

        let mut command = Command::new(sidecar_path);
        command
            .env("ENGINE_CONFIG_PATH", engine_config)
            .env("PROVIDER_CATALOG_PATH", provider_config)
            .env("PLUGIN_CATALOG_PATH", plugin_config)
            .env("MEMORY_DB_PATH", memory_db)
            .env("BACKEND_HOST", &host)
            .env("BACKEND_PORT", port.to_string())
            .env("WHALEWHISPER_PARENT_PID", std::process::id().to_string())
            .env("LOG_LEVEL", "INFO")
            .current_dir(resource_dir);

        let child = command.spawn().map_err(|err| {
            log_backend(app, &format!("failed to spawn backend: {err}"));
            err.to_string()
        })?;
        *guard = Some(child);
        let endpoint = BackendEndpoint {
            host: host.clone(),
            port,
        };
        if let Ok(mut endpoint_guard) = state.endpoint.lock() {
            *endpoint_guard = Some(endpoint);
        }
        return Ok(());
    }

    log_backend(app, "backend sidecar not found; skip spawn");
    if let Ok(mut endpoint_guard) = state.endpoint.lock() {
        *endpoint_guard = None;
    }
    Ok(())
}

pub fn stop(app: &AppHandle) {
    let state = app.state::<BackendProcess>();
    let Ok(mut guard) = state.child.lock() else {
        return;
    };
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
    }
    if let Ok(mut endpoint_guard) = state.endpoint.lock() {
        *endpoint_guard = None;
    };
}

pub fn endpoint(app: &AppHandle) -> Option<BackendEndpoint> {
    let state = app.state::<BackendProcess>();
    state
        .endpoint
        .lock()
        .ok()
        .and_then(|value| value.clone())
}

fn resolve_backend_port(
    app: &AppHandle,
    host: &str,
    base_port: u16,
    attempts: u16,
) -> Result<u16, String> {
    let mut last_error: Option<std::io::Error> = None;
    for offset in 0..attempts {
        let port = base_port.saturating_add(offset);
        match TcpListener::bind((host, port)) {
            Ok(listener) => {
                drop(listener);
                if offset > 0 {
                    log_backend(
                        app,
                        &format!("backend port {base_port} in use; fallback to {port}"),
                    );
                }
                return Ok(port);
            }
            Err(error) => last_error = Some(error),
        }
    }
    let max_port = base_port.saturating_add(attempts.saturating_sub(1));
    Err(format!(
        "no available backend port in {base_port}-{max_port}: {last_error:?}"
    ))
}

fn resolve_sidecar_path(resource_dir: &PathBuf) -> Option<PathBuf> {
    let mut names: Vec<String> = Vec::new();
    if let Some(triple) = option_env!("TAURI_ENV_TARGET_TRIPLE") {
        names.push(format!("whalewhisper-backend-{triple}"));
    }
    if let Ok(triple) = env::var("TAURI_ENV_TARGET_TRIPLE") {
        let name = format!("whalewhisper-backend-{triple}");
        if !names.contains(&name) {
            names.push(name);
        }
    }
    names.push("whalewhisper-backend".to_string());

    for name in names {
        for candidate in [resource_dir.join("bin").join(&name), resource_dir.join(&name)] {
            let mut path = candidate;
            if cfg!(target_os = "windows") {
                path.set_extension("exe");
            }
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

fn log_backend(app: &AppHandle, message: &str) {
    let Ok(log_dir) = app.path().app_data_dir() else {
        return;
    };
    let _ = fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("backend-start.log");
    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let _ = writeln!(file, "{message}");
    }
}
