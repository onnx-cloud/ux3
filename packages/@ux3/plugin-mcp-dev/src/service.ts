import fs from 'fs';
import path from 'path';
import type { AppContext } from '../../../../src/ui/app.js';
import { ToolRegistry } from '../../../../src/mcp/tools.js';

interface DevPluginConfig {
  [key: string]: unknown;
}

export function createDevMcpService(app?: AppContext) {
  const projectDir = process.cwd();
  const pluginConfig = (app?.config?.plugins?.['@ux3/plugin-mcp-dev'] ?? {}) as DevPluginConfig;
  let toolbox: ToolRegistry | null = null;

  function getToolbox() {
    if (!toolbox) {
      toolbox = new ToolRegistry(projectDir);
    }
    return toolbox;
  }

  async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'dev.project.info':
        return getProjectInfo(projectDir, pluginConfig, app);
      case 'dev.plugin.list':
        return getPluginList(app);
      case 'dev.entity.list':
        return getToolbox().executeTool('entity.list', args);
      case 'dev.entity.get':
        return getToolbox().executeTool('entity.get', args);
      case 'dev.entity.search':
        return getToolbox().executeTool('entity.search', args);
      case 'dev.build.run':
        return getToolbox().executeTool('build.run', args);
      case 'dev.build.typecheck':
        return getToolbox().executeTool('build.typecheck', args);
      case 'dev.validate.all':
        return getToolbox().executeTool('validate.all', args);
      case 'dev.test.run':
        return getToolbox().executeTool('test.run', args);
      default:
        throw new Error(`Unknown developer MCP tool: ${name}`);
    }
  }

  async function readResource(uri: string): Promise<string> {
    switch (uri) {
      case 'plugin://mcp-dev/docs':
        return readResourceFile('README.md');
      case 'plugin://mcp-dev/config':
        return JSON.stringify({ projectDir, pluginConfig, timestamp: new Date().toISOString() }, null, 2);
      default:
        throw new Error(`Unknown developer MCP resource URI: ${uri}`);
    }
  }

  return {
    callTool,
    readResource,
  };
}

function getProjectInfo(projectDir: string, pluginConfig: DevPluginConfig, app?: AppContext) {
  const pkgPath = path.join(projectDir, 'package.json');
  let packageJson: Record<string, unknown> | null = null;

  if (fs.existsSync(pkgPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      packageJson = null;
    }
  }

  const meta = {
    projectDir,
    packageJson,
    pluginConfig,
    devServer: app?.config?.development ?? null,
    plugins: Object.keys(app?.config?.plugins ?? {}),
    timestamp: new Date().toISOString(),
  };

  return meta;
}

function getPluginList(app?: AppContext) {
  return {
    plugins: Object.entries(app?.config?.plugins ?? {}).map(([name, config]) => ({ name, config })),
  };
}

function readResourceFile(fileName: string): string {
  const candidate = new URL(`../${fileName}`, import.meta.url);
  const fallback = path.join(process.cwd(), 'packages', '@ux3', 'plugin-mcp-dev', fileName);
  const resourcePath = fs.existsSync(candidate) ? candidate : fallback;
  if (!fs.existsSync(resourcePath)) {
    throw new Error(`Developer MCP documentation not found: ${fileName}`);
  }
  return fs.readFileSync(resourcePath, 'utf-8');
}
