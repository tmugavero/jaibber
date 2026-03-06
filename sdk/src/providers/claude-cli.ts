import { spawn } from "child_process";
import type { Provider, ClaudeCLIProviderOptions } from "./base.js";

/**
 * Claude CLI provider — shells out to locally-installed `claude` CLI.
 * No API key needed; uses whatever auth the local Claude CLI has.
 */
export class ClaudeCLIProvider implements Provider {
  private projectDir: string;

  constructor(options: ClaudeCLIProviderOptions = {}) {
    this.projectDir = options.projectDir ?? process.cwd();
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

    const child = spawn("claude", ["--print", "--dangerously-skip-permissions", fullPrompt], {
      cwd: this.projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const stdout = child.stdout!;

    // Yield stdout data as chunks
    for await (const chunk of stdout) {
      const text = chunk.toString();
      if (text) yield text;
    }

    // Wait for process exit
    const exitCode = await new Promise<number | null>((resolve) => {
      child.on("close", resolve);
    });

    if (exitCode !== 0 && exitCode !== null) {
      // If we got output, treat as success (matches Rust got_output pattern)
      if (!stderr.trim()) return;
      throw new Error(`Claude CLI exited with code ${exitCode}: ${stderr.trim()}`);
    }
  }
}
