use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, Runtime,
};
use tauri_plugin_store::StoreBuilder;

static ALLOW_EXIT: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Interest {
    id: String,
    name: String,
    active: bool,
    #[serde(rename = "scheduleFrequency")]
    schedule_frequency: Option<String>,
    #[serde(rename = "lastRanAt")]
    last_ran_at: Option<String>,
}

fn is_interest_due(interest: &Interest) -> bool {
    if !interest.active {
        return false;
    }
    let freq = match interest.schedule_frequency.as_deref() {
        Some("hourly") => 1,
        Some("daily") => 24,
        Some("weekly") => 168,
        _ => return false, // manual or unknown
    };

    let last_run = match &interest.last_ran_at {
        Some(s) => match chrono::DateTime::parse_from_rfc3339(s) {
            Ok(dt) => dt.with_timezone(&chrono::Utc),
            Err(_) => return true, // Parse error, assume due
        },
        None => return true, // Never ran
    };

    let now = chrono::Utc::now();
    let diff = now.signed_duration_since(last_run);

    diff.num_hours() >= freq
}

fn start_scheduler<R: Runtime>(app_handle: tauri::AppHandle<R>) {
    std::thread::spawn(move || {
        loop {
            // Check every 5 minutes
            std::thread::sleep(Duration::from_secs(300));

            let app_handle_clone = app_handle.clone();
            let _ = (|| -> Result<(), Box<dyn std::error::Error>> {
                // In Tauri v2, we can use the StoreBuilder to access the store
                let store = StoreBuilder::new(&app_handle_clone, "interester.dat").build()?;
                
                if let Some(interests_val) = store.get("interests.json") {
                    let interests: Vec<Interest> = serde_json::from_value(interests_val)?;
                    
                    for interest in interests {
                        if is_interest_due(&interest) {
                            println!("[Rust Scheduler] Interest \"{}\" is due. Emitting scan-due.", interest.name);
                            app_handle_clone.emit("scan-due", interest.id)?;
                        }
                    }
                }
                Ok(())
            })();
        }
    });
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Setup Tray Menu
            let quit_tray_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_tray_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_tray_i, &quit_tray_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        ALLOW_EXIT.store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
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
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Setup Application Menu (Desktop)
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let quit_menu_i = MenuItem::with_id(app, "quit", "Quit Interester", true, None::<&str>)?;
                let show_menu_i = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
                let app_menu = Menu::with_items(app, &[
                    &Submenu::with_items(app, "App", true, &[&show_menu_i, &quit_menu_i])?
                ])?;
                app.set_menu(app_menu)?;
                
                app.on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        ALLOW_EXIT.store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                });
            }

            // Start the scheduler
            start_scheduler(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        });

    builder
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { api, .. } = event {
                if !ALLOW_EXIT.load(Ordering::SeqCst) {
                    api.prevent_exit();
                    // Just in case, hide any windows
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
        });
}
