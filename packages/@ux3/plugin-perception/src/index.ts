import type { Plugin } from '../../../../src/plugin/registry.js';
import { perceptionToolHandlers, perceptionResourceHandlers } from './tools.js';

export const PerceptionPlugin: Plugin = {
  name: '@ux3/plugin-perception',
  version: '0.1.0',
  description: 'Speech and vision perception plugin for UX3',
  displayName: 'Perception',
  author: 'UX3 Team',
  categories: ['analysis', 'utility'],
  ux3PeerVersion: '^0.2.0',
  mcp: {
    tools: [
      { name: 'perception.speech.synthesize', description: 'Convert text into speech audio.', inputSchema: { type: 'object' } },
      { name: 'perception.speech.transcribe', description: 'Transcribe spoken audio into text.', inputSchema: { type: 'object' } },
      { name: 'perception.vision.analyze', description: 'Analyze an image and return descriptive metadata.', inputSchema: { type: 'object' } },
      { name: 'perception.vision.extractJson', description: 'Extract structured JSON from an image.', inputSchema: { type: 'object' } },
      { name: 'perception.perceptionCapabilities', description: 'List supported perception features.', inputSchema: { type: 'object', additionalProperties: false } },
    ],
    resources: [
      { name: 'perception.docs', uri: 'plugin://perception/docs', mimeType: 'text/markdown', description: 'Perception plugin documentation' },
      { name: 'perception.schema', uri: 'plugin://perception/schema', mimeType: 'application/json', description: 'Perception tool schema definitions' },
      { name: 'perception.mediaTypes', uri: 'plugin://perception/media-types', mimeType: 'application/json', description: 'Supported media and provider configuration' },
    ],
    systemPrompt: 'You are a perception assistant. Use speech and vision tools to convert audio to text, text to speech, and extract structured information from images. Prefer tool results and be explicit when provider configuration is required.',
  },
  async callTool(name: string, args: Record<string, unknown>) {
    const handler = perceptionToolHandlers[name as keyof typeof perceptionToolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return (handler as any)(args);
  },
  async readResource(uri: string) {
    const handler = perceptionResourceHandlers[uri as keyof typeof perceptionResourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    return handler();
  },
};

export default PerceptionPlugin;
