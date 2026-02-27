//! Direct Anthropic Messages API integration — streams responses via SSE,
//! supports multimodal content (images, PDFs via URL source).

use tauri::Emitter;
use futures_util::StreamExt;
use crate::state::AttachmentInfo;

const DEFAULT_MODEL: &str = "claude-sonnet-4-20250514";
const MAX_TOKENS: u32 = 16384;
const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2024-10-22";

/// MIME types the Anthropic API accepts for image content blocks.
fn is_api_image_mime(mime: &str) -> bool {
    matches!(mime, "image/jpeg" | "image/png" | "image/gif" | "image/webp")
}

fn is_pdf_mime(mime: &str) -> bool {
    mime == "application/pdf"
}

fn is_text_mime(mime: &str) -> bool {
    mime.starts_with("text/")
        || mime == "application/json"
        || mime == "application/xml"
        || mime == "application/javascript"
        || mime == "application/typescript"
        || mime == "application/x-yaml"
        || mime == "application/toml"
}

fn is_text_filename(filename: &str) -> bool {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    matches!(ext.as_str(),
        "txt" | "ts" | "tsx" | "js" | "jsx" | "py" | "json" | "md" | "log" | "csv"
        | "yaml" | "yml" | "toml" | "rs" | "go" | "java" | "html" | "css" | "xml"
        | "sql" | "sh" | "bash" | "zsh" | "env" | "cfg" | "ini" | "conf" | "diff"
        | "patch" | "c" | "cpp" | "h" | "hpp" | "rb" | "php" | "swift" | "kt"
    )
}

/// Build content blocks for attachments.
/// Images and PDFs use URL source (blob URLs are public).
/// Text files are fetched and inlined.
async fn build_attachment_content_blocks(
    attachments: &[AttachmentInfo],
) -> Vec<serde_json::Value> {
    let mut blocks = Vec::new();
    let client = reqwest::Client::new();

    for att in attachments {
        if is_api_image_mime(&att.mime_type) {
            blocks.push(serde_json::json!({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": att.blob_url,
                }
            }));
        } else if is_pdf_mime(&att.mime_type) {
            blocks.push(serde_json::json!({
                "type": "document",
                "source": {
                    "type": "url",
                    "url": att.blob_url,
                }
            }));
        } else if is_text_mime(&att.mime_type) || is_text_filename(&att.filename) {
            match client.get(&att.blob_url).send().await {
                Ok(resp) if resp.status().is_success() => {
                    match resp.text().await {
                        Ok(text) => {
                            let truncated = if text.len() > 100_000 {
                                format!("{}... (truncated)", &text[..100_000])
                            } else {
                                text
                            };
                            blocks.push(serde_json::json!({
                                "type": "text",
                                "text": format!(
                                    "[File: {}]\n```\n{}\n```",
                                    att.filename, truncated
                                )
                            }));
                        }
                        Err(_) => {
                            blocks.push(serde_json::json!({
                                "type": "text",
                                "text": format!(
                                    "[File: {} ({} bytes) — could not read content]",
                                    att.filename, att.file_size
                                )
                            }));
                        }
                    }
                }
                _ => {
                    blocks.push(serde_json::json!({
                        "type": "text",
                        "text": format!(
                            "[File: {} ({} bytes) — could not fetch content]",
                            att.filename, att.file_size
                        )
                    }));
                }
            }
        } else {
            blocks.push(serde_json::json!({
                "type": "text",
                "text": format!(
                    "[File: {} ({} bytes, {}) — binary file, cannot display contents]",
                    att.filename, att.file_size, att.mime_type
                )
            }));
        }
    }

    blocks
}

