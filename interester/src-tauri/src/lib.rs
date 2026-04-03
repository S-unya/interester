use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, Runtime,
};
use tauri_plugin_store::StoreBuilder;
use tauri_plugin_notification::NotificationExt;

const KEYCHAIN_SERVICE: &str = "com.sunya.interester";

static ALLOW_EXIT: AtomicBool = AtomicBool::new(false);

// ── Keychain commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn get_secret(key: String) -> Result<Option<String>, String> {
    let entry = Entry::new(KEYCHAIN_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_secret(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new(KEYCHAIN_SERVICE, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_secret(key: String) -> Result<(), String> {
    let entry = Entry::new(KEYCHAIN_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // idempotent
        Err(e) => Err(e.to_string()),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Interest {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "searchTerms")]
    search_terms: Vec<String>,
    #[serde(rename = "monitorUrls")]
    monitor_urls: Option<Vec<String>>,
    active: bool,
    #[serde(rename = "scheduleFrequency")]
    schedule_frequency: Option<String>,
    #[serde(rename = "lastRanAt")]
    last_ran_at: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: Option<String>,
    #[serde(rename = "updatedAt")]
    updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Source {
    title: String,
    url: String,
    date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DiscreteItem {
    id: String,
    #[serde(rename = "type")]
    item_type: String,
    title: String,
    summary: String,
    url: String,
    date: Option<String>,
    location: Option<String>,
    source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct FormattedResult {
    id: String,
    #[serde(rename = "interestId")]
    interest_id: String,
    #[serde(rename = "searchId")]
    search_id: String,
    #[serde(rename = "formattedHtml")]
    formatted_html: String,
    #[serde(rename = "formattedText")]
    formatted_text: String,
    summary: String,
    #[serde(rename = "keyPoints")]
    key_points: Vec<String>,
    items: Option<Vec<DiscreteItem>>,
    sources: Vec<Source>,
    #[serde(rename = "generatedAt")]
    generated_at: String,
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

async fn generate_gemini_text(prompt: &str, system: &str, api_key: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}", api_key);

    let body = json!({
        "system_instruction": {
            "parts": [{ "text": system }]
        },
        "contents": [{
            "parts": [{ "text": prompt }]
        }]
    });

    let resp = client.post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Gemini API error: {}", err_text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    
    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("Failed to parse Gemini response")?;

    Ok(text.to_string())
}

async fn serper_search(query: &str, api_key: &str) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let url = "https://google.serper.dev/search";

    let body = json!({
        "q": query,
        "num": 5,
        "gl": "us",
        "hl": "en"
    });

    let resp = client.post(url)
        .header("X-API-KEY", api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Serper API error: {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let organic = json["organic"].as_array().cloned().unwrap_or_default();

    Ok(organic)
}

fn extract_json(raw: &str) -> String {
    let clean = raw.trim();
    if let Some(start) = clean.find('{') {
        if let Some(end) = clean.rfind('}') {
            return clean[start..=end].to_string();
        }
    }
    if let Some(start) = clean.find('[') {
        if let Some(end) = clean.rfind(']') {
            return clean[start..=end].to_string();
        }
    }
    clean.to_string()
}

#[tauri::command]
async fn run_search_scan(interest: Interest) -> Result<FormattedResult, String> {
    println!("[Rust Command] Running search scan for: {}", interest.name);

    // Read keys from OS keychain — never from env vars or IPC parameters
    let ai_key = Entry::new(KEYCHAIN_SERVICE, "ai_api_key")
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| match e {
            keyring::Error::NoEntry => "AI API key not configured. Please add it in Settings.".to_string(),
            _ => format!("Failed to read AI API key from keychain: {}", e),
        })?;

    let serper_key = Entry::new(KEYCHAIN_SERVICE, "serper_api_key")
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| match e {
            keyring::Error::NoEntry => "Serper API key not configured. Please add it in Settings.".to_string(),
            _ => format!("Failed to read Serper API key from keychain: {}", e),
        })?;

    let prompts_json = include_str!("../../src/lib/prompts.json");
    let prompts: serde_json::Value = serde_json::from_str(prompts_json).map_err(|e| e.to_string())?;

    // 1. Generate Queries
    let query_template = prompts["queryGenerator"]["prompt"].as_str().ok_or("Missing query prompt")?;
    let query_system = prompts["queryGenerator"]["system"].as_str().unwrap_or("You are a search expert.");
    
    let query_prompt = query_template
        .replace("{name}", &interest.name)
        .replace("{description}", interest.description.as_deref().unwrap_or("N/A"))
        .replace("{keywords}", &interest.search_terms.join(", "))
        .replace("{urls}", &interest.monitor_urls.as_ref().map(|u| u.join(", ")).unwrap_or_else(|| "N/A".to_string()))
        .replace("{date}", &chrono::Utc::now().to_rfc3339());
    
    let queries_raw = generate_gemini_text(&query_prompt, query_system, &ai_key).await?;
    println!("[Rust Command] Raw Queries response: {}", queries_raw);
    let clean_queries = extract_json(&queries_raw);
    let queries: Vec<String> = serde_json::from_str(&clean_queries).unwrap_or_else(|e| {
        println!("[Rust Command] Failed to parse queries JSON ({}): {}. Falling back to search terms.", e, clean_queries);
        interest.search_terms.clone()
    });
    println!("[Rust Command] Using queries: {:?}", queries);

    // 2. Perform Searches
    let mut all_raw = Vec::new();
    for q in queries {
        println!("[Rust Command] Searching for: {}", q);
        if let Ok(results) = serper_search(&q, &serper_key).await {
            println!("[Rust Command] Found {} results for query.", results.len());
            all_raw.extend(results);
        }
    }

    // Deduplicate by link
    let mut unique = std::collections::HashMap::new();
    for item in all_raw {
        if let Some(link) = item["link"].as_str() {
            unique.entry(link.to_string()).or_insert(item);
        }
    }
    let unique_results: Vec<_> = unique.into_values().collect();
    println!("[Rust Command] Total unique results: {}", unique_results.len());

    // 3. Summarize
    let results_context = if unique_results.is_empty() {
        "No search results found.".to_string()
    } else {
        unique_results.iter().map(|r| {
            format!("Title: {}\nLink: {}\nSnippet: {}\n---", 
                r["title"].as_str().unwrap_or("N/A"),
                r["link"].as_str().unwrap_or("N/A"),
                r["snippet"].as_str().unwrap_or("N/A")
            )
        }).collect::<Vec<_>>().join("\n")
    };

    let summary_template = prompts["summaryCurator"]["prompt"].as_str().ok_or("Missing summary prompt")?;
    let summary_system = prompts["summaryCurator"]["system"].as_str().unwrap_or("You are a curator.");

    let summary_prompt = summary_template
        .replace("{name}", &interest.name)
        .replace("{description}", interest.description.as_deref().unwrap_or("N/A"))
        .replace("{results}", &results_context);

    let summary_raw = generate_gemini_text(&summary_prompt, summary_system, &ai_key).await?;
    println!("[Rust Command] Raw Summary response: {}", summary_raw);
    let clean_summary = extract_json(&summary_raw);
    let data: serde_json::Value = serde_json::from_str(&clean_summary).map_err(|e| {
        format!("Failed to parse summary JSON ({}): {}", e, clean_summary)
    })?;

    println!("[Rust Command] Successfully generated summary for: {}", interest.name);

    Ok(FormattedResult {
        id: uuid::Uuid::new_v4().to_string(),
        interest_id: interest.id.clone(),
        search_id: uuid::Uuid::new_v4().to_string(),
        formatted_html: data["formattedHtml"].as_str().unwrap_or("").to_string(),
        formatted_text: data["formattedText"].as_str().unwrap_or("").to_string(),
        summary: data["summary"].as_str().unwrap_or("").to_string(),
        key_points: data["keyPoints"].as_array()
            .map(|a| a.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect())
            .unwrap_or_default(),
        items: data["items"].as_array()
            .map(|a| a.iter().map(|v| DiscreteItem {
                id: v["id"].as_str().map(|s| s.to_string()).unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
                item_type: v["type"].as_str().unwrap_or("general").to_string(),
                title: v["title"].as_str().unwrap_or("N/A").to_string(),
                summary: v["summary"].as_str().unwrap_or_default().to_string(),
                url: v["url"].as_str().unwrap_or_default().to_string(),
                date: v["date"].as_str().map(|s| s.to_string()),
                location: v["location"].as_str().map(|s| s.to_string()),
                source: v["source"].as_str().map(|s| s.to_string()),
            }).collect()),
        sources: data["sources"].as_array()
            .map(|a| a.iter().map(|v| Source {
                title: v["title"].as_str().unwrap_or("N/A").to_string(),
                url: v["url"].as_str().unwrap_or("N/A").to_string(),
                date: v["date"].as_str().map(|s| s.to_string()),
            }).collect())
            .unwrap_or_default(),
        generated_at: chrono::Utc::now().to_rfc3339(),
    })
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn send_background_notification<R: Runtime>(app: &tauri::AppHandle<R>) {
    let _ = app.notification()
        .builder()
        .title("Running in Background")
        .body("Interester is still running in the system tray. Use the tray menu to quit fully.")
        .show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
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
                
                // Add Edit menu for keyboard shortcuts on macOS
                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[
                        &MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?,
                        &MenuItem::with_id(app, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?,
                        &tauri::menu::PredefinedMenuItem::separator(app)?,
                        &MenuItem::with_id(app, "cut", "Cut", true, Some("CmdOrCtrl+X"))?,
                        &MenuItem::with_id(app, "copy", "Copy", true, Some("CmdOrCtrl+C"))?,
                        &MenuItem::with_id(app, "paste", "Paste", true, Some("CmdOrCtrl+V"))?,
                        &MenuItem::with_id(app, "selectall", "Select All", true, Some("CmdOrCtrl+A"))?,
                    ],
                ).map_err(|e| e.to_string())?;

                let app_menu = Menu::with_items(app, &[
                    &Submenu::with_items(app, "App", true, &[&show_menu_i, &quit_menu_i]).map_err(|e| e.to_string())?,
                    &edit_menu,
                ]).map_err(|e| e.to_string())?;
                app.set_menu(app_menu).map_err(|e| e.to_string())?;
                
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
                send_background_notification(window.app_handle());
            }
        });

    builder
        .invoke_handler(tauri::generate_handler![greet, run_search_scan, get_secret, set_secret, delete_secret])
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
                    send_background_notification(app_handle);
                }
            }
        });
}
