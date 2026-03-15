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

export interface OpenAIProviderOptions {
  /** OpenAI API key (sk-...) */
  apiKey: string;
  /** Model ID (default: "gpt-4o") */
  model?: string;
  /** Max tokens (default: 8192) */
  maxTokens?: number;
}

export interface GoogleProviderOptions {
  /** Google AI API key (AIza...) */
  apiKey: string;
  /** Model ID (default: "gemini-2.0-flash") */
  model?: string;
  /** Max tokens (default: 8192) */
  maxTokens?: number;
}

export interface ClaudeCLIProviderOptions {
  /** Working directory for Claude CLI (default: cwd) */
  projectDir?: string;
  /** Session ID for --resume (resumes a specific prior session) */
  sessionId?: string;
  /** If true and no sessionId, use --continue to resume last session in project dir */
  continueSession?: boolean;
}
