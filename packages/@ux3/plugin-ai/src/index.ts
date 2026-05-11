import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

export interface AIConfig {
  endpoint?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface StreamEvent {
  type: 'chunk' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: { id: string; name: string; arguments: string };
  error?: string;
}

function readConfig(app: any): AIConfig {
  return (AiPlugin as any).config ?? app.config?.plugins?.['@ux3/plugin-ai'] ?? {};
}

export const AiPlugin: Plugin = {
  name: '@ux3/plugin-ai',
  version,
  description: 'AI/LLM integration for UX3 — chat, streaming, agents, tool calling, and search',

  install(app) {
    const cfg = readConfig(app);

    app.registerService?.('ai', () => ({
      get config(): AIConfig { return cfg; },

      async chat(
        messages: ChatMessage[],
        tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>,
      ): Promise<ChatMessage> {
        const body: any = {
          model: cfg.model ?? 'claude-sonnet-4-20250514',
          max_tokens: cfg.maxTokens ?? 4096,
          messages,
        };
        if (tools?.length) body.tools = tools;

        const res = await fetch(cfg.endpoint ?? 'http://localhost:8080/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cfg.apiKey ? { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`AI chat failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        const content = data.content?.[0];
        return {
          role: 'assistant',
          content: content?.text ?? content?.input ?? JSON.stringify(data),
        };
      },

      async *stream(
        messages: ChatMessage[],
      ): AsyncGenerator<StreamEvent, void, undefined> {
        const body: any = {
          model: cfg.model ?? 'claude-sonnet-4-20250514',
          max_tokens: cfg.maxTokens ?? 4096,
          messages,
          stream: true,
        };

        const res = await fetch(cfg.endpoint ?? 'http://localhost:8080/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cfg.apiKey ? { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          yield { type: 'error', error: `AI stream failed: ${res.status}` };
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          yield { type: 'error', error: 'No response body' };
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const event = JSON.parse(line.slice(6));
              const delta = event.delta ?? event.content_block_delta ?? {};
              if (delta.text) {
                yield { type: 'chunk', content: delta.text };
              } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
                const tc = event.content_block;
                yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, arguments: '' } };
              }
            } catch { /* skip bad lines */ }
          }
        }
        yield { type: 'done' };
      },

      async search(query: string): Promise<string> {
        const res = await fetch(cfg.endpoint ?? 'http://localhost:8080/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(cfg.apiKey ? { 'x-api-key': cfg.apiKey } : {}) },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error(`AI search failed: ${res.status}`);
        return res.text();
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).ai = { endpoint: cfg.endpoint, model: cfg.model };
  },
};

export default AiPlugin;
