import type { Provider, OpenAIProviderOptions } from "./base.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MAX_TOKENS = 8192;

/**
 * OpenAI Chat Completions API provider.
 * Streams responses via SSE, same async generator pattern as AnthropicProvider.
 */
export class OpenAIProvider implements Provider {
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(options: OpenAIProviderOptions) {
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

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: fullText });

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        stream: true,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      if (status === 401) {
        throw new Error("Invalid OpenAI API key. Check your API key.");
      } else if (status === 429) {
        throw new Error("OpenAI API rate limit exceeded. Please wait and try again.");
      }
      throw new Error(`OpenAI API returned ${status}: ${text}`);
    }

    if (!response.body) {
      throw new Error("OpenAI API returned no response body");
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
            const content = json?.choices?.[0]?.delta?.content;
            if (content) yield content;
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
