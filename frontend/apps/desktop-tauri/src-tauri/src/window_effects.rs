use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, PhysicalPosition, Runtime, WebviewWindow};
use rdev::{grab, Button, Event, EventType, Key};

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{POINT, RECT};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect};

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBehaviorPayload {
    click_through: bool,
    drag_enabled: bool,
}

#[cfg_attr(target_os = "windows", allow(dead_code))]
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HoverFadePayload {
    faded: bool,
}

#[cfg_attr(target_os = "windows", allow(dead_code))]
const HOVER_FADE_EVENT: &str = "whalewhisper:desktop-hover";
const CURSOR_STATE_EVENT: &str = "whalewhisper:desktop-cursor";

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CursorStatePayload {
    cursor_x: f64,
    cursor_y: f64,
    window_left: i32,
    window_top: i32,
    window_right: i32,
    window_bottom: i32,
    scale_factor: f64,
    inside_window: bool,
}

#[derive(Clone)]
pub struct WindowBehaviorState {
    click_through: Arc<AtomicBool>,
    drag_enabled: Arc<AtomicBool>,
    controls_bounds: Arc<Mutex<Option<ControlBounds>>>,
}

impl Default for WindowBehaviorState {
    fn default() -> Self {
        Self {
            click_through: Arc::new(AtomicBool::new(false)),
            drag_enabled: Arc::new(AtomicBool::new(true)),
            controls_bounds: Arc::new(Mutex::new(None)),
        }
    }
}

impl WindowBehaviorState {
    pub fn snapshot(&self) -> WindowBehaviorPayload {
        WindowBehaviorPayload {
            click_through: self.is_click_through(),
            drag_enabled: self.is_drag_enabled(),
        }
    }

    pub fn is_click_through(&self) -> bool {
        self.click_through.load(Ordering::Relaxed)
    }

    pub fn set_click_through(&self, enabled: bool) {
        self.click_through.store(enabled, Ordering::Relaxed);
    }

    pub fn is_drag_enabled(&self) -> bool {
        self.drag_enabled.load(Ordering::Relaxed)
    }

    pub fn set_drag_enabled(&self, enabled: bool) {
        self.drag_enabled.store(enabled, Ordering::Relaxed);
    }

    pub fn set_controls_bounds(&self, bounds: Option<ControlBounds>) {
        if let Ok(mut current) = self.controls_bounds.lock() {
            *current = bounds;
        }
    }

    #[cfg_attr(target_os = "windows", allow(dead_code))]
    pub fn controls_bounds(&self) -> Option<ControlBounds> {
        self.controls_bounds
            .lock()
            .ok()
            .and_then(|current| *current)
    }
}

#[cfg_attr(target_os = "windows", allow(dead_code))]
#[derive(Clone, Copy)]
pub struct ControlBounds {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

impl ControlBounds {
    #[cfg_attr(target_os = "windows", allow(dead_code))]
    fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.left && x <= self.right && y >= self.top && y <= self.bottom
    }
}

