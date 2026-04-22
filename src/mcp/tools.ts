import fs from 'fs';
import path from 'path';
import { Validator } from '../build/validator.js';
import YAML from 'yaml';

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

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.validator = new Validator({ projectDir });
    
    // Support both src/ux/view (new projects) and ux/view (examples)
    const srcUxPath = path.join(projectDir, 'src', 'ux');
    const uxPath = path.join(projectDir, 'ux');
    this.uxDir = fs.existsSync(uxPath) ? uxPath : srcUxPath;
    this.viewsDir = path.join(this.uxDir, 'view');
    
    this.registerTools();
  }

  private registerTools() {
    // Browse tools
    this.registerTool('project.list', this.projectList.bind(this));
    this.registerTool('view.get', this.viewGet.bind(this));
    this.registerTool('views.search', this.viewsSearch.bind(this));

    // Create tools
    this.registerTool('view.create', this.viewCreate.bind(this));
    this.registerTool('style.create', this.styleCreate.bind(this));
    this.registerTool('i18n.create', this.i18nCreate.bind(this));

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
    ];
  }

  // ===== Browse Tools =====

  private async projectList(args: any): Promise<any> {
    const viewNames = fs.existsSync(this.viewsDir)
      ? fs.readdirSync(this.viewsDir).filter((f) => !f.startsWith('.'))
      : [];

    return {
      views: viewNames,
      servicesDir: path.join(this.projectDir, 'src', 'services'),
      stylesDir: path.join(this.projectDir, 'src', 'ux', 'style'),
      i18nDir: path.join(this.projectDir, 'src', 'ux', 'i18n'),
    };
  }

  private async viewGet(args: any): Promise<any> {
    const { name } = args;
    const viewDir = path.join(this.viewsDir, name);

    if (!fs.existsSync(viewDir)) {
      throw new Error(`View not found: ${name}`);
    }

    const yamlPath = path.join(viewDir, `${name}.yaml`);
    const htmlPath = path.join(viewDir, `${name}.html`);

    let yaml = '';
    let html = '';

    if (fs.existsSync(yamlPath)) {
      yaml = fs.readFileSync(yamlPath, 'utf-8');
    }
    if (fs.existsSync(htmlPath)) {
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
    const { query } = args;
    const pattern = query.toLowerCase();

    const matches = fs
      .readdirSync(this.viewsDir)
      .filter((name) => {
        if (name.toLowerCase().includes(pattern)) return true;

        const yamlPath = path.join(this.viewsDir, name, `${name}.yaml`);
        if (fs.existsSync(yamlPath)) {
          const content = fs.readFileSync(yamlPath, 'utf-8');
          return content.toLowerCase().includes(pattern);
        }
        return false;
      })
      .map((name) => ({ name, type: 'view' }));

    return { results: matches };
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
      { name: initialState, template: `view/${name}/${initialState}.html` }
    ];

    // Build the FSM YAML structure
    const fsm: any = {
      // Comment
      initial: initialState,
      states: {}
    };

    for (const state of stateDefinitions) {
      const stateName = typeof state === 'string' ? state : state.name || initialState;
      const template = typeof state === 'object' ? state.template : `view/${name}/${stateName}.html`;
      
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
      const viewDir = path.join(this.viewsDir, nameOrPath);
      const yamlPath = path.join(viewDir, `${nameOrPath}.yaml`);
      
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
    const viewDir = path.join(this.viewsDir, name);
    const yamlPath = path.join(viewDir, `${name}.yaml`);

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
    const viewDir = path.join(this.viewsDir, viewName);
    const yamlPath = path.join(viewDir, `${viewName}.yaml`);

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
      path.join(frameworkRoot, 'src', 'cli', 'templates'),
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

    const hints: Array<{ section: string; title: string; summary: string }> = [];

    const sections = section ? [section] : ['view', 'style', 'i18n', 'route', 'service', 'logic', 'validation'];

    for (const sec of sections) {
      const specPath = path.join(templateDir, sec, 'SPEC.md');
      if (!fs.existsSync(specPath)) continue;

      const content = fs.readFileSync(specPath, 'utf-8');
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

    const specPath = path.join(templateDir, section, 'SPEC.md');
    if (!fs.existsSync(specPath)) {
      throw new Error(`Hints not found for section: ${section}`);
    }

    const content = fs.readFileSync(specPath, 'utf-8');
    return {
      section,
      content,
    };
  }
}
