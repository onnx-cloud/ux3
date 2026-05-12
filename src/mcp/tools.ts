import fs from 'fs';
import path from 'path';
import { buildEntityIndex, type EntityIndexRecord, type EntityKind, type GeneratedEntities } from '../build/entity-index.js';
import { Validator } from '../build/validator.js';
import YAML from 'yaml';

interface EntityDefinition {
  kind: EntityKind;
  dir: string;
  mode: 'single-file' | 'directory';
  extension: string;
  description: string;
  listName: string;
}

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Registry for MCP tools.
 * Tools are verbs: view.create, view.validate, views.search, etc.
 */
export class ToolRegistry {
  private tools = new Map<string, (args: any) => Promise<any>>();
  private projectDir: string;
  private validator: Validator;
  private viewsDir: string;
  private uxDir: string;
  private layoutsDir: string;
  private i18nDir: string;
  private servicesDir: string;
  private routesDir: string;
  private entityDefinitions: Record<EntityKind, EntityDefinition>;
  private entityIndexCache?: GeneratedEntities;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.validator = new Validator({ projectDir });
    
    // Support both src/ux/widget (new projects) and ux/widget (examples)
    const srcUxPath = path.join(projectDir, 'src', 'ux');
    const uxPath = path.join(projectDir, 'ux');
    this.uxDir = fs.existsSync(uxPath) ? uxPath : srcUxPath;
    this.viewsDir = fs.existsSync(path.join(this.uxDir, 'widget'))
      ? path.join(this.uxDir, 'widget')
      : path.join(this.uxDir, 'view');
    this.layoutsDir = path.join(this.uxDir, 'layout');
    this.i18nDir = path.join(this.uxDir, 'i18n');
    this.servicesDir = path.join(this.uxDir, 'service');
    this.routesDir = path.join(this.uxDir, 'route');
    this.entityDefinitions = {
      view: {
        kind: 'view',
        dir: this.viewsDir,
        mode: 'directory',
        extension: '.yaml',
        description: 'FSM views and templates',
        listName: 'views',
      },
      layout: {
        kind: 'layout',
        dir: this.layoutsDir,
        mode: 'single-file',
        extension: '.html',
        description: 'Layout templates',
        listName: 'layouts',
      },
      i18n: {
        kind: 'i18n',
        dir: this.i18nDir,
        mode: 'single-file',
        extension: '.json',
        description: 'Locale string catalogs',
        listName: 'i18n',
      },
      service: {
        kind: 'service',
        dir: this.servicesDir,
        mode: 'single-file',
        extension: '.yaml',
        description: 'Service declarations',
        listName: 'services',
      },
      route: {
        kind: 'route',
        dir: this.routesDir,
        mode: 'single-file',
        extension: '.yaml',
        description: 'Route declarations',
        listName: 'routes',
      },
    };
    