#[cfg(not(target_os = "windows"))]
fn is_cursor_inside<R: Runtime>(window: &WebviewWindow<R>, x: f64, y: f64) -> bool {
    let position = window
        .inner_position()
        .or_else(|_| window.outer_position());
    let size = window.inner_size().or_else(|_| window.outer_size());

    if let (Ok(position), Ok(size)) = (position, size) {
        let left = position.x as f64;
        let top = position.y as f64;
        let right = left + size.width as f64;
        let bottom = top + size.height as f64;
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    false
}

pub fn apply_click_through<R: Runtime>(
    window: &WebviewWindow<R>,
    state: &WindowBehaviorState,
    enabled: bool,
) {
    state.set_click_through(enabled);
    #[cfg(target_os = "windows")]
    set_ignore_cursor_events(window, enabled);
    #[cfg(not(target_os = "windows"))]
    let _ = window.set_ignore_cursor_events(enabled);
}

pub fn toggle_click_through<R: Runtime>(
    window: &WebviewWindow<R>,
    state: &WindowBehaviorState,
) -> bool {
    let next = !state.is_click_through();
    apply_click_through(window, state, next);
    next
}

pub fn toggle_drag_mode(state: &WindowBehaviorState) -> bool {
    let next = !state.is_drag_enabled();
    state.set_drag_enabled(next);
    next
}

#[cfg(target_os = "windows")]
pub fn start_window_listener<R: Runtime>(window: WebviewWindow<R>, state: WindowBehaviorState) {
    let drag_override = Arc::new(AtomicBool::new(false));
    let drag_override_clone = Arc::clone(&drag_override);
    let drag_offset = Arc::new(Mutex::new(None::<(i32, i32)>));
    let drag_offset_clone = Arc::clone(&drag_offset);
    let ignore_state = Arc::new(Mutex::new(None::<bool>));
    let ignore_state_clone = Arc::clone(&ignore_state);
    let alt_down = Arc::new(AtomicBool::new(false));
    let alt_down_clone = Arc::clone(&alt_down);
    let window_for_poll = window.clone();
    let drag_override_poll = Arc::clone(&drag_override);
    let drag_offset_poll = Arc::clone(&drag_offset);

    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(16));

        let cursor = match get_cursor_pos() {
            Some(cursor) => cursor,
            None => continue,
        };
        let rect = match get_window_rect(&window_for_poll) {
            Some(rect) => rect,
            None => continue,
        };

        let cursor_x = cursor.x as f64;
        let cursor_y = cursor.y as f64;
        let inside_window = point_in_rect(cursor_x, cursor_y, rect);
        let scale = window_for_poll.scale_factor().unwrap_or(1.0);
        emit_cursor_state(
            &window_for_poll,
            CursorStatePayload {
                cursor_x,
                cursor_y,
                window_left: rect.left,
                window_top: rect.top,
                window_right: rect.right,
                window_bottom: rect.bottom,
                scale_factor: scale,
                inside_window,
            },
        );

        let drag_override = drag_override_poll.load(Ordering::Relaxed);
        if drag_override {
            if let Ok(offset) = drag_offset_poll.lock() {
                if let Some((offset_x, offset_y)) = *offset {
                    let next_x = cursor.x - offset_x;
                    let next_y = cursor.y - offset_y;
                    set_window_position(&window_for_poll, next_x, next_y);
                }
            }
        }
    });

    std::thread::spawn(move || {
        let callback = move |event: Event| -> Option<Event> {
            match event.event_type {
                EventType::KeyPress(Key::Alt) | EventType::KeyPress(Key::AltGr) => {
                    alt_down_clone.store(true, Ordering::Relaxed);
                }
                EventType::KeyRelease(Key::Alt) | EventType::KeyRelease(Key::AltGr) => {
                    alt_down_clone.store(false, Ordering::Relaxed);
                }
                EventType::ButtonPress(Button::Left) => {
                    if !state.is_drag_enabled() {
                        return Some(event);
                    }
                    if !alt_down_clone.load(Ordering::Relaxed) {
                        return Some(event);
                    }
                    let cursor = match get_cursor_pos() {
                        Some(cursor) => cursor,
                        None => return Some(event),
                    };
                    let rect = match get_window_rect(&window) {
                        Some(rect) => rect,
                        None => return Some(event),
                    };
                    let cursor_x = cursor.x as f64;
                    let cursor_y = cursor.y as f64;
                    if point_in_rect(cursor_x, cursor_y, rect) {
                        drag_override_clone.store(true, Ordering::Relaxed);
                        let offset_x = cursor.x - rect.left;
                        let offset_y = cursor.y - rect.top;
                        if let Ok(mut offset) = drag_offset_clone.lock() {
                            *offset = Some((offset_x, offset_y));
                        }
                        set_ignore_cursor_events(&window, false);
                        update_ignore_state(&window, &ignore_state_clone, false);
                        return None;
                    }
                }
                EventType::ButtonRelease(Button::Left) => {
                    let was_dragging = drag_override_clone.swap(false, Ordering::Relaxed);
                    if let Ok(mut offset) = drag_offset_clone.lock() {
                        *offset = None;
                    }
                    let next_ignore = state.is_click_through();
                    update_ignore_state(&window, &ignore_state_clone, next_ignore);
                    if was_dragging {
                        return None;
                    }
                }
                _ => {}
            }

            Some(event)
        };

        if let Err(error) = grab(callback) {
            eprintln!("Failed to grab cursor events: {error:?}");
        }
    });
}

