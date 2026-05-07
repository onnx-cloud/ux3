import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

const RESOURCE_URIS = {
  schemaView: '/schema/view',
  schemaI18n: '/schema/i18n',
  schemaStyle: '/schema/style',
  promptSystem: '/prompt/system',
  projectStructure: '/project/structure',
  projectServices: '/project/services',
  view: (name: string) => `/views/${name}`,
  example: (name: string) => `/examples/${name}`,
} as const;

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Registry for MCP resources.
 * Resources are exposed as server-relative paths for browser-friendly MCP clients.
 */
export class ResourceRegistry {
  private projectDir: string;
  private resources = new Map<string, Resource>();
  private viewsDir: string;
  private uxDir: string;
  private frameworkRoot: string;
  private resourceBaseUrl: string;

  constructor(projectDir: string, resourceBaseUrl = 'http://localhost') {
    this.projectDir = projectDir;
    this.resourceBaseUrl = resourceBaseUrl;
    
    // Support both src/ux (new projects) and ux (examples)
    const uxPath = path.join(projectDir, 'ux');
    const srcUxPath = path.join(projectDir, 'src', 'ux');
    this.uxDir = fs.existsSync(uxPath) ? uxPath : srcUxPath;
    this.viewsDir = fs.existsSync(path.join(this.uxDir, 'widget'))
      ? path.join(this.uxDir, 'widget')
      : path.join(this.uxDir, 'view');
    this.frameworkRoot =
      this.findFrameworkRoot(MODULE_DIR) ??
      this.findFrameworkRoot(process.cwd()) ??
      this.findFrameworkRoot(projectDir) ??
      path.resolve(projectDir);
    
    this.registerResources();
  }

  private registerResources() {
    // View resources (dynamic)
    this.registerPattern('/views/');
    
    // Schema resources
    this.registerResource({
      uri: RESOURCE_URIS.schemaView,
      name: 'View Schema',
      description: 'JSON Schema for UX3 views',
      mimeType: 'application/json',
    });
    this.registerResource({
      uri: RESOURCE_URIS.schemaI18n,
      name: 'i18n Schema',
      description: 'JSON Schema for i18n declarations',
      mimeType: 'application/json',
    });
    this.registerResource({
      uri: RESOURCE_URIS.schemaStyle,
      name: 'Style Schema',
      description: 'JSON Schema for styles',
      mimeType: 'application/json',
    });

    // System prompt resource
    this.registerResource({
      uri: RESOURCE_URIS.promptSystem,
      name: 'System Prompt',
      description: 'System prompt for LLM assistance',
      mimeType: 'text/plain',
    });

    // Example resources
    const examplesDir = path.join(this.frameworkRoot, 'examples');
    if (fs.existsSync(examplesDir)) {
      fs.readdirSync(examplesDir).forEach((example) => {
        this.registerResource({
          uri: RESOURCE_URIS.example(example),
          name: `${example} Example`,
          description: `Example app: ${example}`,
        });
      });
    }

    // Project resources
    this.registerResource({
      uri: RESOURCE_URIS.projectStructure,
      name: 'Project Structure',
      description: 'Directory tree and stats',
    });
    this.registerResource({
      uri: RESOURCE_URIS.projectServices,
      name: 'Services',
      description: 'Service registry and signatures',
    });
  }

  private registerPattern(pattern: string) {
    // Dynamic pattern for /views/{name}
    // Will be resolved in readResource()
  }

  private registerResource(resource: Resource) {
    this.resources.set(this.toResourceUri(resource.uri), {
      ...resource,
      uri: this.toResourceUri(resource.uri),
    });
  }

  async readResource(uri: string): Promise<string> {
    const resourcePath = this.toResourcePath(uri);

    // Handle /views/{name} resources (and legacy view://{name})
    if (resourcePath.startsWith('/views/')) {
      const viewName = resourcePath.slice('/views/'.length);
      return this.readViewResource(viewName);
    }
    if (uri.startsWith('view://')) {
      const viewName = uri.slice('view://'.length);
      return this.readViewResource(viewName);
    }

    // Handle schema resources
    if (resourcePath === RESOURCE_URIS.schemaView || uri === 'schema://view') {
      return this.readSchemaFile('view');
    }
    if (resourcePath === RESOURCE_URIS.schemaI18n || uri === 'schema://i18n') {
      return this.readSchemaFile('i18n');
    }
    if (resourcePath === RESOURCE_URIS.schemaStyle || uri === 'schema://style') {
      return this.readSchemaFile('style');
    }

    // Handle system prompt
    if (resourcePath === RESOURCE_URIS.promptSystem || uri === 'prompt://system') {
      return this.readSystemPrompt();
    }

    // Handle example resources
    if (resourcePath.startsWith('/examples/')) {
      const exampleName = resourcePath.slice('/examples/'.length);
      return this.readExampleResource(exampleName);
    }
    if (uri.startsWith('example://')) {
      const exampleName = uri.slice('example://'.length);
      return this.readExampleResource(exampleName);
    }

    // Handle project resources
    if (resourcePath === RESOURCE_URIS.projectStructure || uri === 'project://structure') {
      return this.readProjectStructure();
    }
    if (resourcePath === RESOURCE_URIS.projectServices || uri === 'project://services') {
      return this.readServicesRegistry();
    }

    throw new Error(`Resource not found: ${uri}`);
  }

