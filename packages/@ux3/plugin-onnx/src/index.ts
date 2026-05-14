import type { AppContext, Plugin } from '../../../../src/plugin/registry.js';
import { OnnxTools, OnnxResources, onnxToolHandlers, onnxResourceHandlers } from './tools.js';
import { createOnnxService } from './onnx-service.js';

export const OnnxPlugin: Plugin = {
  name: '@ux3/plugin-onnx',
  version: '0.1.0',
  description: 'ONNX search and prompt plugin with FlatBuffer-powered content retrieval.',
  displayName: 'ONNX Search',
  author: 'ONNX Cloud Team',
  categories: ['analysis', 'ai', 'tooling'],
  ux3PeerVersion: '^0.2.0',

  install(app: AppContext) {
    const service = createOnnxService();
    if (typeof app.registerService === 'function') {
      app.registerService('onnx', () => service);
    } else {
      (app as any).services.onnx = service;
    }

    const utils = (app as any).utils || {};
    utils.onnx = service;
    (app as any).utils = utils;

    if (typeof window !== 'undefined') {
      (window as any).__ux3OnnxService = service;
    }
  },

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
            requireGpu: { type: 'boolean' },
            provider: { type: 'string' },
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
        name: OnnxTools.MODEL_LIST,
        description: 'List ONNX models available in the plugin zoo and their metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            maxLatency: { type: 'integer', minimum: 0 },
            requireGpu: { type: 'boolean' },
            provider: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      {
        name: OnnxTools.MODEL_SELECT,
        description: 'Select the best ONNX model for a given task and deployment requirements.',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            maxLatency: { type: 'integer', minimum: 0 },
            requireGpu: { type: 'boolean' },
            provider: { type: 'string' },
          },
          required: ['task'],
        },
      },
      {
        name: OnnxTools.MODEL_DESCRIBE,
        description: 'Describe a specific ONNX model and its mapping profile.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
      {
        name: OnnxTools.INDEX_LIST,
        description: 'List loaded ONNX indices and the currently active index.',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
        },
      },
      {
        name: OnnxTools.INDEX_USE,
        description: 'Switch the active ONNX index for search and model selection.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
      {
        name: OnnxTools.INDEX_GET_ACTIVE,
        description: 'Get the currently active ONNX index name.',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
        },
      },
      {
        name: OnnxTools.INDEX_LOAD,
        description: 'Load an ONNX index from base64, a file path, or browser storage.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            base64: { type: 'string' },
            path: { type: 'string' },
            storageKey: { type: 'string' },
          },
          required: ['name'],
        },
      },
      {
        name: OnnxTools.INDEX_SAVE,
        description: 'Save an ONNX index to a file path or browser storage.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            path: { type: 'string' },
            storageKey: { type: 'string' },
          },
          required: ['name'],
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
      { name: 'onnx.index', uri: OnnxResources.INDEX, mimeType: 'application/octet-stream', description: 'FlatBuffer index payload for the active ONNX index.' },
      { name: 'onnx.content', uri: OnnxResources.CONTENT, mimeType: 'application/json', description: 'ONNX knowledge corpus data for the active index.' },
      { name: 'onnx.prompts', uri: OnnxResources.PROMPTS, mimeType: 'application/json', description: 'Available ONNX prompt templates.' },
      { name: 'onnx.models', uri: OnnxResources.MODELS, mimeType: 'application/json', description: 'ONNX model metadata from the plugin zoo.' },
      { name: 'onnx.mappings', uri: OnnxResources.MAPPINGS, mimeType: 'application/json', description: 'ONNX model mapping profiles.' },
      { name: 'onnx.indices', uri: OnnxResources.INDICES, mimeType: 'application/json', description: 'Loaded ONNX index names and sources.' },
      { name: 'onnx.activeIndex', uri: OnnxResources.ACTIVE_INDEX, mimeType: 'application/json', description: 'The currently active ONNX index.' },
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
