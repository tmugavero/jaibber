import type { Provider, AnthropicProviderOptions } from "./base.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2024-10-22";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Anthropic Messages API provider.
 * Streams responses via SSE, same pattern as src-tauri/src/claude_api.rs.
 */
export class AnthropicProvider implements Provider {
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(options: AnthropicProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async *generate(
    prompt: string,
    systemPrompt: string,
    conversationContext: string,
  ): AsyncGenerator<string, void, unknown> {
    // Build full prompt with context preamble
    // Matches process_commands.rs lines 138-150 format
    let fullText = "";
    if (conversationContext) {
      fullText +=
        "Below is the recent conversation history for context. " +
        "Respond ONLY to the final user message. " +
        "Be conversational and concise — reply directly to the user as a chat participant. " +
        "Do NOT narrate your thought process, planning steps, or internal reasoning. " +
        'Do NOT describe actions you would take (e.g. "I should...", "Let me...", "I will..."). ' +
        "Just answer.\n\n";
      fullText += conversationContext;
      fullText += "\n\n---\n\n";
    }
    fullText += prompt;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      stream: true,
      messages: [
        {
          role: "user",
          content: fullText,
        },
      ],
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;

      if (status === 401) {
        throw new Error(
          "Invalid Anthropic API key. Check your API key.",
        );
      } else if (status === 429) {
        throw new Error(
          "Anthropic API rate limit exceeded. Please wait and try again.",
        );
      } else if (status === 400) {
        try {
          const json = JSON.parse(text);
          const msg = json?.error?.message;
          if (msg) throw new Error(`Anthropic API error: ${msg}`);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Anthropic")) throw e;
        }
        throw new Error(`Anthropic API returned ${status}: ${text}`);
      } else {
        throw new Error(`Anthropic API returned ${status}: ${text}`);
      }
    }

    if (!response.body) {
      throw new Error("Anthropic API returned no response body");
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const newlinePos = buffer.indexOf("\n");
          if (newlinePos === -1) break;

          const line = buffer.slice(0, newlinePos).replace(/\r$/, "");
          buffer = buffer.slice(newlinePos + 1);

          if (!line || !line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (data === "[DONE]") return;

          try {
            const json = JSON.parse(data);
            const eventType = json?.type;

            if (eventType === "content_block_delta") {
              const text = json?.delta?.text;
              if (text) yield text;
            } else if (eventType === "message_stop") {
              return;
            } else if (eventType === "error") {
              const errMsg =
                json?.error?.message ?? "Unknown Anthropic API error";
              throw new Error(errMsg);
            }
            // Ignore: message_start, content_block_start, content_block_stop, ping
          } catch (e) {
            if (e instanceof Error && e.message !== "Unknown Anthropic API error") {
              // JSON parse error — skip malformed event
              if (e instanceof SyntaxError) continue;
              throw e;
            }
            throw e;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