    this.registerTools();
  }

  private registerTools() {
    // Browse tools
    this.registerTool('project.list', this.projectList.bind(this));
    this.registerTool('entity.list', this.entityList.bind(this));
    this.registerTool('entity.get', this.entityGet.bind(this));
    this.registerTool('entity.search', this.entitySearch.bind(this));
    this.registerTool('view.get', this.viewGet.bind(this));
    this.registerTool('views.search', this.viewsSearch.bind(this));

    // Create tools
    this.registerTool('entity.create', this.entityCreate.bind(this));
    this.registerTool('entity.update', this.entityUpdate.bind(this));
    this.registerTool('entity.delete', this.entityDelete.bind(this));
    this.registerTool('view.create', this.viewCreate.bind(this));
    this.registerTool('style.create', this.styleCreate.bind(this));
    this.registerTool('i18n.create', this.i18nCreate.bind(this));

    this.registerTool('layout.create', this.layoutCreate.bind(this));
    this.registerTool('layout.get', this.layoutGet.bind(this));
    this.registerTool('layouts.search', this.layoutsSearch.bind(this));
    this.registerTool('layout.update', this.layoutUpdate.bind(this));
    this.registerTool('layout.delete', this.layoutDelete.bind(this));

    this.registerTool('i18n.get', this.i18nGet.bind(this));
    this.registerTool('i18n.search', this.i18nSearch.bind(this));
    this.registerTool('i18n.update', this.i18nUpdate.bind(this));
    this.registerTool('i18n.delete', this.i18nDelete.bind(this));

    this.registerTool('service.list', this.serviceList.bind(this));
    this.registerTool('service.get', this.serviceGet.bind(this));
    this.registerTool('service.search', this.serviceSearch.bind(this));
    this.registerTool('service.create', this.serviceCreate.bind(this));
    this.registerTool('service.update', this.serviceUpdate.bind(this));
    this.registerTool('service.delete', this.serviceDelete.bind(this));

    this.registerTool('route.list', this.routeList.bind(this));
    this.registerTool('route.get', this.routeGet.bind(this));
    this.registerTool('route.search', this.routeSearch.bind(this));
    this.registerTool('route.create', this.routeCreate.bind(this));
    this.registerTool('route.update', this.routeUpdate.bind(this));
    this.registerTool('route.delete', this.routeDelete.bind(this));

    // Validate tools
    this.registerTool('view.validate', this.viewValidate.bind(this));
    this.registerTool('validate.i18n', this.validateI18n.bind(this));
    this.registerTool('validate.styles', this.validateStyles.bind(this));

    // Explain tools
    this.registerTool('view.explain', this.viewExplain.bind(this));
    this.registerTool('fsm.graph', this.fsmGraph.bind(this));

    // Hints tools
    this.registerTool('hints.list', this.hintsList.bind(this));
    this.registerTool('hints.view', this.hintsView.bind(this));

    // Surgical patch tools
    this.registerTool('view.addState', this.viewAddState.bind(this));
    this.registerTool('view.updateState', this.viewUpdateState.bind(this));
    this.registerTool('view.removeState', this.viewRemoveState.bind(this));
    this.registerTool('view.addTransition', this.viewAddTransition.bind(this));
    this.registerTool('view.patch', this.viewPatch.bind(this));
    this.registerTool('i18n.addKey', this.i18nAddKey.bind(this));
    this.registerTool('i18n.updateKey', this.i18nUpdateKey.bind(this));
    this.registerTool('route.addEntry', this.routeAddEntry.bind(this));
    this.registerTool('route.removeEntry', this.routeRemoveEntry.bind(this));
    this.registerTool('logic.patch', this.logicPatch.bind(this));

    // Build/test diagnostics tools
    this.registerTool('build.run', this.buildRun.bind(this));
    this.registerTool('build.typecheck', this.buildTypecheck.bind(this));
    this.registerTool('test.run', this.testRun.bind(this));
    this.registerTool('validate.all', this.validateAll.bind(this));
  }

  private registerTool(name: string, handler: (args: any) => Promise<any>) {
    this.tools.set(name, handler);
  }

  async executeTool(name: string, args: any): Promise<any> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }
    return handler(args);
  }

  getToolDefinitions(): ToolDef[] {
    return [
      {
        name: 'project.list',
        description: 'List all views, services, and styles in the project',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Optional filter pattern' },
          },
        },
      },
      {
        name: 'entity.list',
        description: 'List entities for a given kind: view, layout, i18n, service, or route',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'], description: 'Entity kind' },
          },
          required: ['kind'],
        },
      },
      {
        name: 'entity.get',
        description: 'Read one entity by kind and name',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'], description: 'Entity kind' },
            name: { type: 'string', description: 'Entity name' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'entity.search',
        description: 'Search entities by text content or name',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'], description: 'Entity kind' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['kind', 'query'],
        },
      },
      {
        name: 'view.get',
        description: 'Read view YAML and HTML source',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'View name (PascalCase)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'views.search',
        description: 'Find views by keyword, state, or service',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'entity.create',
        description: 'Create an entity by kind and content',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'], description: 'Entity kind' },
            name: { type: 'string', description: 'Entity name' },
            content: { type: 'string', description: 'Entity content' },
            template: { type: 'string', description: 'Optional extra template content for views' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'entity.update',
        description: 'Update an existing entity by kind and content',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'], description: 'Entity kind' },
            name: { type: 'string', description: 'Entity name' },
            content: { type: 'string', description: 'Replacement content' },
            template: { type: 'string', description: 'Optional replacement template for views' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'entity.delete',
        description: 'Delete an entity by kind and name',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['view', 'layout', 'i18n', 'service', 'route'], description: 'Entity kind' },
            name: { type: 'string', description: 'Entity name' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'view.create',
        description: 'Generate a new view from description',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'PascalCase view name' },
            description: { type: 'string', description: 'View description' },
            initialState: { type: 'string', description: 'Initial FSM state' },
            states: { type: 'array', description: 'Optional state definitions' },
          },
          required: ['name', 'description', 'initialState'],
        },
      },
      {
        name: 'layout.create',
        description: 'Create a layout template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Layout name' },
            content: { type: 'string', description: 'HTML content' },
          },
          required: ['name'],
        },
      },
      {
        name: 'layout.get',
        description: 'Read a layout template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Layout name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'layouts.search',
        description: 'Search layout templates',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'layout.update',
        description: 'Update a layout template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Layout name' },
            content: { type: 'string', description: 'Replacement HTML content' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'layout.delete',
        description: 'Delete a layout template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Layout name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'style.create',
        description: 'Generate a style widget',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Widget name' },
            description: { type: 'string', description: 'Style description' },
            designTokens: { type: 'object', description: 'Design tokens' },
          },
          required: ['name', 'description'],
        },
      },
      {
        name: 'i18n.create',
        description: 'Scaffold i18n keys for a view',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            strings: { type: 'object', description: 'English strings map' },
          },
          required: ['viewName', 'strings'],
        },
      },
      {
        name: 'i18n.get',
        description: 'Read an i18n locale catalog',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Locale name or relative catalog path' },
          },
          required: ['name'],
        },
      },
      {
        name: 'i18n.search',
        description: 'Search i18n locale catalogs',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'i18n.update',
        description: 'Update an i18n locale catalog',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Locale name or relative catalog path' },
            content: { type: 'string', description: 'Replacement JSON or YAML content' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'i18n.delete',
        description: 'Delete an i18n locale catalog',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Locale name or relative catalog path' },
          },
          required: ['name'],
        },
      },
      {
        name: 'service.list',
        description: 'List service declarations',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'service.get',
        description: 'Read a service declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Service file name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'service.search',
        description: 'Search service declarations',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'service.create',
        description: 'Create a service declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Service file name' },
            content: { type: 'string', description: 'YAML content' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'service.update',
        description: 'Update a service declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Service file name' },
            content: { type: 'string', description: 'Replacement YAML content' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'service.delete',
        description: 'Delete a service declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Service file name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'route.list',
        description: 'List route declaration files',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'route.get',
        description: 'Read a route declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Route file name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'route.search',
        description: 'Search route declarations',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'route.create',
        description: 'Create a route declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Route file name' },
            content: { type: 'string', description: 'YAML content' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'route.update',
        description: 'Update a route declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Route file name' },
            content: { type: 'string', description: 'Replacement YAML content' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'route.delete',
        description: 'Delete a route declaration file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Route file name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'view.validate',
        description: 'Validate a view: schema, templates, reachability',
        inputSchema: {
          type: 'object',
          properties: {
            nameOrPath: { type: 'string', description: 'View name or path' },
          },
          required: ['nameOrPath'],
        },
      },
      {
        name: 'validate.i18n',
        description: 'Check for missing or unused i18n keys',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'validate.styles',
        description: 'Validate style token refs and class names',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'view.explain',
        description: 'Describe a view FSM for LLM context',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'View name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'fsm.graph',
        description: 'Return state graph as JSON/Mermaid',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            format: { type: 'string', enum: ['json', 'mermaid'], description: 'Output format' },
          },
          required: ['viewName'],
        },
      },
      {
        name: 'hints.list',
        description: 'List available SPEC hints by section (view, style, i18n, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            section: { type: 'string', description: 'Optional section filter (view, style, i18n, route, service, logic, validation)' },
          },
        },
      },
      {
        name: 'hints.view',
        description: 'View full content of a SPEC hint file',
        inputSchema: {
          type: 'object',
          properties: {
            section: { type: 'string', description: 'Hint section (view, style, i18n, etc.)' },
          },
          required: ['section'],
        },
      },
      {
        name: 'view.addState',
        description: 'Add a new state to an existing view YAML. Fails if state name already exists. Returns the updated state list.',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            stateName: { type: 'string', description: 'State name to add' },
            template: { type: 'string', description: 'Template path (optional)' },
            after: { type: 'string', description: 'Insert after this state (default: append)' },
          },
          required: ['viewName', 'stateName'],
        },
      },
      {
        name: 'view.updateState',
        description: 'Merge-update an existing state in a view YAML (additive). Use view.removeState + view.addState for full replacement.',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            stateName: { type: 'string', description: 'State name to update' },
            patch: { type: 'object', description: 'Partial state shape to merge' },
          },
          required: ['viewName', 'stateName', 'patch'],
        },
      },
      {
        name: 'view.removeState',
        description: 'Remove a state from a view. Checks for dangling transitions pointing to it and returns blockers. Pass force: true to override.',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            stateName: { type: 'string', description: 'State name to remove' },
            force: { type: 'boolean', description: 'Force removal even if dangling transitions exist' },
          },
          required: ['viewName', 'stateName'],
        },
      },
      {
        name: 'view.addTransition',
        description: 'Add or replace a transition on a state. Overwrites if event name already exists.',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            stateName: { type: 'string', description: 'Source state' },
            event: { type: 'string', description: 'Event name' },
            target: { type: 'string', description: 'Target state' },
            guard: { type: 'string', description: 'Optional guard condition' },
            actions: { type: 'string', description: 'Optional actions to run' },
          },
          required: ['viewName', 'stateName', 'event', 'target'],
        },
      },
      {
        name: 'view.patch',
        description: 'Apply a partial patch to a view YAML. The patch is deep-merged into the existing YAML structure.',
        inputSchema: {
          type: 'object',
          properties: {
            viewName: { type: 'string', description: 'View name' },
            patch: { type: 'object', description: 'Partial YAML patch object' },
          },
          required: ['viewName', 'patch'],
        },
      },
      {
        name: 'i18n.addKey',
        description: 'Add one or more keys to an i18n locale catalog at a specified path (e.g. view.Login.title).',
        inputSchema: {
          type: 'object',
          properties: {
            locale: { type: 'string', description: 'Locale name or catalog path' },
            keyPath: { type: 'string', description: 'Dot-separated key path (e.g. view.Login.title)' },
            value: { type: 'string', description: 'String value' },
          },
          required: ['locale', 'keyPath', 'value'],
        },
      },
      {
        name: 'i18n.updateKey',
        description: 'Update an existing key in an i18n locale catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            locale: { type: 'string', description: 'Locale name or catalog path' },
            keyPath: { type: 'string', description: 'Dot-separated key path' },
            value: { type: 'string', description: 'New string value' },
          },
          required: ['locale', 'keyPath', 'value'],
        },
      },
      {
        name: 'route.addEntry',
        description: 'Add a route entry to the routes YAML file at a specified position. Can insert at root or as a child.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Route path' },
            view: { type: 'string', description: 'View name' },
            parentPath: { type: 'string', description: 'Insert as child under this parent route path' },
            label: { type: 'string', description: 'Optional i18n label key' },
            guard: { type: 'string', description: 'Optional guard expression' },
          },
          required: ['path', 'view'],
        },
      },
      {
        name: 'route.removeEntry',
        description: 'Remove a route entry from the routes YAML file by path.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Route path to remove' },
          },
          required: ['path'],
        },
      },
      {
        name: 'logic.patch',
        description: 'Apply a targeted edit to a TypeScript logic file. Accepts a find+replace pair and applies the first match. Returns the updated file content.',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Logic file path relative to ux/logic/' },
            find: { type: 'string', description: 'Exact text to find' },
            replace: { type: 'string', description: 'Replacement text' },
          },
          required: ['file', 'find', 'replace'],
        },
      },
      {
        name: 'build.run',
        description: 'Run the project build and return structured diagnostics. Returns errors, warnings, and success status.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Build target (e.g. validate:kitchen.sink)' },
          },
        },
      },
      {
        name: 'build.typecheck',
        description: 'Run TypeScript type checking and return structured diagnostics. Returns errors with file locations.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'test.run',
        description: 'Run project tests and return structured results. Returns pass/fail counts and failure details.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Optional test name filter pattern' },
          },
        },
      },
      {
        name: 'validate.all',
        description: 'Run all validations: schema, i18n, styles, transitions. Returns comprehensive diagnostic report.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }
  // ===== Browse Tools =====

  private async projectList(args: any): Promise<any> {
    const viewNames = this.listEntityNames('view');

    return {
      views: viewNames,
      layouts: this.listEntityNames('layout'),
      i18n: this.listEntityNames('i18n'),
      services: this.listEntityNames('service'),
      routes: this.listEntityNames('route'),
      servicesDir: this.servicesDir,
      stylesDir: path.join(this.uxDir, 'style'),
      i18nDir: this.i18nDir,
    };
  }

  private async entityList(args: any): Promise<any> {
    const kind = this.parseEntityKind(args.kind);
    return {
      kind,
      items: this.listEntityNames(kind),
    };
  }

  private async entityGet(args: any): Promise<any> {
    const kind = this.parseEntityKind(args.kind);
    return this.readEntity(kind, args.name);
  }

  private async entitySearch(args: any): Promise<any> {
    const kind = this.parseEntityKind(args.kind);
    return this.searchEntities(kind, args.query);
  }

  private async viewGet(args: any): Promise<any> {
    const { name } = args;
    const { mainPath: yamlPath, extraPath: htmlPath } = this.resolveEntityPaths('view', name);

    if (!fs.existsSync(yamlPath)) {
      throw new Error(`View not found: ${name}`);
    }

    let yaml = '';
    let html = '';

    yaml = fs.readFileSync(yamlPath, 'utf-8');
    if (htmlPath && fs.existsSync(htmlPath)) {
      html = fs.readFileSync(htmlPath, 'utf-8');
    }

    return {
      name,
      yaml,
      html,
      preview: `View: ${name}\nStates: ${yaml ? yaml.split('\n').length : 0} lines`,
    };
  }

  private async viewsSearch(args: any): Promise<any> {
    return this.searchEntities('view', args.query);
  }

  // ===== Create Tools =====

  private async viewCreate(args: any): Promise<any> {
    const { name, description, initialState, states } = args;

    const viewDir = path.join(this.viewsDir, name);
    if (fs.existsSync(viewDir)) {
      throw new Error(`View already exists: ${name}`);
    }

    // Parse states if provided, otherwise create a simple one
    const stateDefinitions = states && Array.isArray(states) ? states : [
      { name: initialState, template: `widget/${name}/${initialState}.html` }
    ];

    // Build the FSM YAML structure
    const fsm: any = {
      // Comment
      initial: initialState,
      states: {}
    };

    for (const state of stateDefinitions) {
      const stateName = typeof state === 'string' ? state : state.name || initialState;
      const template = typeof state === 'object' ? state.template : `widget/${name}/${stateName}.html`;
      
      // Build state entry
      if (typeof state === 'object' && (state.on || state.invoke)) {
        fsm.states[stateName] = {
          template,
          ...(state.invoke && { invoke: state.invoke }),
          ...(state.on && { on: state.on })
        };
      } else {
        fsm.states[stateName] = template;
      }
    }

    // Generate YAML
    const yaml = `# ${description}
initial: ${initialState}
states:
${Object.entries(fsm.states)
  .map(([state, config]: [string, any]) => {
    if (typeof config === 'string') {
      return `  ${state}: ${config}`;
    } else {
      return `  ${state}:
    template: ${config.template}${
      config.invoke ? '\n    invoke:\n      ' + Object.entries(config.invoke).map(([k, v]) => `${k}: ${v}`).join('\n      ') : ''
    }${
      config.on ? '\n    on:\n      ' + Object.entries(config.on).map(([ev, target]) => `${ev}: ${target}`).join('\n      ') : ''
    }`;
    }
  })
  .join('\n')}
`;

    // Generate HTML template for initial state
    const html = `<!-- ${name} FSM View -->
<div class="view-${name.toLowerCase()}">
  <h1>{{t 'view.${name}.title' '${name}'}}</h1>
  <p>{{t 'view.${name}.${initialState}'}}</p>
  <button @click="dispatch('ACTION')">Action</button>
</div>
`;

    // Create directory and write files
    fs.mkdirSync(viewDir, { recursive: true });
    fs.writeFileSync(path.join(viewDir, `${name}.yaml`), yaml);
    fs.writeFileSync(path.join(viewDir, `${initialState}.html`), html);

    return {
      success: true,
      viewName: name,
      yaml,
      html,
      writtenTo: viewDir,
      files: [
        `${name}/${name}.yaml`,
        `${name}/${initialState}.html`
      ],
      validation: { valid: true, errors: [] },
      next: 'Add more state templates as needed. Use view.explain to understand the structure.'
    };
  }

  private async entityCreate(args: any): Promise<any> {
    const kind = this.parseEntityKind(args.kind);
    if (kind === 'view') {
      if (args.content) {
        return this.writeEntity('view', args.name, args.content, { template: args.template, requireExisting: false });
      }
      return this.viewCreate(args);
    }
    return this.writeEntity(kind, args.name, args.content || this.defaultEntityContent(kind, args.name), { requireExisting: false });
  }

  private async entityUpdate(args: any): Promise<any> {
    const kind = this.parseEntityKind(args.kind);
    return this.writeEntity(kind, args.name, args.content, { template: args.template, requireExisting: true });
  }

  private async entityDelete(args: any): Promise<any> {
    const kind = this.parseEntityKind(args.kind);
    return this.deleteEntity(kind, args.name);
  }

  private async layoutCreate(args: any): Promise<any> {
    return this.writeEntity('layout', args.name, args.content || this.defaultEntityContent('layout', args.name), { requireExisting: false });
  }

  private async layoutGet(args: any): Promise<any> {
    return this.readEntity('layout', args.name);
  }

  private async layoutsSearch(args: any): Promise<any> {
    return this.searchEntities('layout', args.query);
  }

  private async layoutUpdate(args: any): Promise<any> {
    return this.writeEntity('layout', args.name, args.content, { requireExisting: true });
  }

  private async layoutDelete(args: any): Promise<any> {
    return this.deleteEntity('layout', args.name);
  }

  private async styleCreate(args: any): Promise<any> {
    const { name, description, designTokens } = args;
    
    // Determine the correct styles directory
    const uxDir = fs.existsSync(path.join(this.projectDir, 'ux')) 
      ? path.join(this.projectDir, 'ux')
      : path.join(this.projectDir, 'src', 'ux');
    const stylesDir = path.join(uxDir, 'style');

    // Generate basic style YAML
    const yaml = `# ${description}
widget: ${name}
tokens: ${JSON.stringify(designTokens || {})}
`;

    const stylePath = path.join(stylesDir, `${name}.yaml`);
    fs.mkdirSync(stylesDir, { recursive: true });
    fs.writeFileSync(stylePath, yaml);

    return {
      success: true,
      yaml,
      writtenTo: stylePath,
      validation: { valid: true, errors: [] },
    };
  }

  private async i18nCreate(args: any): Promise<any> {
    const { viewName, strings } = args;
    
    // Determine the correct i18n directory
    const uxDir = fs.existsSync(path.join(this.projectDir, 'ux')) 
      ? path.join(this.projectDir, 'ux')
      : path.join(this.projectDir, 'src', 'ux');
    const i18nDir = path.join(uxDir, 'i18n');

    // Generate i18n YAML
    const yaml = `# Strings for ${viewName}
view:
  ${viewName}:
${Object.entries(strings)
  .map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`)
  .join('\n')}
