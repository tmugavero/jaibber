//! Agent provider abstraction — supports multiple CLI backends (Claude, Codex,
//! Gemini, custom) with a unified interface for command building, output parsing,
//! and auth-error detection.

/// Known agent provider types. Matches the `agentProvider` field from the frontend.
#[derive(Debug, Clone, PartialEq)]
pub enum ProviderKind {
    Claude,
    Codex,
    Gemini,
    OpenClaw,
    Custom,
}

impl ProviderKind {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "codex" => Self::Codex,
            "gemini" => Self::Gemini,
            "openclaw" => Self::OpenClaw,
            "custom" => Self::Custom,
            _ => Self::Claude, // default
        }
    }
}

/// Configuration for a specific agent provider invocation.
pub struct ProviderConfig {
    pub kind: ProviderKind,
    /// For custom providers: the command template with `{prompt}` placeholder.
    pub custom_command: Option<String>,
}

/// Result of building a provider command.
pub struct ProviderCommand {
    /// The full bash command to execute (after shell env preamble).
    pub bash_command: String,
    /// Environment variable name for the API key (for fallback auth).
    pub api_key_env_var: Option<&'static str>,
}

/// Build the shell preamble that sources the user's environment (nvm, bashrc, etc.)
/// and sets up PATH. Shared across all providers.
pub fn build_shell_env() -> String {
    r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null
[ -f "$HOME/.profile" ] && . "$HOME/.profile" 2>/dev/null
[ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc" 2>/dev/null
export PATH="$PATH:/usr/local/bin:/usr/bin"
# Windows: add Claude Code install dir (version-agnostic glob)
for _d in "$HOME/AppData/Roaming/Claude/claude-code"/*/; do
  [ -d "$_d" ] && export PATH="$PATH:$_d"
done"#.to_string()
}

// ── Command builders ──────────────────────────────────────────────────

impl ProviderConfig {
    /// Build the CLI command for one-shot (non-streaming) execution.
    pub fn build_oneshot_cmd(&self) -> ProviderCommand {
        let env = build_shell_env();
        match self.kind {
            ProviderKind::Claude => ProviderCommand {
                bash_command: format!(
                    "{}\nclaude --print --dangerously-skip-permissions \"$JAIBBER_PROMPT\"",
                    env
                ),
                api_key_env_var: Some("ANTHROPIC_API_KEY"),
            },
            ProviderKind::Codex => ProviderCommand {
                bash_command: format!(
                    "{}\ncodex --quiet --full-auto \"$JAIBBER_PROMPT\"",
                    env
                ),
                api_key_env_var: Some("OPENAI_API_KEY"),
            },
            ProviderKind::Gemini => ProviderCommand {
                bash_command: format!(
                    "{}\ngemini -p \"$JAIBBER_PROMPT\"",
                    env
                ),
                api_key_env_var: Some("GOOGLE_API_KEY"),
            },
            ProviderKind::OpenClaw => {
                // OpenClaw uses HTTP, not CLI — this should never be called.
                // The process_commands module branches before reaching command building.
                ProviderCommand {
                    bash_command: "echo 'OpenClaw uses HTTP — not a CLI provider'".to_string(),
                    api_key_env_var: None,
                }
            }
            ProviderKind::Custom => {
                let template = self.custom_command.as_deref().unwrap_or("echo 'No custom command configured'");
                // Replace {prompt} placeholder with the env var reference
                let cmd = template.replace("{prompt}", "\"$JAIBBER_PROMPT\"");
                ProviderCommand {
                    bash_command: format!("{}\n{}", env, cmd),
                    api_key_env_var: None,
                }
            }
        }
    }

    /// Build the CLI command for streaming execution.
    pub fn build_stream_cmd(&self, has_system_prompt: bool) -> ProviderCommand {
        let env = build_shell_env();
        match self.kind {
            ProviderKind::Claude => {
                let cmd = if has_system_prompt {
                    format!(
                        "{}\nclaude --print --verbose --output-format stream-json \
                         --append-system-prompt \"$JAIBBER_SYSTEM\" \
                         --dangerously-skip-permissions \"$JAIBBER_PROMPT\"",
                        env
                    )
                } else {
                    format!(
                        "{}\nclaude --print --verbose --output-format stream-json \
                         --dangerously-skip-permissions \"$JAIBBER_PROMPT\"",
                        env
                    )
                };
                ProviderCommand {
                    bash_command: cmd,
                    api_key_env_var: Some("ANTHROPIC_API_KEY"),
                }
            }
            ProviderKind::Codex => {
                // Codex CLI streams to stdout by default. System prompt via -i flag.
                let cmd = if has_system_prompt {
                    format!(
                        "{}\ncodex --quiet --full-auto -i \"$JAIBBER_SYSTEM\" \"$JAIBBER_PROMPT\"",
                        env
                    )
                } else {
                    format!("{}\ncodex --quiet --full-auto \"$JAIBBER_PROMPT\"", env)
                };
                ProviderCommand {
                    bash_command: cmd,
                    api_key_env_var: Some("OPENAI_API_KEY"),
                }
            }
            ProviderKind::Gemini => {
                // Gemini CLI: -p for prompt mode (non-interactive).
                // System prompt via env var or prepended to prompt.
                let cmd = if has_system_prompt {
                    format!(
                        "{}\ngemini -p \"$JAIBBER_SYSTEM\n\n$JAIBBER_PROMPT\"",
                        env
                    )
                } else {
                    format!("{}\ngemini -p \"$JAIBBER_PROMPT\"", env)
                };
                ProviderCommand {
                    bash_command: cmd,
                    api_key_env_var: Some("GOOGLE_API_KEY"),
                }
            }
            ProviderKind::OpenClaw => self.build_oneshot_cmd(), // HTTP path — never called
            ProviderKind::Custom => {
                // Custom: same as oneshot — user is responsible for their command template.
                self.build_oneshot_cmd()
            }
        }
    }

    /// Get the API key env var name for this provider (for fallback auth).
    pub fn api_key_env_var(&self) -> Option<&'static str> {
        match self.kind {
            ProviderKind::Claude => Some("ANTHROPIC_API_KEY"),
            ProviderKind::Codex => Some("OPENAI_API_KEY"),
            ProviderKind::Gemini => Some("GOOGLE_API_KEY"),
            ProviderKind::OpenClaw | ProviderKind::Custom => None,
        }
    }

    /// Get the human-friendly CLI install instruction for error messages.
    pub fn install_hint(&self) -> &'static str {
        match self.kind {
            ProviderKind::Claude => {
                "Agent CLI (Claude Code) is not installed or not on PATH.\n\
                 Install it with: npm install -g @anthropic-ai/claude-code\n\
                 Then restart Jaibber."
            }
            ProviderKind::Codex => {
                "Agent CLI (Codex) is not installed or not on PATH.\n\
                 Install it with: npm install -g @openai/codex\n\
                 Then restart Jaibber."
            }
            ProviderKind::Gemini => {
                "Agent CLI (Gemini) is not installed or not on PATH.\n\
                 Install it with: npm install -g @anthropic-ai/gemini-cli\n\
                 Then restart Jaibber."
            }
            ProviderKind::OpenClaw => {
                "OpenClaw gateway not found. Install OpenClaw and run `openclaw gateway start`.\n\
                 https://openclaw.ai"
            }
            ProviderKind::Custom => {
                "Custom agent command not found. Verify the command is installed and on PATH."
            }
        }
    }

    /// Get the re-auth instruction for when auth fallback is needed.
    pub fn reauth_hint(&self) -> &'static str {
        match self.kind {
            ProviderKind::Claude => "Run `claude login` to restore local auth",
            ProviderKind::Codex => "Run `codex auth` to restore local auth",
            ProviderKind::Gemini => "Run `gemini auth login` to restore local auth",
            ProviderKind::OpenClaw => "Check your OpenClaw gateway config at ~/.openclaw/openclaw.json",
            ProviderKind::Custom => "Re-authenticate your agent CLI",
        }
    }
}

// ── Output parsing ────────────────────────────────────────────────────

/// Extract text content from a stream output line, based on the provider.
/// Returns the extracted text, or empty string if the line should be skipped.
pub fn extract_text_from_line(kind: &ProviderKind, line: &str) -> String {
    match kind {
        ProviderKind::Claude => extract_text_claude(line),
        // Codex, Gemini, and Custom all use raw text output (no JSON parsing needed)
        _ => {
            if line.trim().is_empty() {
                String::new()
            } else {
                format!("{}\n", line)
            }
        }
    }
}

/// Claude-specific: parse stream-json event format.
fn extract_text_claude(line: &str) -> String {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
        // Partial content block delta: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
        if let Some(delta) = json.get("delta") {
            if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                return text.to_string();
            }
        }

        // Complete message: {"type":"message","content":[{"type":"text","text":"..."}]}
        // or: {"message":{"content":[{"type":"text","text":"..."}]}}
        let content = json.get("content")
            .or_else(|| json.get("message").and_then(|m| m.get("content")));
        if let Some(serde_json::Value::Array(items)) = content {
            let mut text = String::new();
            for item in items {
                if item.get("type").and_then(|t| t.as_str()) == Some("text") {
                    if let Some(t) = item.get("text").and_then(|t| t.as_str()) {
                        text.push_str(t);
                    }
                }
            }
            return text;
        }

        String::new()
    } else if !line.trim().is_empty() {
        // Non-JSON line from Claude — emit as raw text (fallback)
        format!("{}\n", line)
    } else {
        String::new()
    }
}

// ── Auth error detection ──────────────────────────────────────────────

/// Patterns that indicate an authentication/authorization failure in stderr.
const AUTH_ERROR_PATTERNS: &[&str] = &[
    "unauthorized",
    "authentication",
    "401",
    "expired",
    "login required",
    "invalid api key",
    "invalid_api_key",
    "api key",
    "permission denied",
    "access denied",
    "not authenticated",
    "auth token",
    "token expired",
    "credentials",
];

/// Check if stderr output suggests an auth failure.
pub fn is_auth_error(stderr: &str) -> bool {
    let lower = stderr.to_lowercase();
    AUTH_ERROR_PATTERNS.iter().any(|p| lower.contains(p))
}
