import type { Plugin } from '@ux3/plugin/registry.js';
import type { AppContext } from '../../../../src/ui/app.js';
import { SelfService, type SelfServiceConfig } from './service.js';

const PLUGIN_NAME = '@ux3/plugin-self';
const PLUGIN_VERSION = '0.1.0';
let selfServiceSingleton: SelfService | null = null;

function readConfig(app?: any): SelfServiceConfig {
  return (
    (SelfPlugin as any).config ??
    app?.config?.plugins?.['@ux3/plugin-self'] ??
    {}
  );
}

async function getSelfService(app?: AppContext): Promise<SelfService> {
  if (selfServiceSingleton) return selfServiceSingleton;
  const cfg = readConfig(app);
  selfServiceSingleton = new SelfService(cfg, app);
  return selfServiceSingleton;
}

export const SelfPlugin: Plugin = {
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  displayName: 'Self',
  description: 'Self-hosted onboarding and runtime developer tooling for UX3.',
  categories: ['utility', 'developer', 'onboarding'],
  ux3PeerVersion: '^0.2.0',
  async install(app) {
    const service = await getSelfService(app as AppContext);

    (app as any).utils = (app as any).utils || {};
    (app as any).utils.self = {
      info: () => service.getInfo(),
      status: () => service.getStatus(),
      writeEnv: (vars: Record<string, string>) => service.writeEnv(vars),
      generate: () => service.generateScaffold(),
      pluginList: () => service.listPlugins(),
    };

    (app as any).services = (app as any).services || {};
    (app as any).services.self = service;
  },
  async callTool(name, args) {
    const service = await getSelfService();
    return service.callTool(name, args ?? {});
  },
  async readResource(uri) {
    const service = await getSelfService();
    return service.readResource(uri);
  },
  mcp: {
    tools: [
      {
        name: 'self.info',
        description: 'Get self-hosted runtime metadata',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'self.onboarding.status',
        description: 'Get onboarding progress and status',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'self.onboarding.step',
        description: 'Advance or query an onboarding step',
        inputSchema: {
          type: 'object',
          properties: {
            step: { type: 'string' },
            action: { type: 'string' },
          },
          required: ['step'],
          additionalProperties: false,
        },
      },
      {
        name: 'self.env.write',
        description: 'Write environment variables for a self-hosted UX3 runtime',
        inputSchema: {
          type: 'object',
          properties: {
            env: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['env'],
          additionalProperties: false,
        },
      },
      {
        name: 'self.generate',
        description: 'Generate the self-hosted project scaffold',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'self.verify',
        description: 'Verify self-hosted runtime and onboarding configuration',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'self.plugin.list',
        description: 'List runtime plugins available to the self-hosted app',
        inputSchema: { type: 'object', additionalProperties: false },
      },
    ],
    resources: [
      {
        name: 'self.docs',
        uri: 'plugin://self/docs',
        mimeType: 'text/markdown',
        description: 'Self-hosted onboarding and runtime docs',
      },
      {
        name: 'self.onboarding-schema',
        uri: 'plugin://self/onboarding-schema',
        mimeType: 'application/json',
        description: 'Self onboarding configuration schema',
      },
    ],
    systemPrompt:
      'You are a UX3 self-hosting assistant. Use the self plugin tools to manage onboarding, configuration, and developer runtime state.',
  },
};

export default SelfPlugin;