  private readSystemPrompt(): string {
    return `# UX3 Framework Guide

You are a UX3 expert assistant. UX3 is a compile-first SPA framework where:
- Views are finite-state machines (FSMs) declared in YAML
- Templates are plain HTML with i18n keys and event handlers
- Styles and i18n are declarative, not hardcoded in templates

## Core FSM Pattern

\`\`\`yaml
initial: idle
states:
  idle:
    template: widget/login/idle.html
    on:
      SUBMIT: submitting
  submitting:
    template: widget/login/submitting.html
    invoke:
      src: handleLogin  # local function
      # or:
      # service: auth
      # method: login
    on:
      SUCCESS: done
      ERROR: idle
  done: widget/login/done.html
\`\`\`

## Available MCP Tools

### Browse
- \`project.list\` — List all views, services, styles
- \`view.get\` — Read view YAML + HTML
- \`views.search\` — Find views by keyword or state
- \`view.explain\` — Understand FSM structure
- \`fsm.graph\` — Visualize state transitions (JSON/Mermaid)

### Create
- \`view.create\` — Generate new view from description
- \`style.create\` — Generate style widget
- \`i18n.create\` — Scaffold i18n keys

### Validate
- \`view.validate\` — Check schema, templates, reachability
- \`validate.i18n\` — Find missing or unused keys
- \`validate.styles\` — Validate token refs

### Help
- \`hints.list\` — List framework hints by section
- \`hints.view\` — View full hint documentation

## Best Practices

1. **Keep views focused**: One FSM per screen, one template per state
2. **Name states clearly**: idle, loading, error, success, not s1, s2, s3
3. **Keep i18n keys scoped**: view.\`{viewName\}.\`{key\}
4. **Prefer simple transitions**: avoid deeply nested state trees
5. **Use services for side effects**: keep logic handlers for view-specific behavior
6. **Test incrementally**: create views, validate, then refine

## Workflow Example

1. Use \`view.create\` to scaffold a new view with initial state
2. Use \`view.explain\` to understand the generated FSM
3. Use \`fsm.graph --format mermaid\` to visualize transitions
4. Update YAML directly for additional states/transitions
5. Use \`view.validate\` to check before building
`;
  }

  private readViewResource(viewName: string): string {
    const viewDir = path.join(this.uxDir, 'view', viewName);
    const siblingYamlPath = path.join(this.viewsDir, `${viewName}.yaml`);
    const siblingHtmlPath = path.join(this.viewsDir, `${viewName}.html`);

    if (!fs.existsSync(viewDir) && !fs.existsSync(siblingYamlPath) && !fs.existsSync(siblingHtmlPath)) {
      throw new Error(`View not found: ${viewName}`);
    }

    const yamlPath = fs.existsSync(path.join(viewDir, `${viewName}.yaml`))
      ? path.join(viewDir, `${viewName}.yaml`)
      : siblingYamlPath;
    const htmlPath = fs.existsSync(path.join(viewDir, `${viewName}.html`))
      ? path.join(viewDir, `${viewName}.html`)
      : siblingHtmlPath;

    let content = `# ${viewName}\n\n`;

    if (fs.existsSync(yamlPath)) {
      content += '## YAML Configuration\n\n```yaml\n';
      content += fs.readFileSync(yamlPath, 'utf-8');
      content += '\n```\n\n';
    }

    if (fs.existsSync(htmlPath)) {
      content += '## HTML Template\n\n```html\n';
      content += fs.readFileSync(htmlPath, 'utf-8');
      content += '\n```\n';
    }

    return content;
  }

