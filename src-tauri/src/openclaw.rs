//! OpenClaw integration — auto-discovers local gateway config and streams
//! responses via the OpenAI-compatible HTTP API.

use tauri::Emitter;
use futures_util::StreamExt;

/// Discovered OpenClaw gateway configuration.
pub struct OpenClawConfig {
    pub url: String,
    pub auth_token: String,
}

/// Auto-discover a local OpenClaw gateway by reading ~/.openclaw/openclaw.json.
pub fn discover_openclaw() -> Result<OpenClawConfig, String> {
    let home = dirs_home();
    let config_path = std::path::Path::new(&home).join(".openclaw").join("openclaw.json");

    if !config_path.exists() {
        return Err(format!(
            "OpenClaw config not found at {}. Install OpenClaw and run `openclaw gateway start`.",
            config_path.display()
        ));
    }

    let contents = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read {}: {e}", config_path.display()))?;

    let json: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Invalid JSON in {}: {e}", config_path.display()))?;

    // Extract gateway.auth.token
    let auth_token = json
        .get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();

    // Extract gateway.port (default 18789)
    let port = json
        .get("gateway")
        .and_then(|g| g.get("port"))
        .and_then(|p| p.as_u64())
        .unwrap_or(18789);

    let url = format!("http://localhost:{}", port);

    Ok(OpenClawConfig { url, auth_token })
}

/// Stream a response from the OpenClaw gateway via SSE.
///
/// Sends a chat completion request with `stream: true` and parses the
/// Server-Sent Events response, emitting `"agent-chunk"` Tauri events
/// for each text delta — same schema as the CLI providers.
pub async fn stream_openclaw(
    config: &OpenClawConfig,
    system_prompt: &str,
    prompt: &str,
    response_id: &str,
    window: &tauri::Window,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    // Build messages array
    let mut messages = Vec::new();
    if !system_prompt.is_empty() {
        messages.push(serde_json::json!({
            "role": "system",
            "content": system_prompt,
        }));
    }
    messages.push(serde_json::json!({
        "role": "user",
        "content": prompt,
    }));

    let body = serde_json::json!({
        "model": "default",
        "stream": true,
        "messages": messages,
    });

    let mut request = client
        .post(format!("{}/v1/chat/completions", config.url))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(120));

    if !config.auth_token.is_empty() {
        request = request.header("Authorization", format!("Bearer {}", config.auth_token));
    }

    let response = request
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                format!(
                    "Cannot connect to OpenClaw gateway at {}. \
                     Make sure it's running: `openclaw gateway start`",
                    config.url
                )
            } else {
                format!("OpenClaw request failed: {e}")
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("OpenClaw returned {status}: {text}"));
    }

    // Read the SSE stream
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream read error: {e}"))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        // Process complete lines from the buffer
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            // SSE format: "data: {json}" or "data: [DONE]"
            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" {
                    // Stream complete
                    let _ = window.emit("agent-chunk", serde_json::json!({
                        "responseId": response_id,
                        "chunk": "",
                        "done": true,
                        "error": serde_json::Value::Null,
                    }));
                    return Ok(());
                }

                // Parse the SSE JSON and extract delta content
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(content) = json
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|t| t.as_str())
                    {
                        if !content.is_empty() {
                            let _ = window.emit("agent-chunk", serde_json::json!({
                                "responseId": response_id,
                                "chunk": content,
                                "done": false,
                                "error": serde_json::Value::Null,
                            }));
                        }
                    }
                }
            }
        }
    }

    // Stream ended without [DONE] — still mark as complete
    let _ = window.emit("agent-chunk", serde_json::json!({
        "responseId": response_id,
        "chunk": "",
        "done": true,
        "error": serde_json::Value::Null,
    }));

    Ok(())
}

/// Get the user's home directory.
fn dirs_home() -> String {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string())
}
