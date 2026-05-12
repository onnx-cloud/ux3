import * as http from 'http';
import * as path from 'path';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';
import fsExtra from 'fs-extra';
import YAML from 'yaml';
import { processAssets } from './asset-processor';
import { renderDashboard } from './dashboard';
import { HandlebarsLite } from '../hbs/index.js';
import { MCPHTTPHandler } from '../mcp/http-handler.js';

const frameworkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function callLLM(messages: any[]): Promise<string> {
  const endpoint = (process.env?.GROQ_OPENAI_ENDPOINT || '').trim();
  const apiKey = (process.env?.GROQ_API_KEY || '').trim();
  const model = (process.env?.GROQ_MODEL || 'openai/gpt-oss-120b').trim();

  if (!endpoint || !apiKey) {
    return `LLM not configured. Set GROQ_OPENAI_ENDPOINT, GROQ_API_KEY, and GROQ_MODEL in .env.\n\nYou said: "${messages[messages.length - 1]?.content?.slice(0, 100) || '...'}"`;
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : (m.content?.text || '') })),
      max_tokens: 1024,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    return `LLM API error (${resp.status}): ${err.slice(0, 200)}`;
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || data?.content || JSON.stringify(data);
}

function generateWidgetData(): any {
  return {
    kanban: {
      columns: [
        { title: 'Todo', cards: [{ id: '1', title: 'Setup CI/CD pipeline' }, { id: '2', title: 'Add integration tests' }] },
        { title: 'In Progress', cards: [{ id: '3', title: 'Refactor API layer' }] },
        { title: 'Done', cards: [{ id: '4', title: 'Design system v2' }, { id: '5', title: 'Auth module' }] },
      ],
    },
    gantt: {
      tasks: [
        { id: '1', label: 'Phase 1: Discovery', start: '2026-01-05', end: '2026-02-15', progress: 100, dependencies: [] },
        { id: '2', label: 'Phase 2: Design', start: '2026-02-10', end: '2026-03-20', progress: 80, dependencies: ['1'] },
        { id: '3', label: 'Phase 3: Development', start: '2026-03-15', end: '2026-05-10', progress: 45, dependencies: ['2'] },
        { id: '4', label: 'Phase 4: Testing', start: '2026-05-01', end: '2026-06-15', progress: 0, dependencies: ['3'] },
      ],
    },
    table: {
      columns: ['ID', 'Name', 'Status', 'Amount', 'Date'],
      rows: Array.from({ length: 60 }, (_, i) => ({
        ID: String(i + 1),
        Name: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'][i % 8],
        Status: i % 3 === 0 ? 'Active' : i % 3 === 1 ? 'Inactive' : 'Pending',
        Amount: `$${Math.floor(Math.random() * 900) + 100}`,
        Date: `2026-${String((i % 5) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      })),
    },
    charts: {
      line: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], values: [45, 52, 38, 65, 48, 70] },
      bar: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [120, 145, 160, 175] },
      donut: { labels: ['Mobile', 'Desktop', 'Tablet'], values: [55, 30, 15] },
    },
    dashboard: {
      widgets: [
        { id: '1', title: 'Revenue', value: '$1.2M', span: 1 },
        { id: '2', title: 'Users', value: '8,420', span: 1 },
        { id: '3', title: 'Orders', value: '1,842', span: 1 },
      ],
      kpis: [
        { label: 'Uptime', value: '98.5%', delta: '+0.3%', trend: 'up' },
        { label: 'Latency', value: '42ms', delta: '-5ms', trend: 'down' },
        { label: 'Success Rate', value: '99.9%', delta: '+0.1%', trend: 'up' },
      ],
    },
    notifications: [
      { id: '1', type: 'info', title: 'System Update', message: 'Version 2.4.0 is now available', time: '2 min ago' },
      { id: '2', type: 'success', title: 'Deployment Complete', message: 'Production deploy succeeded', time: '1 hour ago' },
      { id: '3', type: 'warning', title: 'Disk Space', message: 'Disk usage at 85%', time: '3 hours ago' },
      { id: '4', type: 'error', title: 'Build Failed', message: 'CI pipeline error in step 3', time: '5 hours ago' },
    ],
    tree: [
      { label: 'Documents', children: [{ label: 'Reports', children: [{ label: 'Q1 Report' }, { label: 'Q2 Report' }] }, { label: 'Invoices', children: [{ label: '2026-001' }, { label: '2026-002' }] }] },
    ],
    flow: {
      nodes: [
        { id: '1', label: 'Start', type: 'start', x: 50, y: 80 },
        { id: '2', label: 'Build', type: 'task', x: 200, y: 80 },
        { id: '3', label: 'Test', type: 'task', x: 350, y: 80 },
        { id: '4', label: 'Review', type: 'gateway', x: 500, y: 80 },
        { id: '5', label: 'Deploy', type: 'task', x: 650, y: 80 },
      ],
      edges: [
        { from: '1', to: '2' }, { from: '2', to: '3' }, { from: '3', to: '4' },
        { from: '4', to: '5', label: 'Approved' }, { from: '4', to: '2', label: 'Rejected' },
      ],
    },
  };
}

export interface DevServerOptions {
  verbose?: boolean;
  onError?: (error: Error) => void;
}

export interface ServerManifest {
  config: Record<string, any>;
  types: Record<string, any>;
  invokes: Record<string, any>;
  runtime?: {
    bundle: string;
    styles: string[];
    version: string;
    minified: boolean;
  };
  stats: {
    buildTime: number;
    configSize?: number;
    typesSize?: number;
    bundleSize?: number;
  };
}


async function getSiteConfig(projectDir: string, manifest: ServerManifest | null): Promise<any> {
  let ux3Config: any = {};
  try {
    const rootUx3 = path.join(projectDir, 'ux3.yaml');
    const legacyUx3 = path.join(projectDir, 'ux', 'ux3.yaml');
    const ux3Content = fsExtra.existsSync(rootUx3) ? await fsp.readFile(rootUx3, 'utf-8') : (fsExtra.existsSync(legacyUx3) ? await fsp.readFile(legacyUx3, 'utf-8') : '');
    if (ux3Content) ux3Config = YAML.parse(ux3Content);
  } catch (e) { console.warn('[DevServer] could not read ux3 config', e instanceof Error ? e.message : String(e)); }

  const siteFromManifest = (manifest?.config as any)?.site || {};
  const siteFields = {
    ...siteFromManifest,
    ...(ux3Config.site || {})
  };
  // merge runtime info so processAssets can see it
  const mergedManifest: any = {
    ...(manifest || {}),
    config: { ...manifest?.config, site: siteFields },
  };
  return processAssets(mergedManifest, projectDir);
}

/**
 * Build a NavConfig for template rendering based on routes from manifest
 */
function buildNavConfig(
  pathname: string,
  routes: Array<{ path: string; view: string; children?: any[] }>,
  i18n: Record<string, any> = {}
): Record<string, any> {
  // Find current route (recursive through children, supports wildcards)
  let currentPath = pathname;
  let currentView = 'home';

  const findInTree = (list: Array<{ path: string; view: string; children?: any[] }>): boolean => {
    for (const route of list) {
      if (route.path === pathname) {
        currentPath = route.path;
        currentView = route.view;
        return true;
      }
      if (route.path.includes('*') && pathname.startsWith(route.path.replace(/\/\*$/, ''))) {
        currentPath = pathname;
        currentView = route.view;
        return true;
      }
      if (route.path.includes(':')) {
        const segs = route.path.split('/').filter(Boolean);
        const reqSegs = pathname.split('/').filter(Boolean);
        if (segs.length === reqSegs.length) {
          const match = segs.every((s, i) => s.startsWith(':') || s === reqSegs[i]);
          if (match) { currentPath = pathname; currentView = route.view; return true; }
        }
      }
    }
    for (const route of list) {
      if (route.children?.length && findInTree(route.children)) return true;
    }
    return false;
  };
  findInTree(routes);

  // Build nav routes preserving children
  const buildRoutes = (list: Array<{ path: string; view: string; label?: string; children?: any[] }>): any[] =>
    list.map(route => ({
      path: route.path,
      view: route.view,
      label: route.label || `nav.${route.view}`,
      children: route.children?.length ? buildRoutes(route.children) : undefined,
    }));

  const navRoutes = buildRoutes(routes);

  const getLabel = (route: any): string => {
    if (!route.label) return route.view;
    const parts = route.label.split('.');
    let value: any = i18n;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value === 'string') return value;
    if (!route.label.includes('.')) return route.label;
    return route.view;
  };

  return {
    routes: navRoutes,
    current: { path: currentPath, view: currentView, params: {} },
    canNavigate: (_targetView?: string) => true,
    getLabel,
  };
}

/**
 * Resolve a view template in dev mode.
 * Always reads from the filesystem first so live edits are reflected immediately.
 * Only falls back to manifest (compiled/build-time) templates when the source
 * file does not exist on disk.
 */
async function resolveViewTemplate(
  projectDir: string,
  viewRootDir: string,
  templateRel: string,
  viewName: string
): Promise<string> {
  if (!templateRel) return '';

  const rel = templateRel.replace(/^\//, '');

  const candidates = [
    path.join(projectDir, 'ux', rel),
    path.join(viewRootDir, rel),
    path.join(viewRootDir, viewName, rel),
  ];

  for (const fsPath of candidates) {
    if (fsExtra.existsSync(fsPath)) {
      return await fsp.readFile(fsPath, 'utf-8');
    }
  }

  return '';
}

/**
 * Extract template reference from a parsed view YAML object.
 */
function extractTemplateRef(view: any): string {
  if (view.template) return view.template;
  if (view.states) {
    const stateName = view.initial || Object.keys(view.states)[0];
    const stateConfig = view.states?.[stateName];
    return (typeof stateConfig === 'string' ? stateConfig : stateConfig?.template) || '';
  }
  return '';
}

function resolveLocaleI18n(
  i18nConfig: Record<string, any> = {},
  preferredLocale: string = 'en'
): Record<string, any> {
  if (!i18nConfig || typeof i18nConfig !== 'object') {
    return {};
  }

  const preferred = i18nConfig[preferredLocale];
  if (preferred && typeof preferred === 'object' && !Array.isArray(preferred)) {
    return preferred as Record<string, any>;
  }

  const fallbackEn = i18nConfig.en;
  if (fallbackEn && typeof fallbackEn === 'object' && !Array.isArray(fallbackEn)) {
    return fallbackEn as Record<string, any>;
  }

  const firstLocaleObject = Object.values(i18nConfig).find(
    (entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  );

  // If no locale map shape is detected, assume i18nConfig is already a locale payload.
  return (firstLocaleObject as Record<string, any> | undefined) || i18nConfig;
}

function requireI18nSiteMetadata(i18n: Record<string, any>): void {
  const title = i18n?.site?.title;
  const description = i18n?.site?.description;

  if (typeof title !== 'string' || title.trim().length === 0) {
    console.warn('[ux3 dev] Missing i18n key: site.title — add it to your locale file for proper <title> support');
    if (!i18n.site) i18n.site = {};
    i18n.site.title = '';
  }

  if (typeof description !== 'string' || description.trim().length === 0) {
    console.warn('[ux3 dev] Missing i18n key: site.description — add it to your locale file');
    if (!i18n.site) i18n.site = {};
    i18n.site.description = '';
  }
}

function getRuntimeI18n(
  manifest: ServerManifest | null,
  preferredLocale: string = 'en'
): Record<string, any> {
  const i18nConfig = ((manifest?.config as any)?.i18n || {}) as Record<string, any>;
  const i18n = resolveLocaleI18n(i18nConfig, preferredLocale);
  requireI18nSiteMetadata(i18n);
  return i18n;
}

async function getShellLayout(projectDir: string, view: any): Promise<{ chromeWrapperHtml: string, viewLayoutHtml: string }> {
  const viewLayoutName = (view && view.layout) ? String(view.layout) : '_';
  
  const candidateLayoutA = path.join(projectDir, 'ux', 'layout', `${viewLayoutName}.html`);
  const candidateLayoutB = path.join(projectDir, 'ux', 'layout', viewLayoutName, '_.html');
  const projectDefaultLayout = path.join(projectDir, 'ux', 'layout', '_.html');
  const frameworkDefaultPath = path.join(frameworkRoot, 'src', 'ui', 'layouts', '_.html');
  const chromeWrapperPath = path.join(projectDir, 'ux', 'layout', 'chrome', 'wrapper.html');

  let projectLayoutPath = '';

  if (fsExtra.existsSync(candidateLayoutA)) projectLayoutPath = candidateLayoutA;
  else if (fsExtra.existsSync(candidateLayoutB)) projectLayoutPath = candidateLayoutB;
  else if (fsExtra.existsSync(projectDefaultLayout)) projectLayoutPath = projectDefaultLayout;

  let chromeWrapperHtml = '';
  let viewLayoutHtml = '';

  if (fsExtra.existsSync(chromeWrapperPath)) {
    chromeWrapperHtml = await fsp.readFile(chromeWrapperPath, 'utf-8');
    if (projectLayoutPath && fsExtra.existsSync(projectLayoutPath)) {
      viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
    }
  } else if (fsExtra.existsSync(projectDefaultLayout)) {
    chromeWrapperHtml = await fsp.readFile(projectDefaultLayout, 'utf-8');
    if (viewLayoutName !== '_' && projectLayoutPath && projectLayoutPath !== projectDefaultLayout && fsExtra.existsSync(projectLayoutPath)) {
      viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
    }
  } else if (fsExtra.existsSync(frameworkDefaultPath)) {
    chromeWrapperHtml = await fsp.readFile(frameworkDefaultPath, 'utf-8');
    if (projectLayoutPath && projectLayoutPath !== frameworkDefaultPath && fsExtra.existsSync(projectLayoutPath)) {
      viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
    }
  }
  
  return { chromeWrapperHtml, viewLayoutHtml };
}

async function resolveAndRenderLayout(
  projectDir: string,
  view: any,
  renderedTemplate: string,
  context: any,
  renderFn: (tpl: string, ctx: any) => string
): Promise<string> {
  const { chromeWrapperHtml, viewLayoutHtml } = await getShellLayout(projectDir, view);

  let tempHtml = renderedTemplate;
  if (viewLayoutHtml) {
    tempHtml = viewLayoutHtml.replace(/\{\{\{\s*content\s*\}\}\}/g, renderedTemplate)
                             .replace(/\{\{\s*>\s*layout\s*\}\}/g, renderedTemplate)
                             .replace(/\{\{\s*site\.template\s*\}\}/g, renderedTemplate);
  }

  let finalHtml = tempHtml;
  if (chromeWrapperHtml) {
    finalHtml = chromeWrapperHtml.replace(/\{\{\{\s*content\s*\}\}\}/g, tempHtml)
                                 .replace(/\{\{\s*>\s*layout\s*\}\}/g, tempHtml)
                                 .replace(/\{\{\s*site\.template\s*\}\}/g, tempHtml);
  }

  const rendered = renderFn(finalHtml, context);

  const styleMap: Record<string, string> | undefined = (context?.manifest?.config as any)?.styles;
  return styleMap ? injectStyleClasses(rendered, styleMap) : rendered;
}

function injectStyleClasses(html: string, styleMap: Record<string, string>): string {
  return html.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/gs,
    (tagMatch: string, tagName: string, attrs: string) => {
      const styleAttr = attrs.match(/\s(ux-style|data-style)="([^"]+)"/);
      if (!styleAttr) return tagMatch;

      const key = styleAttr[2];
      const resolved = styleMap[key];
      if (!resolved) return tagMatch;

      const classMatch = attrs.match(/\sclass="([^"]*)"/);
      if (classMatch) {
        const newAttrs = attrs.replace(
          classMatch[0],
          classMatch[0].replace(classMatch[1], `${resolved} ${classMatch[1]}`)
        );
        return `<${tagName}${newAttrs}>`;
      }

      const insertIdx = attrs.indexOf(styleAttr[0]);
      const newAttrs = attrs.slice(0, insertIdx) + ` class="${resolved}"` + attrs.slice(insertIdx);
      return `<${tagName}${newAttrs}>`;
    }
  );
}

export class DevServer {
  private server: http.Server | null = null;
  private manifest: ServerManifest | null = null;
  private clients: Set<http.ServerResponse> = new Set();
  private options: Required<DevServerOptions>;
  private mcpHandler: MCPHTTPHandler;

  constructor(
    private projectDir: string,
    private port: number,
    private host: string,
    options: DevServerOptions = {}
  ) {
    this.options = {
      verbose: options.verbose ?? false,
      onError: options.onError ?? ((e) => console.error('Server error:', e)),
    };
    this.mcpHandler = new MCPHTTPHandler(projectDir);
  }

  async start(): Promise<void> {
    if (!this.manifest) {
      await this.build();
    }
    void this.findRepoRoot(this.projectDir);
    this.server = http.createServer(async (req, res) => {
      // avoid MaxListenersExceeded when many clients connect during dev
      try { this.server?.setMaxListeners(0); } catch {}
      try {
        if (!req.url || !req.headers.host) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request');
          return;
        }

        // Construct URL with host as base to support relative req.url values
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        const viewRootDir = fsExtra.existsSync(path.join(this.projectDir, 'ux', 'widget'))
          ? path.join(this.projectDir, 'ux', 'widget')
          : path.join(this.projectDir, 'ux', 'view');

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Hot reload and API endpoints (namespaced under /$/ to avoid app conflicts)
        // Dev namespace root (dashboard HTML)
        if (pathname === '/$' || pathname === '/$/') {
          const site = await getSiteConfig(this.projectDir, this.manifest);
          const html = await renderDashboard(this.projectDir, this.manifest, site);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
          return;
        }

        // API endpoints under /$/
        if (pathname.startsWith('/$/')) {
          if (pathname === '/$/hot-reload') {
            this.handleHotReload(res);
            return;
          }

          if (pathname === '/$/config') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.config ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/types') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.types ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/manifest') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.invokes ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/stats') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(this.manifest?.stats ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/mcp') {
            await this.mcpHandler.handle(req, res);
            return;
          }

          if (pathname === '/$/llm/chat') {
            await this.handleLlmProxy(req, res);
            return;
          }

          if (pathname === '/$/api/widgets/data') {
            const widgetData = generateWidgetData();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify({ loaded: true, error: null, data: widgetData }, null, 2));
            return;
          }

          if (pathname === '/$/rpc/widgets') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              result: { loaded: true, error: null, data: generateWidgetData() },
            }));
            return;
          }

          // Unknown /$/ path
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        // Serve application front page
        // Priority: project ux3.yaml -> ux/widget/index.yaml -> public/index.html -> fallback message
        if (pathname === '/') {
          const i18n = getRuntimeI18n(this.manifest);
          
          // First, try loading root ux3.yaml to get the most accurate site settings for front page
          

          const site = await getSiteConfig(this.projectDir, this.manifest);


          // First, try fallback: ux/widget/index.yaml (if any)
          try {
            const defaultIndexPath = path.join(viewRootDir, 'index.yaml');
            if (fsExtra.existsSync(defaultIndexPath)) {
              const viewYaml = await fsp.readFile(defaultIndexPath, 'utf-8');
              let view: any = {};
              try { view = YAML.parse(viewYaml); } catch (e) { console.warn('[DevServer] could not parse view YAML', e instanceof Error ? e.message : String(e)); }

              // Resolve view template path
              const templateRel = extractTemplateRef(view);
              const templateHtml = await resolveViewTemplate(
                this.projectDir, viewRootDir, templateRel,
                (view && view.name) ? String(view.name) : 'index'
              );

              const routes: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
              const nav = buildNavConfig(pathname, routes, i18n);
              const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav });

              const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav }, renderTemplate);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(finalHtml);
              return;
            }
          } catch (e) {
            // ignore
          }

          try {
            // Look for ux3.yaml at project root or under ux/
            let ux3Path: string | null = null;
            const rootUx3 = path.join(this.projectDir, 'ux3.yaml');
            const legacyUx3 = path.join(this.projectDir, 'ux', 'ux3.yaml');
            if (fsExtra.existsSync(rootUx3)) ux3Path = rootUx3;
            else if (fsExtra.existsSync(legacyUx3)) ux3Path = legacyUx3;

            if (ux3Path) {
              const ux3Content = await fsp.readFile(ux3Path, 'utf-8');
              let uxConfig: any = {};
              try { uxConfig = YAML.parse(ux3Content); } catch (e) { console.warn('[DevServer] could not parse ux3.yaml', e instanceof Error ? e.message : String(e)); }

              const i18n = getRuntimeI18n(this.manifest);
              const site = await getSiteConfig(this.projectDir, this.manifest);


              const indexSpec: string = uxConfig.index || `${path.basename(viewRootDir)}/index.yaml`;
              const indexPath = path.join(this.projectDir, 'ux', indexSpec.replace(/^\//, ''));

              if (fsExtra.existsSync(indexPath)) {
                // Load view YAML
                const viewYaml = await fsp.readFile(indexPath, 'utf-8');
                let view: any = {};
                try { view = YAML.parse(viewYaml); } catch (e) { console.warn('[DevServer] could not parse view YAML', e instanceof Error ? e.message : String(e)); }

                // Resolve view template path
                const templateRel = extractTemplateRef(view);
                const vName = (view && view.name) ? String(view.name) : path.basename(indexPath, '.yaml');
                const templateHtml = await resolveViewTemplate(
                  this.projectDir, viewRootDir, templateRel,
                  vName
                );

                const routes: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
                const nav = buildNavConfig(pathname, routes, i18n);
                const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav });

                const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site, nav }, renderTemplate);

                res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
                res.end(finalHtml);
                return;
              }
            }
          } catch (e) {
            // swallow and fallback
          }

          // Fallback to serving public/index.html
          const publicIndex = path.join(this.projectDir, 'public', 'index.html');
          if (fsExtra.existsSync(publicIndex)) {
            const indexContent = await fsp.readFile(publicIndex, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(indexContent);
            return;
          }

          // Final fallback: informational page pointing to dev dashboard
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
          res.end(`<html><body><h1>No application index found</h1><p>Visit <a href="/$">Dev Dashboard</a></p></body></html>`);
          return;
        }

        // Serve static files from public directory
        let filePath = path.join(this.projectDir, 'public', pathname);
        try {
          const content = await fsp.readFile(filePath);
          const contentType = this.getContentType(filePath);
          res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
          res.end(content);
          return;
        } catch (e) {
          // File not found in public - fall through
        }

        // Also serve files from dist directory (bundles, styles)
        if (pathname.startsWith('/dist/')) {
          filePath = path.join(this.projectDir, pathname.replace(/^\//, ''));
          try {
            const content = await fsp.readFile(filePath);
            const contentType = this.getContentType(filePath);
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(content);
            return;
          } catch (e) {
            // not found in dist either
          }
        }

        // Try to resolve as a configured route -> view
        try {
          const routes: Array<{ path: string; view: string; children?: any[] }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
          const match = this.findRouteInTree(routes, pathname);
          if (match) {
            const viewName = match.view;
            const viewYamlPath = path.join(viewRootDir, `${viewName}.yaml`);
            if (fsExtra.existsSync(viewYamlPath)) {
              const viewYaml = await fsp.readFile(viewYamlPath, 'utf-8');
              let view: any = {};
              try { view = YAML.parse(viewYaml); } catch (e) { console.warn('[DevServer] could not parse view YAML', e instanceof Error ? e.message : String(e)); }

              const i18n = getRuntimeI18n(this.manifest);
              const site = await getSiteConfig(this.projectDir, this.manifest);

              const templateRel = extractTemplateRef(view);
              const templateHtml = await resolveViewTemplate(
                this.projectDir, viewRootDir, templateRel, viewName
              );

              // For content views, look up the matching content item
              const contentManifest: any = (this.manifest?.config as any)?.content;
              const contentItem = contentManifest?.items?.find(
                (item: any) => item.frontmatter.path === pathname || `/${item.slug}` === pathname
              ) ?? null;

              const routeList: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest.config.routes)) ? this.manifest.config.routes : [];
              const nav = buildNavConfig(pathname, routeList, i18n);
              const templateCtx: Record<string, any> = {
                manifest: this.manifest ?? {},
                projectName: path.basename(this.projectDir),
                i18n,
                site,
                nav,
                ...(contentItem ? { this: contentItem } : {}),
              };
              const renderedTemplate = renderTemplate(templateHtml, templateCtx);

              const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, templateCtx, renderTemplate);

              res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
              res.end(finalHtml);
              return;
            }
          }
        } catch (e) {
          // ignore and continue to 404
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } catch (error) {
        // If we've already sent headers, do not attempt to write again.
        if (res.headersSent) {
          this.options.onError(error instanceof Error ? error : new Error(String(error)));
          return;
        }

        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        this.options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Prevent EventEmitter MaxListeners warnings when many clients connect
    if (this.server) {
      try { this.server.setMaxListeners(0); } catch {}
    }

    return new Promise((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        // Extract startup info
        const templates = (this.manifest?.config as any)?.templates || {};
        const views = Object.keys(templates).length > 0 
          ? Object.keys(templates).join(', ')
          : 'none';

        const routes = (this.manifest?.config as any)?.routes || [];
        const routeViews = routes.length > 0
          ? [...new Set(routes.map((r: any) => r.view))].join(', ')
          : 'none';

        // Use templates if available, otherwise use routes
        const viewsDisplay = views !== 'none' ? views : routeViews;

        // Get plugins from config (can be array of objects or object)
        const pluginsArray = (this.manifest?.config as any)?.plugins;
        let pluginsDisplay = 'none';
        if (Array.isArray(pluginsArray) && pluginsArray.length > 0) {
          pluginsDisplay = pluginsArray.map((p: any) => p.name || p).join(', ');
        } else if (pluginsArray && typeof pluginsArray === 'object') {
          const pluginKeys = Object.keys(pluginsArray);
          if (pluginKeys.length > 0) pluginsDisplay = pluginKeys.join(', ');
        }

        // Get FSMs from config.machines (populated at build time)
        const machines = (this.manifest?.config as any)?.machines || {};
        const fsmDisplay = Object.keys(machines).length > 0
          ? Object.keys(machines).join(', ')
          : 'none';

        console.log(`🌐 Dev server running on http://${this.host}:${this.port}`);
        console.log(`   Views: ${viewsDisplay}`);
        console.log(`   Plugins: ${pluginsDisplay}`);
        console.log(`   FSMs: ${fsmDisplay}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      for (const client of Array.from(this.clients)) {
        client.end();
      }
      this.clients.clear();

      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  setManifest(manifest: ServerManifest): void {
    this.manifest = manifest;
  }

  /**
   * Auto-build the manifest from the project directory using ConfigGenerator.
   * Called by start() when no manifest has been set, so the server can serve
   * routes (including content routes) without a prior compile step.
   */
  async build(): Promise<void> {
    try {
      const { ConfigGenerator } = await import('../build/config-generator.js');
      const outDir = path.join(this.projectDir, 'generated');
      const gen = new ConfigGenerator({ configDir: this.projectDir, outputDir: outDir, isDevServer: true });
      const cfg = await gen.generate();
      this.manifest = {
        config: cfg as any,
        types: {},
        invokes: {},
        stats: { buildTime: Date.now() },
      };
    } catch (e) {
      if (this.options.verbose) {
        console.warn('[DevServer] auto-build failed:', e);
      }
    }
  }

  broadcast(message: Record<string, any>): void {
    for (const client of Array.from(this.clients)) {
      try {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    }
  }

  private async handleLlmProxy(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      res.end(); return;
    }
    if (req.method !== 'POST') { res.writeHead(405); res.end('POST only'); return; }
    try {
      const body = await readRequestBody(req);
      const rpc = JSON.parse(body);
      if (!rpc?.params?.messages) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32602, message: 'Missing messages' }, id: rpc?.id }));
        return;
      }
      const messages = rpc.params.messages;
      const response = await callLLM(messages);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ jsonrpc: '2.0', result: { content: { type: 'text', text: response }, role: 'assistant' }, id: rpc.id }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: e instanceof Error ? e.message : String(e) }, id: null }));
    }
  }

  private handleHotReload(res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Generate a simple dev index based on current manifest to avoid writing files next to source.
   */
  /* removed unused generateIndexFromManifest */

  private pathMatches(routePath: string, requestPath: string): boolean {
    const normalize = (p: string) => (p || '').replace(/\/+$/, '') || '/';
    const route = normalize(routePath);
    const request = normalize(requestPath);

    if (route === request) return true;

    const routeSegments = route.split('/').filter(Boolean);
    const requestSegments = request.split('/').filter(Boolean);

    const wildcardIdx = routeSegments.indexOf('*');
    if (wildcardIdx !== -1) {
      if (requestSegments.length < wildcardIdx) return false;
      const prefixSegments = routeSegments.slice(0, wildcardIdx);
      const requestPrefix = requestSegments.slice(0, wildcardIdx);
      return prefixSegments.every((segment, index) => {
        return segment.startsWith(':') || segment === requestPrefix[index];
      });
    }

    if (routeSegments.length !== requestSegments.length) return false;
    return routeSegments.every((segment, index) => {
      return segment.startsWith(':') || segment === requestSegments[index];
    });
  }

  /** Recursively search a route tree (with children) for a matching route. */
  private findRouteInTree(
    routes: Array<{ path: string; view: string; children?: any[] }>,
    pathname: string
  ): { path: string; view: string } | null {
    for (const r of routes) {
      if (this.pathMatches(r.path, pathname)) return r;
    }
    for (const r of routes) {
      if (r.children?.length) {
        const found = this.findRouteInTree(r.children, pathname);
        if (found) return found;
      }
    }
    return null;
  }

  /** Find repo root by looking for package.json */
  private findRepoRoot(start: string): string | null {
    let current = start;
    for (let i = 0; i < 10; i++) {
      const candidate = path.join(current, 'package.json');
      if (fsExtra.existsSync(candidate)) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return null;
  }
}

/**
 * Template rendering using HBS (Handlebars-Lite) engine
 * Supports {{#if}}, {{#each}}, {{#unless}}, {{key}}, {{{html}}} and helpers
 */
const hbsEngine = new HandlebarsLite({
  helpers: {
    eq: (a: any, b: any) => a === b,
    ne: (a: any, b: any) => a !== b,
  },
});

function renderTemplate(template: string, context: Record<string, any> = {}): string {
  if (!template) return '';
  return hbsEngine.render(template, context);
}

