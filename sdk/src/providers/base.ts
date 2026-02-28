/**
 * Provider interface for LLM backends.
 * Implementations return an async generator that yields text chunks.
 */
export interface Provider {
  generate(
    prompt: string,
    systemPrompt: string,
    conversationContext: string,
  ): AsyncGenerator<string, void, unknown>;
}

export interface AnthropicProviderOptions {
  /** Anthropic API key (sk-ant-...) */
  apiKey: string;
  /** Model ID (default: "claude-sonnet-4-20250514") */
  model?: string;
  /** Max tokens (default: 8192) */
  maxTokens?: number;
}