  private readSchemaFile(schemaName: string): string {
    let schemaPath = path.join(this.projectDir, 'schema', `${schemaName}.schema.json`);

    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(this.frameworkRoot, 'schema', `${schemaName}.schema.json`);
    }

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    return fs.readFileSync(schemaPath, 'utf-8');
  }

  private readExampleResource(exampleName: string): string {
    const examplePath = path.join(this.frameworkRoot, 'examples', exampleName);

    if (!fs.existsSync(examplePath)) {
      throw new Error(`Example not found: ${exampleName}`);
    }

    // Return structure + sample view
    let content = `# ${exampleName} Example\n\n`;

    // List views in the example
    const viewsDir = fs.existsSync(path.join(examplePath, 'ux', 'widget'))
      ? path.join(examplePath, 'ux', 'widget')
      : fs.existsSync(path.join(examplePath, 'ux', 'view'))
        ? path.join(examplePath, 'ux', 'view')
        : path.join(examplePath, 'src', 'ux', 'view');
    if (fs.existsSync(viewsDir)) {
      const views = fs.readdirSync(viewsDir).filter((f) => !f.startsWith('.'));
      content += `## Views\n\n${views.map((v) => `- ${v}`).join('\n')}\n\n`;

      // Show first view as sample
      if (views.length > 0) {
        const firstView = views[0];
        const firstViewPath = path.join(viewsDir, firstView);
        const yamlPath = path.join(firstViewPath, `${firstView}.yaml`);
        if (fs.existsSync(yamlPath)) {
          content += `## Sample: ${firstView}\n\n\`\`\`yaml\n`;
          content += fs.readFileSync(yamlPath, 'utf-8');
          content += '\n```\n';
        }
      }
    }

    return content;
  }

  private readProjectStructure(): string {
    let content = '# Project Structure\n\n';

    // Views
    const viewsDir = this.viewsDir;
    if (fs.existsSync(viewsDir)) {
      const views = fs.readdirSync(viewsDir).filter((f) => !f.startsWith('.'));
      content += `## Views (${views.length})\n\n${views.map((v) => `- ${v}`).join('\n')}\n\n`;
    }

    // Styles
    const stylesDir = path.join(this.uxDir, 'style');
    if (fs.existsSync(stylesDir)) {
      const styles = fs.readdirSync(stylesDir)
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.json'))
        .map((f) => f.replace(/\.(yaml|json)$/, ''));
      if (styles.length > 0) {
        content += `## Styles (${styles.length})\n\n${styles.map((s) => `- ${s}`).join('\n')}\n\n`;
      }
    }

    // i18n
    const i18nDir = path.join(this.uxDir, 'i18n');
    if (fs.existsSync(i18nDir)) {
      const i18nFiles = fs.readdirSync(i18nDir)
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.json'))
        .map((f) => f.replace(/\.(yaml|json)$/, ''));
      if (i18nFiles.length > 0) {
        content += `## i18n (${i18nFiles.length})\n\n${i18nFiles.map((i) => `- ${i}`).join('\n')}\n\n`;
      }
    }

    return content;
  }

  private readServicesRegistry(): string {
    // Check both src/services and services directories
    const serviceDirOptions = [
      path.join(this.projectDir, 'src', 'services'),
      path.join(this.projectDir, 'services'),
      path.join(this.uxDir, 'service'),
    ];
    
    let servicesDir = '';
    for (const dir of serviceDirOptions) {
      if (fs.existsSync(dir)) {
        servicesDir = dir;
        break;
      }
    }

    let content = '# Services\n\n';

    if (!servicesDir) {
      content += 'No services directory found.\n';
      return content;
    }

    const serviceFiles = fs
      .readdirSync(servicesDir)
      .filter((f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.startsWith('.'));

    content += `## Available Services (${serviceFiles.length})\n\n`;
    serviceFiles.forEach((file) => {
      const name = file.replace(/\.(ts|js)$/, '');
      content += `- ${name}\n`;
    });

    return content;
  }

  listResources(): Resource[] {
    const resources: Resource[] = [];

    // Add static resources
    this.resources.forEach((resource) => {
      resources.push(resource);
    });

    // Add dynamic view resources (directories only, not .yaml files or other files)
    if (fs.existsSync(this.viewsDir)) {
      const entries = fs.readdirSync(this.viewsDir).filter((f) => !f.startsWith('.'));
      entries.forEach((entry) => {
        const fullPath = path.join(this.viewsDir, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const directYaml = path.join(fullPath, `${entry}.yaml`);
          const siblingYaml = path.join(this.viewsDir, `${entry}.yaml`);
          if (!fs.existsSync(directYaml) && !fs.existsSync(siblingYaml)) {
            return;
          }
          resources.push({
            uri: this.toResourceUri(RESOURCE_URIS.view(entry)),
            name: `${entry} View`,
            description: `View: ${entry}`,
          });
        }
      });
    }

    return resources;
  }

  getResourceDefinitions(): Resource[] {
    return this.listResources();
  }

  private toResourceUri(resourcePath: string): string {
    return new URL(resourcePath, this.resourceBaseUrl).toString();
  }

  private toResourcePath(uri: string): string {
    if (uri.startsWith('/')) {
      return uri;
    }

    if (/^[a-z]+:\/\//i.test(uri)) {
      return new URL(uri).pathname;
    }

    return uri;
  }

  private findFrameworkRoot(startDir: string): string | null {
    let current = path.resolve(startDir);

    while (true) {
      if (
        fs.existsSync(path.join(current, 'schema')) &&
        fs.existsSync(path.join(current, 'package.json')) &&
        fs.existsSync(path.join(current, 'src', 'mcp'))
      ) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}

