import type { Plugin } from '../../../../src/plugin/registry.js';
import { OnnxTools, OnnxResources, onnxToolHandlers, onnxResourceHandlers } from './tools.js';

export const OnnxPlugin: Plugin = {
  name: '@ux3/plugin-onnx',
  version: '0.1.0',
  description: 'ONNX search and prompt plugin with FlatBuffer-powered content retrieval.',
  displayName: 'ONNX Search',
  author: 'ONNX Cloud Team',
  categories: ['analysis', 'ai', 'tooling'],
  ux3PeerVersion: '^0.2.0',
  mcp: {
    tools: [
      {
        name: OnnxTools.SEARCH_QUERY,
        description: 'Search the ONNX knowledge corpus using the prebuilt FlatBuffer index.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            topK: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
          },
          required: ['query'],
        },
      },
      {
        name: OnnxTools.PROMPT_SELECT,
        description: 'Select the best ONNX prompt template for a query and intent.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            intent: { type: 'string' },
          },
          required: ['query'],
        },
      },
      {
        name: OnnxTools.INDEX_DESCRIBE,
        description: 'Describe the FlatBuffer index and available ONNX corpus resources.',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
        },
      },
    ],
    resources: [
      { name: 'onnx.index', uri: OnnxResources.INDEX, mimeType: 'application/octet-stream', description: 'FlatBuffer index payload for ONNX content and prompts.' },
      { name: 'onnx.content', uri: OnnxResources.CONTENT, mimeType: 'application/json', description: 'ONNX knowledge corpus data.' },
      { name: 'onnx.prompts', uri: OnnxResources.PROMPTS, mimeType: 'application/json', description: 'Available ONNX prompt templates.' },
      { name: 'onnx.guide', uri: OnnxResources.GUIDE, mimeType: 'text/markdown', description: 'ONNX plugin usage guide.' },
    ],
    systemPrompt: 'You are an ONNX knowledge assistant. Use index retrieval and prompt selection to answer queries based on ONNX content. Prefer exact retrieval and avoid unfounded inference.',
  },

  async callTool(name: string, args: Record<string, unknown>) {
    const handler = onnxToolHandlers[name as keyof typeof onnxToolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return (handler as any)(args);
  },

  async readResource(uri: string) {
    const handler = onnxResourceHandlers[uri as keyof typeof onnxResourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    return handler();
  },
};

export default OnnxPlugin;