#[cfg(target_os = "windows")]
fn get_window_rect<R: Runtime>(window: &WebviewWindow<R>) -> Option<RECT> {
    let hwnd = window.hwnd().ok()?;
    unsafe {
        let mut rect = RECT::default();
        if GetWindowRect(hwnd, &mut rect).is_ok() {
            Some(rect)
        } else {
            None
        }
    }
}

#[cfg(target_os = "windows")]
fn get_cursor_pos() -> Option<POINT> {
    unsafe {
        let mut point = POINT::default();
        if GetCursorPos(&mut point).is_ok() {
            Some(point)
        } else {
            None
        }
    }
}

#[cfg(target_os = "windows")]
fn point_in_rect(x: f64, y: f64, rect: RECT) -> bool {
    x >= rect.left as f64
        && x <= rect.right as f64
        && y >= rect.top as f64
        && y <= rect.bottom as f64
}

#[cfg(target_os = "windows")]
fn emit_cursor_state<R: Runtime>(window: &WebviewWindow<R>, payload: CursorStatePayload) {
    let window_clone = window.clone();
    let _ = window.run_on_main_thread(move || {
        let _ = window_clone.emit(CURSOR_STATE_EVENT, payload);
    });
}

#[cfg(target_os = "windows")]
fn set_ignore_cursor_events<R: Runtime>(window: &WebviewWindow<R>, ignore: bool) {
    let window_clone = window.clone();
    let _ = window.run_on_main_thread(move || {
        let _ = window_clone.set_ignore_cursor_events(ignore);
    });
}

#[cfg(target_os = "windows")]
fn set_window_position<R: Runtime>(window: &WebviewWindow<R>, x: i32, y: i32) {
    let window_clone = window.clone();
    let _ = window.run_on_main_thread(move || {
        let _ = window_clone.set_position(PhysicalPosition::new(x, y));
    });
}

