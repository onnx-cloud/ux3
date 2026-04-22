import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { ToolRegistry } from '../../src/mcp/tools.js';
import { ResourceRegistry } from '../../src/mcp/resources.js';

const projectDir = path.resolve('./examples/quadra');

describe('MCP Tools', () => {
  let toolRegistry: ToolRegistry;

  beforeAll(() => {
    toolRegistry = new ToolRegistry(projectDir);
  });

  it('should have all required tools defined', () => {
    const tools = toolRegistry.getToolDefinitions();
    expect(tools.length).toBeGreaterThan(0);
    
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('project.list');
    expect(toolNames).toContain('view.get');
    expect(toolNames).toContain('view.create');
    expect(toolNames).toContain('view.validate');
  });

  it('project.list should return project structure', async () => {
    const result = await toolRegistry.executeTool('project.list', {});
    expect(result).toHaveProperty('views');
    expect(Array.isArray(result.views)).toBe(true);
  });

  it('view.get should read existing view', async () => {
    // Get the list of views first
    const listResult = await toolRegistry.executeTool('project.list', {});
    
    if (listResult.views && listResult.views.length > 0) {
      const viewName = listResult.views[0];
      const result = await toolRegistry.executeTool('view.get', { name: viewName });
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('yaml');
      expect(result).toHaveProperty('html');
      expect(result.name).toBe(viewName);
    }
  });

  it('views.search should find views by query', async () => {
    const result = await toolRegistry.executeTool('views.search', { query: 'root' });
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('view.validate should validate a view', async () => {
    const result = await toolRegistry.executeTool('view.validate', { nameOrPath: 'Root' });
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
  });

  it('should error on non-existent tool', async () => {
    try {
      await toolRegistry.executeTool('invalid.tool', {});
      expect.fail('Should have thrown an error');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('hints.list should return available hints', async () => {
    const result = await toolRegistry.executeTool('hints.list', {});
    expect(result).toHaveProperty('hints');
    expect(Array.isArray(result.hints)).toBe(true);
    
    // Should have some hints available
    if (result.hints.length > 0) {
      const hint = result.hints[0];
      expect(hint).toHaveProperty('section');
      expect(hint).toHaveProperty('title');
      expect(hint).toHaveProperty('summary');
    }
  });

  it('hints.view should return hint content', async () => {
    const result = await toolRegistry.executeTool('hints.list', {});
    if (result.hints.length > 0) {
      const section = result.hints[0].section;
      const viewResult = await toolRegistry.executeTool('hints.view', { section });
      
      expect(viewResult).toHaveProperty('section');
      expect(viewResult).toHaveProperty('content');
      expect(typeof viewResult.content).toBe('string');
      expect(viewResult.content.length).toBeGreaterThan(0);
    }
  });

  it('hints.view should error on invalid section', async () => {
    try {
      await toolRegistry.executeTool('hints.view', { section: 'invalid-section-xyz' });
      expect.fail('Should have thrown an error');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});

describe('MCP Resources', () => {
  let resourceRegistry: ResourceRegistry;

  beforeAll(() => {
    resourceRegistry = new ResourceRegistry(projectDir);
  });

  it('should have resources available', () => {
    const resources = resourceRegistry.listResources();
    expect(resources.length).toBeGreaterThan(0);
  });

  it('should have schema resources', () => {
    const resources = resourceRegistry.listResources();
    const uris = resources.map(r => r.uri);
    
    expect(uris).toContain('schema://view');
    expect(uris).toContain('schema://i18n');
    expect(uris).toContain('schema://style');
  });

  it('should read view resource', async () => {
    const resources = resourceRegistry.listResources();
    const viewResource = resources.find(r => r.uri.startsWith('view://'));
    
    if (viewResource) {
      const content = await resourceRegistry.readResource(viewResource.uri);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('should read schema resource', async () => {
    const content = await resourceRegistry.readResource('schema://view');
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    
    // Should be valid JSON
    const schema = JSON.parse(content);
    expect(schema).toBeDefined();
  });

  it('should read project structure', async () => {
    const content = await resourceRegistry.readResource('project://structure');
    expect(typeof content).toBe('string');
    expect(content).toContain('Project Structure');
  });

  it('should error on non-existent resource', async () => {
    try {
      await resourceRegistry.readResource('view://NonExistent');
      expect.fail('Should have thrown an error');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
