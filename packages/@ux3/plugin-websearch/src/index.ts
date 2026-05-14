import type { Plugin } from '../../../../src/plugin/registry.js';
import { websearchToolHandlers, websearchResourceHandlers } from './tools.js';

export const WebsearchPlugin: Plugin = {
  name: '@ux3/plugin-websearch',
  version: '0.1.0',
  description: 'Web search plugin with Brave provider support and generic search tools',
  displayName: 'Web Search',
  author: 'UX3 Team',
  categories: ['analysis', 'utility'],
  ux3PeerVersion: '^0.2.0',
  mcp: {
    tools: [
      {
        name: 'websearch.query',
        description: 'Execute a web search query using the configured provider.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            provider: { type: 'string' },
            count: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
            locale: { type: 'string' },
            safeSearch: { type: 'string', enum: ['off', 'moderate', 'strict'], default: 'moderate' },
            browserHints: { type: 'object', additionalProperties: true },
          },
          required: ['query'],
        },
      },
      {
        name: 'websearch.page.fetch',
        description: 'Fetch the final rendered page content for a search result or URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            provider: { type: 'string' },
            render: { type: 'string', enum: ['text', 'html', 'screenshot'], default: 'text' },
            maxChars: { type: 'integer', default: 2000 },
          },
          required: ['url'],
        },
      },
      {
        name: 'websearch.summarize',
        description: 'Summarize one or more web search results or page contents.',
        inputSchema: {
          type: 'object',
          properties: {
            inputs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  content: { type: 'string' },
                },
                required: ['url'],
              },
            },
            format: { type: 'string', enum: ['text', 'bullets', 'json'], default: 'json' },
          },
          required: ['inputs'],
        },
      },
      {
        name: 'websearch.queryProviders',
        description: 'List supported search providers and provider-specific configuration options.',
        inputSchema: { type: 'object', additionalProperties: false },
      },
    ],
    resources: [
      { name: 'websearch.docs', uri: 'plugin://websearch/docs', mimeType: 'text/markdown', description: 'Web search plugin documentation' },
      { name: 'websearch.schema', uri: 'plugin://websearch/schema', mimeType: 'application/json', description: 'Web search tool schema definitions' },
      { name: 'websearch.providers', uri: 'plugin://websearch/providers', mimeType: 'application/json', description: 'Supported web search providers and metadata' },
    ],
    systemPrompt: 'You are a web search assistant. Use the registered websearch tools to search the internet, fetch page content, and summarize results. Avoid hallucinations; prefer tool results over guessing.',
  },
  async callTool(name: string, args: Record<string, unknown>) {
    const handler = websearchToolHandlers[name as keyof typeof websearchToolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return (handler as any)(args);
  },
  async readResource(uri: string) {
    const handler = websearchResourceHandlers[uri as keyof typeof websearchResourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    return handler();
  },
};

export default WebsearchPlugin;