/// Stream a response from the Anthropic Messages API via SSE.
///
/// Emits `"agent-chunk"` Tauri events with the same schema as CLI providers:
/// `{ responseId, chunk, done, error }`.
pub async fn stream_claude_api(
    api_key: &str,
    system_prompt: &str,
    prompt: &str,
    conversation_context: &str,
    attachments: &[AttachmentInfo],
    response_id: &str,
    window: &tauri::Window,
) -> Result<(), String> {
    tracing::info!(
        "[claude_api] Starting HTTP stream — {} attachments, prompt len={}, context len={}",
        attachments.len(),
        prompt.len(),
        conversation_context.len(),
    );
    let client = reqwest::Client::new();

    // Build user message content blocks
    let mut user_content: Vec<serde_json::Value> = Vec::new();

    // 1. Attachment content blocks (images, PDFs, text files)
    if !attachments.is_empty() {
        let att_blocks = build_attachment_content_blocks(attachments).await;
        user_content.extend(att_blocks);
    }

    // 2. Text prompt (conversation context + user message)
    let mut full_text = String::new();
    if !conversation_context.is_empty() {
        full_text.push_str(
            "Below is the recent conversation history for context. \
             Respond ONLY to the final user message. \
             Be conversational and concise — reply directly to the user as a chat participant. \
             Do NOT narrate your thought process, planning steps, or internal reasoning. \
             Do NOT describe actions you would take (e.g. \"I should...\", \"Let me...\", \"I will...\"). \
             Just answer.\n\n"
        );
        full_text.push_str(conversation_context);
        full_text.push_str("\n\n---\n\n");
    }
    full_text.push_str(prompt);

    user_content.push(serde_json::json!({
        "type": "text",
        "text": full_text,
    }));

    // Build messages array
    let messages = vec![
        serde_json::json!({
            "role": "user",
            "content": user_content,
        })
    ];

    // Build request body
    let mut body = serde_json::json!({
        "model": DEFAULT_MODEL,
        "max_tokens": MAX_TOKENS,
        "stream": true,
        "messages": messages,
    });

    if !system_prompt.is_empty() {
        body.as_object_mut().unwrap().insert(
            "system".to_string(),
            serde_json::json!(system_prompt),
        );
    }

    tracing::info!(
        "[claude_api] Sending request — model={}, content_blocks={}, system_len={}",
        DEFAULT_MODEL,
        user_content.len(),
        system_prompt.len(),
    );

    // Send request
    let response = client
        .post(ANTHROPIC_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .timeout(std::time::Duration::from_secs(300))
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Cannot connect to Anthropic API. Check your internet connection.".to_string()
            } else if e.is_timeout() {
                "Anthropic API request timed out.".to_string()
            } else {
                format!("Anthropic API request failed: {e}")
            }
        })?;

    tracing::info!("[claude_api] Response status: {}", response.status());

    // Check for HTTP errors
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();

        if status.as_u16() == 401 {
            return Err("Invalid Anthropic API key. Check your API key in Settings.".to_string());
        } else if status.as_u16() == 429 {
            return Err("Anthropic API rate limit exceeded. Please wait and try again.".to_string());
        } else if status.as_u16() == 400 {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                if let Some(msg) = json.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()) {
                    return Err(format!("Anthropic API error: {msg}"));
                }
            }
            return Err(format!("Anthropic API returned {status}: {text}"));
        } else {
            return Err(format!("Anthropic API returned {status}: {text}"));
        }
    }

    // Read the SSE stream — same pattern as openclaw.rs
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream read error: {e}"))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" {
                    let _ = window.emit("agent-chunk", serde_json::json!({
                        "responseId": response_id,
                        "chunk": "",
                        "done": true,
                        "error": serde_json::Value::Null,
                    }));
                    return Ok(());
                }

                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    let event_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

                    match event_type {
                        "content_block_delta" => {
                            if let Some(text) = json
                                .get("delta")
                                .and_then(|d| d.get("text"))
                                .and_then(|t| t.as_str())
                            {
                                if !text.is_empty() {
                                    let _ = window.emit("agent-chunk", serde_json::json!({
                                        "responseId": response_id,
                                        "chunk": text,
                                        "done": false,
                                        "error": serde_json::Value::Null,
                                    }));
                                }
                            }
                        }
                        "message_stop" => {
                            let _ = window.emit("agent-chunk", serde_json::json!({
                                "responseId": response_id,
                                "chunk": "",
                                "done": true,
                                "error": serde_json::Value::Null,
                            }));
                            return Ok(());
                        }
                        "error" => {
                            let err_msg = json
                                .get("error")
                                .and_then(|e| e.get("message"))
                                .and_then(|m| m.as_str())
                                .unwrap_or("Unknown API error");
                            let _ = window.emit("agent-chunk", serde_json::json!({
                                "responseId": response_id,
                                "chunk": "",
                                "done": false,
                                "error": err_msg,
                            }));
                            return Ok(());
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    // Stream ended without message_stop — still mark as complete
    let _ = window.emit("agent-chunk", serde_json::json!({
        "responseId": response_id,
        "chunk": "",
        "done": true,
        "error": serde_json::Value::Null,
    }));

    Ok(())
}
