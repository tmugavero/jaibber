import type { Provider, GoogleProviderOptions } from "./base.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Google Gemini API provider.
 * Uses the streamGenerateContent endpoint with SSE streaming.
 */
export class GoogleProvider implements Provider {
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(options: GoogleProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async *generate(
    prompt: string,
    systemPrompt: string,
    conversationContext: string,
  ): AsyncGenerator<string, void, unknown> {
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: fullText }] }],
      generationConfig: {
        maxOutputTokens: this.maxTokens,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      if (status === 400 || status === 403) {
        throw new Error(`Google AI API error (${status}): ${text}`);
      } else if (status === 429) {
        throw new Error("Google AI API rate limit exceeded. Please wait and try again.");
      }
      throw new Error(`Google AI API returned ${status}: ${text}`);
    }

    if (!response.body) {
      throw new Error("Google AI API returned no response body");
    }

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
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