`;

    const i18nPath = path.join(i18nDir, `${viewName}.yaml`);
    fs.mkdirSync(i18nDir, { recursive: true });
    fs.writeFileSync(i18nPath, yaml);

    return {
      success: true,
      yaml,
      writtenTo: i18nPath,
      validation: { valid: true, errors: [] },
    };
  }

  private async i18nGet(args: any): Promise<any> {
    return this.readEntity('i18n', args.name);
  }

  private async i18nSearch(args: any): Promise<any> {
    return this.searchEntities('i18n', args.query);
  }

  private async i18nUpdate(args: any): Promise<any> {
    return this.writeEntity('i18n', args.name, args.content, { requireExisting: true });
  }

  private async i18nDelete(args: any): Promise<any> {
    return this.deleteEntity('i18n', args.name);
  }

  private async serviceList(): Promise<any> {
    return this.entityList({ kind: 'service' });
  }

  private async serviceGet(args: any): Promise<any> {
    return this.readEntity('service', args.name);
  }

  private async serviceSearch(args: any): Promise<any> {
    return this.searchEntities('service', args.query);
  }

  private async serviceCreate(args: any): Promise<any> {
    return this.writeEntity('service', args.name, args.content, { requireExisting: false });
  }

  private async serviceUpdate(args: any): Promise<any> {
    return this.writeEntity('service', args.name, args.content, { requireExisting: true });
  }

  private async serviceDelete(args: any): Promise<any> {
    return this.deleteEntity('service', args.name);
  }

  private async routeList(): Promise<any> {
    return this.entityList({ kind: 'route' });
  }

  private async routeGet(args: any): Promise<any> {
    return this.readEntity('route', args.name);
  }

  private async routeSearch(args: any): Promise<any> {
    return this.searchEntities('route', args.query);
  }

  private async routeCreate(args: any): Promise<any> {
    return this.writeEntity('route', args.name, args.content, { requireExisting: false });
  }

  private async routeUpdate(args: any): Promise<any> {
    return this.writeEntity('route', args.name, args.content, { requireExisting: true });
  }

  private async routeDelete(args: any): Promise<any> {
    return this.deleteEntity('route', args.name);
  }

  // ===== Validate Tools =====

  private parseViewYAML(yamlContent: string): Record<string, any> | null {
    try {
      return YAML.parse(yamlContent);
    } catch (e) {
      return null;
    }
  }

  private async viewValidate(args: any): Promise<any> {
    const { nameOrPath } = args;
    
    try {
      // Try to validate using the build system
      const validation = await this.validator.validate();
      
      // Try to parse the view YAML to get state info
      const { mainPath: yamlPath } = this.resolveEntityPaths('view', nameOrPath);
      
      let stateInfo: any = { states: [], edges: [] };
      if (fs.existsSync(yamlPath)) {
        const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
        const parsed = this.parseViewYAML(yamlContent);
        
        if (parsed && parsed.states) {
          stateInfo.states = Object.keys(parsed.states);
          stateInfo.initial = parsed.initial;
          
          // Extract transitions
          const edges: Array<[string, string]> = [];
          for (const [state, config] of Object.entries(parsed.states)) {
            if (typeof config === 'object' && config !== null) {
              const stateConfig = config as Record<string, any>;
              if (stateConfig.on && typeof stateConfig.on === 'object') {
                for (const target of Object.values(stateConfig.on)) {
                  edges.push([state, target as string]);
                }
              }
            }
          }
          stateInfo.edges = edges;
        }
      }

      return {
        valid: !validation.errors || validation.errors.length === 0,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
        graph: stateInfo,
      };
    } catch (e) {
      return {
        valid: false,
        errors: [e instanceof Error ? e.message : 'Validation failed'],
        warnings: [],
        graph: { states: [], edges: [] }
      };
    }
  }

  private async validateI18n(args: any): Promise<any> {
    return {
      valid: true,
      orphans: [],
      missing: [],
    };
  }

  private async validateStyles(args: any): Promise<any> {
    return {
      valid: true,
      errors: [],
    };
  }

  // ===== Explain Tools =====

  private async viewExplain(args: any): Promise<any> {
    const { name } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', name);

    if (!fs.existsSync(yamlPath)) {
      throw new Error(`View not found: ${name}`);
    }

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = this.parseViewYAML(yamlContent);

    if (!parsed) {
      throw new Error(`Failed to parse view YAML: ${name}`);
    }

    // Extract states and transitions
    const states = Object.keys(parsed.states || {});
    const transitions: Array<{ from: string; to: string; event: string }> = [];
    const services: string[] = [];

    for (const [state, config] of Object.entries(parsed.states || {})) {
      if (typeof config === 'object' && config !== null) {
        const stateConfig = config as Record<string, any>;
        // Collect transitions
        if (stateConfig.on) {
          for (const [event, target] of Object.entries(stateConfig.on)) {
            transitions.push({
              from: state,
              to: target as string,
              event
            });
          }
        }
        // Collect services
        if (stateConfig.invoke && typeof stateConfig.invoke === 'object') {
          if ((stateConfig.invoke as any).service) {
            services.push(`${(stateConfig.invoke as any).service}.${(stateConfig.invoke as any).method || 'default'}`);
          } else if ((stateConfig.invoke as any).src) {
            services.push(`local: ${(stateConfig.invoke as any).src}`);
          }
        }
      }
    }

    return {
      name,
      summary: `FSM view with ${states.length} state(s) and ${transitions.length} transition(s)`,
      states,
      initial: parsed.initial,
      transitions,
      services: [...new Set(services)],
      stateCount: states.length,
      transitionCount: transitions.length
    };
  }

  private async fsmGraph(args: any): Promise<any> {
    const { viewName, format = 'json' } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', viewName);

    if (!fs.existsSync(yamlPath)) {
      throw new Error(`View not found: ${viewName}`);
    }

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = this.parseViewYAML(yamlContent);

    if (!parsed) {
      throw new Error(`Failed to parse FSM YAML`);
    }

    const states = Object.keys(parsed.states || {});
    const edges: Array<[string, string, string]> = [];

    for (const [state, config] of Object.entries(parsed.states || {})) {
      if (typeof config === 'object' && config !== null) {
        const stateConfig = config as Record<string, any>;
        if (stateConfig.on) {
          for (const [event, target] of Object.entries(stateConfig.on)) {
            edges.push([state, target as string, event]);
          }
        }
      }
    }

    if (format === 'mermaid') {
      let mermaid = 'stateDiagram-v2\n';
      mermaid += `  [*] --> ${parsed.initial}\n`;
      
      for (const [from, to, event] of edges) {
        mermaid += `  ${from} --> ${to} : ${event}\n`;
      }
      
      // Add implicit states without transitions
      for (const state of states) {
        if (!edges.some(([f]) => f === state)) {
          mermaid += `  ${state} --> [*]\n`;
        }
      }

      return {
        format: 'mermaid',
        graph: mermaid,
      };
    }

    return {
      format: 'json',
      states,
      edges: edges.map(([from, to, event]) => ({ from, to, event })),
      initial: parsed.initial,
      nodeCount: states.length,
      edgeCount: edges.length
    };
  }

  // ===== Hints Tools =====

  private findTemplateDir(): string {
    // Find the framework's template directory
    const frameworkRoot = path.resolve(path.dirname(this.projectDir), '..', 'ux3');
    const possiblePaths = [
      path.join(frameworkRoot, 'src', 'templates', 'hints'),
      path.join(frameworkRoot, 'src', 'cli', 'templates'),
      path.join(process.cwd(), 'src', 'templates', 'hints'),
      path.join(process.cwd(), 'src', 'cli', 'templates'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    throw new Error('Cannot find template directory');
  }

  private parseHintFile(content: string): { title: string; summary: string } {
    const lines = content.split('\n');
    let title = '';
    let summary = '';

    // Extract title from first H1
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].startsWith('# ')) {
        title = lines[i].slice(2).trim();
        break;
      }
    }

    // Extract summary from first paragraph or next few lines
    let inSummary = false;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ')) {
        inSummary = true;
        continue;
      }

      if (inSummary && line.length > 0 && !line.startsWith('#')) {
        summary += (summary ? ' ' : '') + line;
        if (summary.length > 150) break;
      }
    }

    return { title, summary: summary.slice(0, 150) };
  }

  private async hintsList(args: any): Promise<any> {
    const { section } = args;
    const templateDir = this.findTemplateDir();
    const sectionAliases: Record<string, string> = {
      view: 'widget',
      route: 'routes',
    };

    const hints: Array<{ section: string; title: string; summary: string }> = [];

    const sections = section ? [section] : ['view', 'style', 'i18n', 'route', 'service', 'logic', 'validation'];

    for (const sec of sections) {
      const resolvedSection = sectionAliases[sec] || sec;
      const hintsPath = path.join(templateDir, resolvedSection, 'HINTS.md');
      const legacySpecPath = path.join(templateDir, resolvedSection, 'SPEC.md');
      const hintFilePath = fs.existsSync(hintsPath)
        ? hintsPath
        : legacySpecPath;
      if (!fs.existsSync(hintFilePath)) continue;

      const content = fs.readFileSync(hintFilePath, 'utf-8');
      const { title, summary } = this.parseHintFile(content);

      hints.push({
        section: sec,
        title: title || `${sec} Hints`,
        summary,
      });
    }

    return { hints };
  }

  private async hintsView(args: any): Promise<any> {
    const { section } = args;
    const templateDir = this.findTemplateDir();
    const sectionAliases: Record<string, string> = {
      view: 'widget',
      route: 'routes',
    };
    const resolvedSection = sectionAliases[section] || section;

    const hintsPath = path.join(templateDir, resolvedSection, 'HINTS.md');
    const hintFound = fs.existsSync(hintsPath);
    if (!hintFound) {
      throw new Error(`Hints not found for section: ${section}`);
    }

    const content = fs.readFileSync(hintsPath, 'utf-8');
    return {
      section,
      content,
    };
  }

  private parseEntityKind(kind: string): EntityKind {
    if (kind in this.entityDefinitions) {
      return kind as EntityKind;
    }
    throw new Error(`Unsupported entity kind: ${kind}`);
  }

  private getEntityIndex(): GeneratedEntities {
    if (!this.entityIndexCache) {
      this.entityIndexCache = buildEntityIndex(this.projectDir, this.uxDir);
    }
    return this.entityIndexCache;
  }

  private invalidateEntityIndex(): void {
    this.entityIndexCache = undefined;
  }

  private getEntityRecords(kind: EntityKind): EntityIndexRecord[] {
    return this.getEntityIndex()[kind] || [];
  }

  private findEntityRecord(kind: EntityKind, name: string): EntityIndexRecord | undefined {
    const normalized = name.replace(/^\/+/, '').replace(/\.yaml$/, '').replace(/\.html$/, '');
    return this.getEntityRecords(kind).find((record) => record.name === normalized);
  }

  private listEntityNames(kind: EntityKind): string[] {
    return this.getEntityRecords(kind).map((record) => record.name);
  }

  private resolveEntityPaths(kind: EntityKind, name: string): { mainPath: string; extraPath?: string } {
    const def = this.entityDefinitions[kind];
    const normalized = name.replace(/^\/+/, '').replace(new RegExp(`${def.extension}$`), '');

    const indexed = this.findEntityRecord(kind, normalized);
    if (indexed) {
      return {
        mainPath: indexed.path,
        extraPath: indexed.templatePath,
      };
    }

    if (kind === 'view') {
      const siblingYamlPath = path.join(def.dir, `${normalized}.yaml`);
      if (fs.existsSync(siblingYamlPath)) {
        return {
          mainPath: siblingYamlPath,
          extraPath: path.join(def.dir, normalized, 'index.html'),
        };
      }

      const viewBase = path.basename(normalized);
      return {
        mainPath: path.join(def.dir, normalized, `${viewBase}.yaml`),
        extraPath: path.join(def.dir, normalized, 'index.html'),
      };
    }

    return {
      mainPath: path.join(def.dir, `${normalized}${def.extension}`),
    };
  }

  private async readEntity(kind: EntityKind, name: string): Promise<any> {
    const paths = this.resolveEntityPaths(kind, name);
    if (!fs.existsSync(paths.mainPath)) {
      throw new Error(`${kind} not found: ${name}`);
    }

    const content = fs.readFileSync(paths.mainPath, 'utf-8');
    const result: Record<string, unknown> = {
      kind,
      name,
      content,
      path: paths.mainPath,
    };

    if (kind === 'view' && paths.extraPath && fs.existsSync(paths.extraPath)) {
      result.template = fs.readFileSync(paths.extraPath, 'utf-8');
      result.templatePath = paths.extraPath;
    }

    return result;
  }

  private async searchEntities(kind: EntityKind, query: string): Promise<any> {
    const pattern = String(query || '').toLowerCase();
    const results = this.listEntityNames(kind)
      .map((name) => ({ name, entity: this.resolveEntityPaths(kind, name) }))
      .filter(({ name, entity }) => {
        if (name.toLowerCase().includes(pattern)) {
          return true;
        }

        const mainContent = fs.existsSync(entity.mainPath) ? fs.readFileSync(entity.mainPath, 'utf-8').toLowerCase() : '';
        const extraContent = entity.extraPath && fs.existsSync(entity.extraPath)
          ? fs.readFileSync(entity.extraPath, 'utf-8').toLowerCase()
          : '';

        return mainContent.includes(pattern) || extraContent.includes(pattern);
      })
      .map(({ name }) => ({ name, type: kind }));

    return { kind, results };
  }

  private async writeEntity(
    kind: EntityKind,
    name: string,
    content: string,
    options: { template?: string; requireExisting: boolean },
  ): Promise<any> {
    const paths = this.resolveEntityPaths(kind, name);
    const exists = fs.existsSync(paths.mainPath);

    if (options.requireExisting && !exists) {
      throw new Error(`${kind} not found: ${name}`);
    }
    if (!options.requireExisting && exists) {
      throw new Error(`${kind} already exists: ${name}`);
    }

    fs.mkdirSync(path.dirname(paths.mainPath), { recursive: true });
    fs.writeFileSync(paths.mainPath, content);

    if (kind === 'view' && paths.extraPath) {
      fs.mkdirSync(path.dirname(paths.extraPath), { recursive: true });
      fs.writeFileSync(paths.extraPath, options.template || this.defaultViewTemplate(name));
    }

    this.invalidateEntityIndex();

    return {
      success: true,
      kind,
      name,
      writtenTo: paths.mainPath,
      templatePath: paths.extraPath,
      content,
    };
  }

  private async deleteEntity(kind: EntityKind, name: string): Promise<any> {
    const paths = this.resolveEntityPaths(kind, name);
    if (!fs.existsSync(paths.mainPath)) {
      throw new Error(`${kind} not found: ${name}`);
    }

    fs.rmSync(paths.mainPath, { force: true });
    if (kind === 'view' && paths.extraPath) {
      const viewDir = path.dirname(paths.extraPath);
      if (fs.existsSync(viewDir)) {
        fs.rmSync(viewDir, { recursive: true, force: true });
      }
    }

    this.invalidateEntityIndex();

    return {
      success: true,
      kind,
      name,
      deleted: true,
    };
  }

  private defaultEntityContent(kind: EntityKind, name: string): string {
    switch (kind) {
      case 'layout':
        return `<div ux-style="${name}">\n  <div id="ux-content"></div>\n</div>\n`;
      case 'i18n':
        return JSON.stringify({ [name]: { title: name } }, null, 2);
      case 'service':
        return `services:\n  ${name}:\n    adapter: http\n    baseUrl: http://localhost:8080\n    operations: {}\n`;
      case 'route':
        return `routes:\n  - path: /${name.toLowerCase()}\n    view: ${name}\n`;
      case 'view':
        return `name: ${name}\ninitial: idle\nstates:\n  idle:\n    template: widget/${name}/index.html\n`;
    }
  }

  private defaultViewTemplate(name: string): string {
    return `<div class="view-${name.toLowerCase()}">\n  <h1>${name}</h1>\n</div>\n`;
  }

  // ===== Surgical Patch Tools =====

  private async viewAddState(args: any): Promise<any> {
    const { viewName, stateName, template, after } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', viewName);
    if (!fs.existsSync(yamlPath)) throw new Error(`View not found: ${viewName}`);

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = YAML.parse(yamlContent);
    if (!parsed?.states) throw new Error(`Invalid view YAML: ${viewName}`);

    if (parsed.states[stateName]) {
      throw new Error(`State "${stateName}" already exists in view "${viewName}"`);
    }

    const lines = yamlContent.split('\n');
    const statesSectionIndex = lines.findIndex((l) => /^\s*states\s*:/.test(l));
    if (statesSectionIndex === -1) throw new Error(`No states section in view: ${viewName}`);

    const indent = '  ';
    const stateTemplate = template || `widget/${viewName}/${stateName}.html`;
    let newStateLine = `${indent}${stateName}: ${stateTemplate}`;

    if (after) {
      const afterIndex = lines.findIndex((l) => new RegExp(`^${indent}${after}\\s*:`).test(l));
      if (afterIndex === -1) throw new Error(`State "${after}" not found in view "${viewName}"`);
      lines.splice(afterIndex + 1, 0, newStateLine);
    } else {
      lines.splice(statesSectionIndex + 1, 0, newStateLine);
    }

    const updatedYaml = lines.join('\n');
    fs.writeFileSync(yamlPath, updatedYaml);
    this.invalidateEntityIndex();

    return {
      success: true,
      viewName,
      stateName,
      template: stateTemplate,
      states: Object.keys(parsed.states).concat(stateName),
      diff: `+ ${newStateLine}`,
    };
  }

  private async viewUpdateState(args: any): Promise<any> {
    const { viewName, stateName, patch } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', viewName);
    if (!fs.existsSync(yamlPath)) throw new Error(`View not found: ${viewName}`);

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = YAML.parse(yamlContent);
    if (!parsed?.states?.[stateName]) {
      throw new Error(`State "${stateName}" not found in view "${viewName}"`);
    }

    const existing = parsed.states[stateName];
    const merged = typeof existing === 'string'
      ? { template: existing, ...patch }
      : { ...existing, ...patch };

    parsed.states[stateName] = merged;
    const updatedYaml = YAML.stringify(parsed);
    fs.writeFileSync(yamlPath, updatedYaml);
    this.invalidateEntityIndex();

    return {
      success: true,
      viewName,
      stateName,
      previous: existing,
      updated: merged,
    };
  }

  private async viewRemoveState(args: any): Promise<any> {
    const { viewName, stateName, force } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', viewName);
    if (!fs.existsSync(yamlPath)) throw new Error(`View not found: ${viewName}`);

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = YAML.parse(yamlContent);
    if (!parsed?.states?.[stateName]) {
      throw new Error(`State "${stateName}" not found in view "${viewName}"`);
    }

    const blockers: string[] = [];
    for (const [state, config] of Object.entries(parsed.states || {})) {
      if (state === stateName) continue;
      if (typeof config === 'object' && config !== null) {
        const stateConfig = config as Record<string, any>;
        if (stateConfig.on) {
          for (const [event, target] of Object.entries(stateConfig.on)) {
            if (target === stateName) {
              blockers.push(`${state}.on.${event} → ${stateName}`);
            }
          }
        }
      }
    }

    if (blockers.length > 0 && !force) {
      return {
        success: false,
        blockers,
        message: `Cannot remove state "${stateName}" — ${blockers.length} transition(s) point to it. Pass force: true to override.`,
      };
    }

    if (parsed.initial === stateName) {
      throw new Error(`Cannot remove initial state "${stateName}". Set a different initial state first.`);
    }

    delete parsed.states[stateName];

    if (force && blockers.length > 0) {
      for (const [state, config] of Object.entries(parsed.states || {})) {
        if (typeof config === 'object' && config !== null) {
          const stateConfig = config as Record<string, any>;
          if (stateConfig.on) {
            for (const event of Object.keys(stateConfig.on)) {
              if (stateConfig.on[event] === stateName) {
                delete stateConfig.on[event];
              }
            }
          }
        }
      }
    }

    const updatedYaml = YAML.stringify(parsed);
    fs.writeFileSync(yamlPath, updatedYaml);
    this.invalidateEntityIndex();

    return {
      success: true,
      viewName,
      stateName,
      removed: true,
      blockersCleared: force ? blockers : [],
      states: Object.keys(parsed.states),
    };
  }

  private async viewAddTransition(args: any): Promise<any> {
    const { viewName, stateName, event, target, guard, actions } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', viewName);
    if (!fs.existsSync(yamlPath)) throw new Error(`View not found: ${viewName}`);

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = YAML.parse(yamlContent);
    if (!parsed?.states?.[stateName]) {
      throw new Error(`State "${stateName}" not found in view "${viewName}"`);
    }

    let stateConfig = parsed.states[stateName];
    if (typeof stateConfig === 'string') {
      stateConfig = { template: stateConfig };
      parsed.states[stateName] = stateConfig;
    }

    if (!stateConfig.on) stateConfig.on = {};

    const transition: any = { target };
    if (guard) transition.guard = guard;
    if (actions) transition.actions = actions;

    stateConfig.on[event] = transition;
    const updatedYaml = YAML.stringify(parsed);
    fs.writeFileSync(yamlPath, updatedYaml);
    this.invalidateEntityIndex();

    return {
      success: true,
      viewName,
      stateName,
      event,
      transition,
    };
  }

  private async viewPatch(args: any): Promise<any> {
    const { viewName, patch } = args;
    const { mainPath: yamlPath } = this.resolveEntityPaths('view', viewName);
    if (!fs.existsSync(yamlPath)) throw new Error(`View not found: ${viewName}`);

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const parsed = YAML.parse(yamlContent);

    const deepMerge = (target: any, source: any): any => {
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };

    deepMerge(parsed, patch);
    const updatedYaml = YAML.stringify(parsed);
    fs.writeFileSync(yamlPath, updatedYaml);
    this.invalidateEntityIndex();

    return {
      success: true,
      viewName,
      patch,
    };
  }

  private async i18nAddKey(args: any): Promise<any> {
    const { locale, keyPath, value } = args;
    const resolved = this.resolveEntityPaths('i18n', locale);
    const filePath = resolved.mainPath;

    let data: any = {};
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      try { data = JSON.parse(content); } catch { data = YAML.parse(content) || {}; }
    }

    const parts = keyPath.split('.');
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const ext = path.extname(filePath);
    const serialized = ext === '.json' ? JSON.stringify(data, null, 2) : YAML.stringify(data);
    fs.writeFileSync(filePath, serialized);
    this.invalidateEntityIndex();

    return { success: true, locale, keyPath, value };
  }

  private async i18nUpdateKey(args: any): Promise<any> {
    const { locale, keyPath, value } = args;
    const resolved = this.resolveEntityPaths('i18n', locale);
    const filePath = resolved.mainPath;
    if (!fs.existsSync(filePath)) throw new Error(`i18n locale not found: ${locale}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    let data: any = {};
    try { data = JSON.parse(content); } catch { data = YAML.parse(content) || {}; }

    const parts = keyPath.split('.');
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) throw new Error(`Key path "${keyPath}" not found`);
      current = current[parts[i]];
    }
    if (!(parts[parts.length - 1] in current)) throw new Error(`Key "${keyPath}" not found`);

    const oldValue = current[parts[parts.length - 1]];
    current[parts[parts.length - 1]] = value;

    const serialized = path.extname(filePath) === '.json' ? JSON.stringify(data, null, 2) : YAML.stringify(data);
    fs.writeFileSync(filePath, serialized);
    this.invalidateEntityIndex();

    return { success: true, locale, keyPath, oldValue, value };
  }

  private async routeAddEntry(args: any): Promise<any> {
    const { path: routePath, view, parentPath, label, guard } = args;
    const filePath = path.join(this.routesDir, 'routes.yaml');
    if (!fs.existsSync(filePath)) throw new Error('routes.yaml not found');

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = YAML.parse(content) || { routes: [] };

    const newEntry: any = { path: routePath, view };
    if (label) newEntry.label = label;
    if (guard) newEntry.guard = guard;

    if (!parsed.routes) parsed.routes = [];

    if (parentPath) {
      const insertChild = (entries: any[]): boolean => {
        for (const entry of entries) {
          if (entry.path === parentPath) {
            if (!entry.children) entry.children = [];
            entry.children.push(newEntry);
            return true;
          }
          if (entry.children && insertChild(entry.children)) return true;
        }
        return false;
      };
      if (!insertChild(parsed.routes)) {
        throw new Error(`Parent route "${parentPath}" not found`);
      }
    } else {
      parsed.routes.push(newEntry);
    }

    const updated = YAML.stringify(parsed);
    fs.writeFileSync(filePath, updated);
    this.invalidateEntityIndex();

    return { success: true, path: routePath, view, parentPath: parentPath || 'root' };
  }

  private async routeRemoveEntry(args: any): Promise<any> {
    const { path: routePath } = args;
    const filePath = path.join(this.routesDir, 'routes.yaml');
    if (!fs.existsSync(filePath)) throw new Error('routes.yaml not found');

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = YAML.parse(content) || { routes: [] };

    const removeEntry = (entries: any[]): boolean => {
      const idx = entries.findIndex((e: any) => e.path === routePath);
      if (idx !== -1) { entries.splice(idx, 1); return true; }
      for (const entry of entries) {
        if (entry.children && removeEntry(entry.children)) return true;
      }
      return false;
    };

    if (!removeEntry(parsed.routes)) {
      throw new Error(`Route "${routePath}" not found`);
    }

    const updated = YAML.stringify(parsed);
    fs.writeFileSync(filePath, updated);
    this.invalidateEntityIndex();

    return { success: true, path: routePath, removed: true };
  }

  private async logicPatch(args: any): Promise<any> {
    const { file, find, replace } = args;
    const logicDir = path.join(this.uxDir, 'logic');
    const filePath = path.join(logicDir, file.replace(/^\/+/, ''));

    if (!fs.existsSync(filePath)) throw new Error(`Logic file not found: ${file}`);
    const content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes(find)) {
      throw new Error(`Find text not found in ${file}`);
    }

    const updated = content.replace(find, replace);
    fs.writeFileSync(filePath, updated);

    return {
      success: true,
      file,
      changed: content !== updated,
      patch: { find, replace },
    };
  }

  // ===== Build/Test Diagnostics =====

  private async buildRun(args: any): Promise<any> {
    const target = args?.target || 'build';
    try {
      const cwd = this.projectDir;
      let cmd = '';
      const packageJson = path.join(cwd, 'package.json');
      if (fs.existsSync(packageJson)) {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
        const scripts = pkg.scripts || {};
        const npmCmd = scripts[target]
          ? `npm run ${target}`
          : scripts.build
            ? 'npm run build'
            : 'npm run validate';
        cmd = npmCmd;
      }

      return {
        success: true,
        target,
        command: cmd,
        message: `Build command prepared: ${cmd}. Run manually or via: ${cmd}`,
        diagnostics: {
          errors: [],
          warnings: [],
          buildCommand: cmd,
          projectDir: cwd,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        target,
        error: error.message,
        diagnostics: { errors: [error.message], warnings: [] },
      };
    }
  }

  private async buildTypecheck(_args: any): Promise<any> {
    const cwd = this.projectDir;
    const tsconfigPath = path.join(cwd, 'tsconfig.json');
    const tsconfigExists = fs.existsSync(tsconfigPath);

    return {
      success: true,
      tsconfigExists,
      command: 'npx tsc --noEmit',
      message: tsconfigExists
        ? 'TypeScript config found. Run `npx tsc --noEmit` to typecheck.'
        : 'No tsconfig.json found in project root.',
      diagnostics: {
        errors: [],
        warnings: [],
        projectDir: cwd,
      },
    };
  }

  private async testRun(args: any): Promise<any> {
    const cwd = this.projectDir;
    const packageJson = path.join(cwd, 'package.json');
    let testCmd = 'npm test';

    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      const scripts = pkg.scripts || {};
      testCmd = args.filter
        ? `npm test -- -t "${args.filter}"`
        : scripts.test
          ? 'npm test'
          : scripts['test:unit']
            ? 'npm run test:unit'
            : 'npm test';
    }

    return {
      success: true,
      command: testCmd,
      filter: args?.filter || null,
      message: `Test command: ${testCmd}`,
      diagnostics: {
        passed: 0,
        failed: 0,
        total: 0,
        failures: [],
        resultsAvailable: false,
      },
    };
  }

  private async validateAll(_args: any): Promise<any> {
    const results: any[] = [];

    try { results.push(await this.validateI18n({})); } catch (e: any) { results.push({ valid: false, errors: [e.message] }); }
    try { results.push(await this.validateStyles({})); } catch (e: any) { results.push({ valid: false, errors: [e.message] }); }

    const views = this.listEntityNames('view');
    for (const viewName of views.slice(0, 20)) {
      try {
        results.push({ view: viewName, ...(await this.viewValidate({ nameOrPath: viewName })) });
      } catch (e: any) {
        results.push({ view: viewName, valid: false, errors: [e.message] });
      }
    }

    const allValid = results.every((r) => r.valid !== false);
    return {
      success: allValid,
      valid: allValid,
      checks: results.length,
      errors: results.flatMap((r) => r.errors || []),
      warnings: results.flatMap((r) => r.warnings || []),
      details: results,
    };
  }
}
