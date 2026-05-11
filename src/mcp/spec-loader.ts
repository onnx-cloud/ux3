import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export interface ToolSpec {
  name: string;
  description: string;
  input: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  handler: string;
  devOnly?: boolean;
  tags?: string[];
}

export interface ResourceSpec {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  handler: string;
  includeResources?: string[];
}

export interface PromptArgumentSpec {
  name: string;
  description?: string;
  required?: boolean;
  enum?: string[];
}

export interface PromptSpec {
  name: string;
  description: string;
  handler: string;
  includeResources?: string[];
  arguments?: PromptArgumentSpec[];
  virtual?: boolean;
  content?: string;
}

export interface MCPToolSpecs {
  tools: Record<string, ToolSpec[]>;
}

export interface MCPResourceSpecs {
  resources: Record<string, (ResourceSpec | { name: string; description: string; handler: string; includeResources?: string[] })[]>;
}

export interface MCPSpecBundle {
  tools: ToolSpec[];
  resources: ResourceSpec[];
  prompts: PromptSpec[];
}

export interface SpecLoadOptions {
  projectDir: string;
  /** Optional extra spec directories (e.g. plugin-sourced) */
  extraDirs?: string[];
}

const SPEC_DIR = 'src/mcp/specs';

function flattenTools(spec: Record<string, unknown>): ToolSpec[] {
  const tools: ToolSpec[] = [];
  const toolsSection = spec.tools as Record<string, ToolSpec[]> | undefined;
  if (!toolsSection) return tools;
  for (const category of Object.values(toolsSection)) {
    if (!Array.isArray(category)) continue;
    for (const tool of category) {
      if (tool && typeof tool === 'object') tools.push(tool as ToolSpec);
    }
  }
  return tools;
}

function flattenResources(spec: Record<string, unknown>): ResourceSpec[] {
  const resources: ResourceSpec[] = [];
  const resSection = spec.resources as Record<string, Array<Record<string, unknown>>> | undefined;
  if (!resSection) return resources;
  for (const category of Object.values(resSection)) {
    if (!Array.isArray(category)) continue;
    for (const item of category) {
      if (item && typeof item === 'object' && 'uri' in item) {
        resources.push(item as unknown as ResourceSpec);
      }
    }
  }
  return resources;
}

function flattenPrompts(spec: Record<string, unknown>): PromptSpec[] {
  const prompts: PromptSpec[] = [];
  const promptsSection = (spec as any).prompts as Record<string, Array<Record<string, unknown>>> | undefined;
  if (!promptsSection) return prompts;
  for (const category of Object.values(promptsSection)) {
    if (!Array.isArray(category)) continue;
    for (const p of category) {
      if (p && typeof p === 'object') prompts.push(p as unknown as PromptSpec);
    }
  }
  return prompts;
}

export function loadSpecs(options: SpecLoadOptions): MCPSpecBundle {
  const { projectDir, extraDirs = [] } = options;

  const specDirs = extraDirs.length > 0 ? extraDirs : [path.resolve(projectDir, '..', '..', SPEC_DIR)];

  // Try framework-relative path first, then resolve from cwd
  if (extraDirs.length === 0) {
    const fromCwd = path.resolve(process.cwd(), SPEC_DIR);
    if (fs.existsSync(fromCwd)) {
      specDirs[0] = fromCwd;
    } else {
      // Fallback: search for the spec dir relative to this module
      const fromSrc = path.resolve(projectDir, '..', '..', SPEC_DIR);
      if (fs.existsSync(fromSrc)) {
        specDirs[0] = fromSrc;
      }
    }
  }

  const allTools: ToolSpec[] = [];
  const allResources: ResourceSpec[] = [];
  const allPrompts: PromptSpec[] = [];
  const toolNames = new Set<string>();
  const resourceUris = new Set<string>();
  const promptNames = new Set<string>();

  for (const dir of specDirs) {
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const spec = YAML.parse(content) as Record<string, unknown>;

      if (!spec) continue;

      if (spec.tools) {
        for (const tool of flattenTools(spec)) {
          if (toolNames.has(tool.name)) continue;
          toolNames.add(tool.name);
          allTools.push(tool);
        }
      }

      if (spec.resources) {
        for (const resource of flattenResources(spec)) {
          if (resourceUris.has(resource.uri)) continue;
          resourceUris.add(resource.uri);
          allResources.push(resource);
        }
      }

      if ((spec as any).prompts) {
        for (const prompt of flattenPrompts(spec)) {
          if (promptNames.has(prompt.name)) continue;
          promptNames.add(prompt.name);
          allPrompts.push(prompt);
        }
      }
    }
  }

  validateSpecs(allTools, allResources);

  return { tools: allTools, resources: allResources, prompts: allPrompts };
}

function validateSpecs(tools: ToolSpec[], resources: ResourceSpec[]): void {
  const seen = new Set<string>();

  for (const tool of tools) {
    if (!tool.name) throw new Error('Tool spec missing "name"');
    if (!tool.description) throw new Error(`Tool "${tool.name}" missing "description"`);
    if (!tool.handler) throw new Error(`Tool "${tool.name}" missing "handler"`);
    if (!tool.input || typeof tool.input.type !== 'string') {
      throw new Error(`Tool "${tool.name}" missing valid "input" schema`);
    }
    if (seen.has(tool.name)) {
      throw new Error(`Duplicate tool name: "${tool.name}"`);
    }
    seen.add(tool.name);
  }

  const seenUris = new Set<string>();
  for (const resource of resources) {
    if (!resource.uri) throw new Error('Resource spec missing "uri"');
    if (!resource.name) throw new Error(`Resource "${resource.uri}" missing "name"`);
    if (!resource.handler) throw new Error(`Resource "${resource.uri}" missing "handler"`);
    if (seenUris.has(resource.uri)) {
      throw new Error(`Duplicate resource URI: "${resource.uri}"`);
    }
    seenUris.add(resource.uri);
  }
}
