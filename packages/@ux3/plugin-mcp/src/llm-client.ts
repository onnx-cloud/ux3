/**
 * LLMClient adapters for different LLM providers.
 * Unified interface for Anthropic, OpenAI-compatible, and generic endpoints.
 */

export interface LLMClientConfig {
  type?: 'generic' | 'openai' | 'anthropic';
  endpoint?: string;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SamplingRequest {
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface SamplingResult {
  content: { type: string; text?: string; name?: string; input?: Record<string, unknown>; id?: string }[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}

export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

function isRetryable(error: LLMError): boolean {
  if (error.code === 'rate_limited') return true;
  if (error.code === 'network_error') return true;
  if (error.statusCode && error.statusCode >= 500) return true;
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelay: number,
): Promise<T> {
  let lastError: LLMError | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const llmError = e instanceof LLMError ? e
        : new LLMError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`, 'unknown_error');
      lastError = llmError;

      if (!isRetryable(llmError) || attempt >= maxRetries) throw llmError;

      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError!;
}

/**
 * Base LLMClient interface.
 * Implementations handle provider-specific HTTP calls, format conversions, and error handling.
 */
export interface LLMClient {
  config: LLMClientConfig;
  call(req: SamplingRequest, signal?: AbortSignal): Promise<SamplingResult>;
}

/**
 * OpenAI-compatible client (GPT-4, Claude via OpenAI API, etc.)
 */
export class OpenAIClient implements LLMClient {
  config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = {
      type: 'openai',
      endpoint: 'http://localhost:8080/v1/chat/completions',
      model: 'gpt-4o',
      ...config,
    };
  }

  async call(req: SamplingRequest, signal?: AbortSignal): Promise<SamplingResult> {
    const maxRetries = this.config.maxRetries ?? 0;
    const retryDelay = this.config.retryDelay ?? 1000;
    return withRetry(() => this.innerCall(req, signal), maxRetries, retryDelay);
  }

  private async innerCall(req: SamplingRequest, signal?: AbortSignal): Promise<SamplingResult> {
    const endpoint = this.config.endpoint || 'http://localhost:8080/v1/chat/completions';
    const body: any = {
      model: this.config.model || 'gpt-4o',
      messages: req.messages,
      max_tokens: req.maxTokens ?? this.config.maxTokens ?? 4096,
      temperature: req.temperature ?? this.config.temperature,
    };

    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema || { type: 'object', properties: {} },
        },
      }));
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        const statusCode = res.status;
        let code = `openai_${statusCode}`;
        if (statusCode === 429) code = 'rate_limited';
        throw new LLMError(
          `OpenAI API error: ${statusCode} ${text}`,
          code,
          statusCode,
        );
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      if (!message) {
        throw new LLMError('No message in response', 'no_message');
      }

      const content: any[] = [];
      let stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' = 'end_turn';

      if (message.content) {
        content.push({ type: 'text', text: message.content });
      }

      if (message.tool_calls?.length) {
        for (const tc of message.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: typeof tc.function.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function.arguments,
          });
        }
        stopReason = 'tool_use';
      }

      if (choice.finish_reason === 'length') stopReason = 'max_tokens';
      if (choice.finish_reason === 'stop') stopReason = 'end_turn';

      return { content, stopReason };
    } catch (e) {
      if (e instanceof LLMError) throw e;
      if (e instanceof TypeError && e.message.includes('fetch')) {
        throw new LLMError(`Network error: ${e.message}`, 'network_error', undefined, e);
      }
      throw new LLMError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`, 'unknown_error', undefined, e instanceof Error ? e : undefined);
    }
  }
}

/**
 * Anthropic client (Claude via Anthropic API)
 */
export class AnthropicClient implements LLMClient {
  config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = {
      type: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-opus-4-1',
      ...config,
    };
  }

  async call(req: SamplingRequest, signal?: AbortSignal): Promise<SamplingResult> {
    const maxRetries = this.config.maxRetries ?? 0;
    const retryDelay = this.config.retryDelay ?? 1000;
    return withRetry(() => this.innerCall(req, signal), maxRetries, retryDelay);
  }

  private async innerCall(req: SamplingRequest, signal?: AbortSignal): Promise<SamplingResult> {
    const endpoint = this.config.endpoint || 'https://api.anthropic.com/v1/messages';
    const body: any = {
      model: this.config.model || 'claude-opus-4-1',
      messages: req.messages,
      max_tokens: req.maxTokens ?? this.config.maxTokens ?? 4096,
      temperature: req.temperature ?? this.config.temperature,
    };

    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema || { type: 'object', properties: {} },
      }));
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        const statusCode = res.status;
        let code = `anthropic_${statusCode}`;
        if (statusCode === 401) code = 'auth_failed';
        else if (statusCode === 429) code = 'rate_limited';
        else if (statusCode === 400 && text.includes('max_tokens')) code = 'context_length_exceeded';
        throw new LLMError(
          `Anthropic API error: ${res.status} ${text}`,
          code,
          statusCode,
        );
      }

      const data = await res.json();
      const content: any[] = [];
      let stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' = 'end_turn';

      for (const block of data.content || []) {
        if (block.type === 'text') {
          content.push({ type: 'text', text: block.text });
        } else if (block.type === 'tool_use') {
          content.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input || {},
          });
        }
      }

      if (data.stop_reason === 'tool_use') stopReason = 'tool_use';
      if (data.stop_reason === 'max_tokens') stopReason = 'max_tokens';

      return { content, stopReason };
    } catch (e) {
      if (e instanceof LLMError) throw e;
      if (e instanceof TypeError && e.message.includes('fetch')) {
        throw new LLMError(`Network error: ${e.message}`, 'network_error', undefined, e);
      }
      throw new LLMError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`, 'unknown_error', undefined, e instanceof Error ? e : undefined);
    }
  }
}

/**
 * Factory function to create an LLMClient based on config.
 */
export function createLLMClient(config: LLMClientConfig): LLMClient {
  const type = config.type || 'openai';
  
  if (type === 'anthropic') {
    return new AnthropicClient(config);
  }
  if (type === 'openai' || type === 'generic') {
    return new OpenAIClient(config);
  }

  throw new Error(`Unknown LLM client type: ${type}`);
}