#[cfg(target_os = "windows")]
fn update_ignore_state<R: Runtime>(
    window: &WebviewWindow<R>,
    state: &Arc<Mutex<Option<bool>>>,
    next_ignore: bool,
) {
    let mut should_update = false;
    if let Ok(mut last) = state.lock() {
        if last.map_or(true, |value| value != next_ignore) {
            *last = Some(next_ignore);
            should_update = true;
        }
    }
    if should_update {
        set_ignore_cursor_events(window, next_ignore);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn start_window_listener<R: Runtime>(window: WebviewWindow<R>, state: WindowBehaviorState) {
    let last_pos = Arc::new(Mutex::new((0.0_f64, 0.0_f64)));
    let last_pos_clone = Arc::clone(&last_pos);
    let drag_override = Arc::new(AtomicBool::new(false));
    let drag_override_clone = Arc::clone(&drag_override);
    let hover_controls = Arc::new(AtomicBool::new(false));
    let hover_controls_clone = Arc::clone(&hover_controls);
    let hover_faded = Arc::new(AtomicBool::new(false));
    let hover_faded_clone = Arc::clone(&hover_faded);

    std::thread::spawn(move || {
        let callback = move |event: Event| -> Option<Event> {
            match event.event_type {
                EventType::MouseMove { x, y } => {
                    if let Ok(mut pos) = last_pos_clone.lock() {
                        *pos = (x, y);
                    }
                    let should_fade = is_cursor_near_window(&window, x, y);
                    let was_faded = hover_faded_clone.swap(should_fade, Ordering::Relaxed);
                    if should_fade != was_faded {
                        let _ = window.emit(
                            HOVER_FADE_EVENT,
                            HoverFadePayload {
                                faded: should_fade,
                            },
                        );
                    }
                    if state.is_click_through() && !drag_override_clone.load(Ordering::Relaxed) {
                        let inside_controls = is_cursor_in_controls(&window, &state, x, y);
                        let was_inside = hover_controls_clone.swap(inside_controls, Ordering::Relaxed);
                        if inside_controls != was_inside {
                            let _ = window.set_ignore_cursor_events(!inside_controls);
                        }
                    }
                    return Some(event);
                }
                EventType::ButtonPress(Button::Right) => {
                    if !state.is_drag_enabled() {
                        return Some(event);
                    }
                    let (x, y) = match last_pos_clone.lock() {
                        Ok(pos) => *pos,
                        Err(_) => return Some(event),
                    };
                    if is_cursor_inside(&window, x, y) {
                        if state.is_click_through() {
                            let _ = window.set_ignore_cursor_events(false);
                            drag_override_clone.store(true, Ordering::Relaxed);
                        }
                        let window_clone = window.clone();
                        let _ = window.run_on_main_thread(move || {
                            let _ = window_clone.start_dragging();
                        });
                        return None;
                    }
                }
                EventType::ButtonRelease(Button::Right) => {
                    let (x, y) = match last_pos_clone.lock() {
                        Ok(pos) => *pos,
                        Err(_) => return Some(event),
                    };
                    let was_drag_override = drag_override_clone.swap(false, Ordering::Relaxed);
                    if was_drag_override && state.is_click_through() {
                        let inside_controls = is_cursor_in_controls(&window, &state, x, y);
                        hover_controls_clone.store(inside_controls, Ordering::Relaxed);
                        let _ = window.set_ignore_cursor_events(!inside_controls);
                    }
                    if is_cursor_inside(&window, x, y) {
                        return None;
                    }
                }
                _ => {}
            }
            Some(event)
        };

        if let Err(error) = grab(callback) {
            eprintln!("Failed to grab cursor events: {error:?}");
        }
    });
}

#[cfg(not(target_os = "windows"))]
fn is_cursor_in_controls<R: Runtime>(
    window: &WebviewWindow<R>,
    state: &WindowBehaviorState,
    x: f64,
    y: f64,
) -> bool {
    let position = window
        .inner_position()
        .or_else(|_| window.outer_position());
    let size = window.inner_size().or_else(|_| window.outer_size());

    let position = match position {
        Ok(position) => position,
        Err(_) => return false,
    };

    let local_x = x - position.x as f64;
    let local_y = y - position.y as f64;

    if let Some(bounds) = state.controls_bounds() {
        return bounds.contains(local_x, local_y);
    }

    if let Ok(size) = size {
        let margin_right = 24.0;
        let margin_bottom = 24.0;
        let width = 360.0;
        let height = 360.0;
        let control_left = size.width as f64 - margin_right - width;
        let control_top = size.height as f64 - margin_bottom - height;
        return local_x >= control_left
            && local_x <= size.width as f64 - margin_right
            && local_y >= control_top
            && local_y <= size.height as f64 - margin_bottom;
    }

    false
}

#[cfg(not(target_os = "windows"))]
fn is_cursor_near_window<R: Runtime>(window: &WebviewWindow<R>, x: f64, y: f64) -> bool {
    let position = window
        .inner_position()
        .or_else(|_| window.outer_position());
    let size = window.inner_size().or_else(|_| window.outer_size());

    if let (Ok(position), Ok(size)) = (position, size) {
        let margin = 0.0;
        let left = position.x as f64 - margin;
        let top = position.y as f64 - margin;
        let right = left + size.width as f64 + margin * 2.0;
        let bottom = top + size.height as f64 + margin * 2.0;
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    false
}
