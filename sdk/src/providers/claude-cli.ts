import { spawn } from "child_process";
import { createInterface } from "readline";
import type { Provider, ClaudeCLIProviderOptions } from "./base.js";

/**
 * Claude CLI provider — shells out to locally-installed `claude` CLI.
 * Uses `--output-format stream-json` to parse structured output and capture session IDs.
 * No API key needed; uses whatever auth the local Claude CLI has.
 */
export class ClaudeCLIProvider implements Provider {
  private projectDir: string;
  private sessionId?: string;
  private continueSession: boolean;

  /** Last session ID captured from Claude CLI stream-json output. */
  public lastSessionId?: string;

  constructor(options: ClaudeCLIProviderOptions = {}) {
    this.projectDir = options.projectDir ?? process.cwd();
    this.sessionId = options.sessionId;
    this.continueSession = options.continueSession ?? false;
  }

  /** Update session ID for future --resume calls. */
  setSessionId(id: string): void {
    this.sessionId = id;
    this.continueSession = false;
  }

  /** Clear session state (e.g. on conversation clear). */
  clearSession(): void {
    this.sessionId = undefined;
    this.lastSessionId = undefined;
    this.continueSession = false;
  }

  async *generate(
    prompt: string,
    systemPrompt: string,
    conversationContext: string,
  ): AsyncGenerator<string, void, unknown> {
    let fullPrompt = "";
    if (systemPrompt) {
      fullPrompt += `[System Instructions]\n${systemPrompt}\n\n`;
    }
    if (conversationContext) {
      fullPrompt +=
        "Below is the recent conversation history for context. " +
        "Respond ONLY to the final user message. " +
        "Be conversational and concise — reply directly to the user as a chat participant. " +
        "Do NOT narrate your thought process, planning steps, or internal reasoning. " +
        'Do NOT describe actions you would take (e.g. "I should...", "Let me...", "I will..."). ' +
        "Just answer.\n\n";
      fullPrompt += conversationContext;
      fullPrompt += "\n\n---\n\n";
    }
    fullPrompt += prompt;

    // Build args — use stream-json to parse structured output and capture session IDs
    const args = ["--print", "--output-format", "stream-json", "--dangerously-skip-permissions"];
    if (this.sessionId) {
      // Validate session ID to prevent injection (alphanumeric + hyphens only)
      if (/^[a-zA-Z0-9-]+$/.test(this.sessionId)) {
        args.push("--resume", this.sessionId);
      }
    } else if (this.continueSession) {
      args.push("--continue");
    }

    const child = spawn("claude", args, {
      cwd: this.projectDir,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    child.stdin!.write(fullPrompt);
    child.stdin!.end();

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Parse stream-json line by line (same format as Rust extract_text_claude)
    const rl = createInterface({ input: child.stdout!, crlfDelay: Infinity });
    let gotOutput = false;

    for await (const line of rl) {
      try {
        const json = JSON.parse(line);

        // Capture session_id from initial events
        if (json.session_id && typeof json.session_id === "string") {
          this.lastSessionId = json.session_id;
        }

        // Extract text from content_block_delta events
        if (json.delta?.text) {
          gotOutput = true;
          yield json.delta.text as string;
          continue;
        }

        // Extract text from complete message events
        const content = json.content ?? json.message?.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === "text" && item.text) {
              gotOutput = true;
              yield item.text as string;
            }
          }
        }
      } catch {
        // Non-JSON line — emit as raw text (fallback)
        if (line.trim()) {
          gotOutput = true;
          yield line + "\n";
        }
      }
    }

    const exitCode = await new Promise<number | null>((resolve) => {
      child.on("close", resolve);
    });

    if (exitCode !== 0 && exitCode !== null) {
      if (gotOutput || !stderr.trim()) return;
      throw new Error(`Claude CLI exited with code ${exitCode}: ${stderr.trim()}`);
    }
  }
}
