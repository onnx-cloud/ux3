import fs from 'fs';
import os from 'os';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { ToolRegistry } from '../../src/mcp/tools.js';
import { ResourceRegistry } from '../../src/mcp/resources.js';

const projectDir = path.resolve('./examples/quadra');

function createTempProjectCopy(name: string): string {
  const tempRoot = fs.mkdtempSync(path.join(path.resolve('./tmp'), `${name}-`));
  fs.cpSync(projectDir, tempRoot, { recursive: true, dereference: true, errorOnExist: false });
  return tempRoot;
}

describe('MCP Tools', () => {
  let toolRegistry: ToolRegistry;

  beforeAll(() => {
    toolRegistry = new ToolRegistry(projectDir);
  });

  it('should have all required tools defined', () => {
    const tools = toolRegistry.getToolDefinitions();
    expect(tools.length).toBeGreaterThan(0);
    
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('entity.list');
    expect(toolNames).toContain('entity.get');
    expect(toolNames).toContain('entity.search');
    expect(toolNames).toContain('entity.create');
    expect(toolNames).toContain('entity.update');
    expect(toolNames).toContain('entity.delete');
    expect(toolNames).toContain('project.list');
    expect(toolNames).toContain('view.get');
    expect(toolNames).toContain('view.create');
    expect(toolNames).toContain('view.validate');
    expect(toolNames).toContain('layout.create');
    expect(toolNames).toContain('layout.get');
    expect(toolNames).toContain('layout.update');
    expect(toolNames).toContain('layout.delete');
    expect(toolNames).toContain('i18n.get');
    expect(toolNames).toContain('i18n.search');
    expect(toolNames).toContain('i18n.update');
    expect(toolNames).toContain('i18n.delete');
    expect(toolNames).toContain('service.list');
    expect(toolNames).toContain('service.get');
    expect(toolNames).toContain('service.search');
    expect(toolNames).toContain('service.create');
    expect(toolNames).toContain('service.update');
    expect(toolNames).toContain('service.delete');
    expect(toolNames).toContain('route.list');
    expect(toolNames).toContain('route.get');
    expect(toolNames).toContain('route.search');
    expect(toolNames).toContain('route.create');
    expect(toolNames).toContain('route.update');
    expect(toolNames).toContain('route.delete');
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

  it('entity.list should expose all requested entity kinds', async () => {
    const viewList = await toolRegistry.executeTool('entity.list', { kind: 'view' });
    const layoutList = await toolRegistry.executeTool('entity.list', { kind: 'layout' });
    const i18nList = await toolRegistry.executeTool('entity.list', { kind: 'i18n' });
    const serviceList = await toolRegistry.executeTool('entity.list', { kind: 'service' });
    const routeList = await toolRegistry.executeTool('entity.list', { kind: 'route' });

    expect(viewList.items).toContain('home/index');
    expect(viewList.items).toContain('home/loading');
    expect(viewList.items).toContain('home/error');
    expect(viewList.items).toContain('oops/404');
    expect(viewList.items).toContain('capability/knowledge/ready');
    expect(viewList.items).toContain('capability/mcp/loading_tools');
    expect(layoutList.items).toContain('default');
    expect(i18nList.items).toContain('en/en');
    expect(serviceList.items).toContain('iq');
    expect(routeList.items).toContain('routes');
  });

  it('entity.search should find content across all entities', async () => {
    expect((await toolRegistry.executeTool('entity.search', { kind: 'view', query: 'governance' })).results.length).toBeGreaterThan(0);
    expect((await toolRegistry.executeTool('entity.search', { kind: 'layout', query: 'ux-content' })).results.length).toBeGreaterThan(0);
    expect((await toolRegistry.executeTool('entity.search', { kind: 'i18n', query: 'QUADRA' })).results.length).toBeGreaterThan(0);
    expect((await toolRegistry.executeTool('entity.search', { kind: 'service', query: 'jsonrpc' })).results.length).toBeGreaterThan(0);
    expect((await toolRegistry.executeTool('entity.search', { kind: 'route', query: '/capabilities/mcp' })).results.length).toBeGreaterThan(0);
  });

  it('entity CRUD tools should work for every requested entity kind', async () => {
    const tempProjectDir = createTempProjectCopy('mcp-tools-crud');
    const tempRegistry = new ToolRegistry(tempProjectDir);

    const createdView = await tempRegistry.executeTool('entity.create', {
      kind: 'view',
      name: 'TempView',
      content: "name: TempView\ninitial: ready\nstates:\n  ready:\n    template: view/TempView/index.html\n",
      template: '<div>temp view</div>\n',
    });
    expect(createdView.success).toBe(true);
    const fetchedView = await tempRegistry.executeTool('entity.get', { kind: 'view', name: 'TempView' });
    expect(fetchedView.content).toContain('TempView');
    await tempRegistry.executeTool('entity.update', {
      kind: 'view',
      name: 'TempView',
      content: "name: TempView\ninitial: done\nstates:\n  done:\n    template: view/TempView/index.html\n",
      template: '<div>updated view</div>\n',
    });
    expect((await tempRegistry.executeTool('entity.get', { kind: 'view', name: 'TempView' })).content).toContain('done');
    await tempRegistry.executeTool('entity.delete', { kind: 'view', name: 'TempView' });

    await tempRegistry.executeTool('layout.create', { name: 'temp-layout', content: '<main>layout</main>\n' });
    expect((await tempRegistry.executeTool('layout.get', { name: 'temp-layout' })).content).toContain('layout');
    await tempRegistry.executeTool('layout.update', { name: 'temp-layout', content: '<main>layout updated</main>\n' });
    expect((await tempRegistry.executeTool('layout.get', { name: 'temp-layout' })).content).toContain('updated');
    await tempRegistry.executeTool('layout.delete', { name: 'temp-layout' });

    await tempRegistry.executeTool('entity.create', { kind: 'i18n', name: 'en/temp', content: '{"title":"temp"}\n' });
    expect((await tempRegistry.executeTool('i18n.get', { name: 'en/temp' })).content).toContain('temp');
    await tempRegistry.executeTool('i18n.update', { name: 'en/temp', content: '{"title":"temp updated"}\n' });
    expect((await tempRegistry.executeTool('i18n.get', { name: 'en/temp' })).content).toContain('updated');
    await tempRegistry.executeTool('i18n.delete', { name: 'en/temp' });

    await tempRegistry.executeTool('service.create', { name: 'temp-service', content: 'services:\n  temp:\n    adapter: http\n' });
    expect((await tempRegistry.executeTool('service.get', { name: 'temp-service' })).content).toContain('adapter');
    await tempRegistry.executeTool('service.update', { name: 'temp-service', content: 'services:\n  temp:\n    adapter: plugin\n' });
    expect((await tempRegistry.executeTool('service.get', { name: 'temp-service' })).content).toContain('plugin');
    await tempRegistry.executeTool('service.delete', { name: 'temp-service' });

    await tempRegistry.executeTool('route.create', { name: 'temp-routes', content: 'routes:\n  - path: /temp\n    view: home\n' });
    expect((await tempRegistry.executeTool('route.get', { name: 'temp-routes' })).content).toContain('/temp');
    await tempRegistry.executeTool('route.update', { name: 'temp-routes', content: 'routes:\n  - path: /temp-updated\n    view: home\n' });
    expect((await tempRegistry.executeTool('route.get', { name: 'temp-routes' })).content).toContain('temp-updated');
    await tempRegistry.executeTool('route.delete', { name: 'temp-routes' });

    fs.rmSync(tempProjectDir, { recursive: true, force: true });
  });
});

describe('MCP Resources', () => {
  let resourceRegistry: ResourceRegistry;
  const resourceBaseUrl = 'http://localhost:1337';

  beforeAll(() => {
    resourceRegistry = new ResourceRegistry(projectDir, resourceBaseUrl);
  });

  it('should have resources available', () => {
    const resources = resourceRegistry.listResources();
    expect(resources.length).toBeGreaterThan(0);
  });

  it('should have schema resources', () => {
    const resources = resourceRegistry.listResources();
    const uris = resources.map(r => r.uri);
    
    expect(uris).toContain(`${resourceBaseUrl}/schema/view`);
    expect(uris).toContain(`${resourceBaseUrl}/schema/i18n`);
    expect(uris).toContain(`${resourceBaseUrl}/schema/style`);
  });

  it('should read view resource', async () => {
    const resources = resourceRegistry.listResources();
    const viewResource = resources.find(r => r.uri.startsWith(`${resourceBaseUrl}/views/`));
    expect(viewResource).toBeDefined();
    
    if (viewResource) {
      const content = await resourceRegistry.readResource(viewResource.uri);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('should read schema resource', async () => {
    const content = await resourceRegistry.readResource(`${resourceBaseUrl}/schema/view`);
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    
    // Should be valid JSON
    const schema = JSON.parse(content);
    expect(schema).toBeDefined();
  });

  it('should read project structure', async () => {
    const content = await resourceRegistry.readResource(`${resourceBaseUrl}/project/structure`);
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
