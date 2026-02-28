import * as http from 'http';
import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import YAML from 'yaml';
import { processAssets, renderTpl } from './asset-processor';
import { renderDashboard } from './dashboard';

export interface DevServerOptions {
  verbose?: boolean;
  onError?: (error: Error) => void;
}

export interface ServerManifest {
  config: Record<string, any>;
  types: Record<string, any>;
  invokes: Record<string, any>;
  stats: {
    buildTime: number;
    configSize?: number;
    typesSize?: number;
    bundleSize?: number;
  };
}

export class DevServer {
  private server: http.Server | null = null;
  private manifest: ServerManifest | null = null;
  private clients: Set<http.ServerResponse> = new Set();
  private options: Required<DevServerOptions>;

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
  }

  async start(): Promise<void> {
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

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Hot reload and API endpoints (namespaced under /$/ to avoid app conflicts)
        // Dev namespace root (dashboard HTML)
        if (pathname === '/$' || pathname === '/$/') {
          const site = processAssets(this.manifest, this.projectDir);
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.manifest?.config ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/types') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.manifest?.types ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/manifest') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.manifest?.invokes ?? {}, null, 2));
            return;
          }

          if (pathname === '/$/stats') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.manifest?.stats ?? {}, null, 2));
            return;
          }

          // Unknown /$/ path
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        // Serve application front page
        // Priority: project ux3.yaml -> ux/view/index.yaml -> public/index.html -> fallback message
        if (pathname === '/') {
          const i18n = (this.manifest?.config as any)?.i18n || {};
          
          // First, try loading root ux3.yaml to get the most accurate site settings for front page
          let ux3Config: any = {};
          try {
            const rootUx3 = path.join(this.projectDir, 'ux3.yaml');
            const legacyUx3 = path.join(this.projectDir, 'ux', 'ux3.yaml');
            const ux3Content = fsExtra.existsSync(rootUx3) ? await fsp.readFile(rootUx3, 'utf-8') : (fsExtra.existsSync(legacyUx3) ? await fsp.readFile(legacyUx3, 'utf-8') : '');
            if (ux3Content) ux3Config = YAML.parse(ux3Content);
          } catch {}

          const siteFromManifest = (this.manifest?.config as any)?.site || {};
          const siteFields = {
            title: path.basename(this.projectDir),
            ...siteFromManifest,
            ...(ux3Config.site || {})
          };
          const site = processAssets({ config: { ...this.manifest?.config, site: siteFields } }, this.projectDir);

          // First, try fallback: ux/view/index.yaml (if any)
          try {
            const defaultIndexPath = path.join(this.projectDir, 'ux', 'view', 'index.yaml');
            if (fsExtra.existsSync(defaultIndexPath)) {
              const viewYaml = await fsp.readFile(defaultIndexPath, 'utf-8');
              let view: any = {};
              try { view = YAML.parse(viewYaml); } catch {}

              // Resolve view template path (handle top-level and nested states for index fallback)
              let templateRel = '';
              if (view.template) {
                templateRel = view.template;
              } else if (view.states) {
                const stateName = view.initial || 'index';
                templateRel = (view.states[stateName] && view.states[stateName].template) || '';
              }
              let templateHtml = '';

              // Prefer compiled templates from in-memory manifest when available, otherwise read source file
              try {
                const m = String(templateRel).match(/^view\/([^\/]+)(?:\/(.*))?$/);
                const viewName = m ? m[1] : null;
                const stateName = m && m[2] ? m[2].replace(/\.html$/, '') : undefined;

                if (this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                  const tplMap = (this.manifest.config as any).templates || {};
                  // Prefer template map by the path-derived view name, but fall back to the current view's name (e.g., index) if not found
                  const viewTpl = viewName ? (tplMap[viewName] || {}) : {};
                  let candidate = (stateName && viewTpl[stateName]) || Object.values(viewTpl)[0];

                  if (!candidate) {
                    const currentViewName = (view && view.name) ? String(view.name) : 'index';
                    const currentTpl = tplMap[currentViewName] || {};
                    candidate = (stateName && currentTpl[stateName]) || Object.values(currentTpl)[0];
                    if (candidate) { /* resolved template from manifest for current view/state */ }
                  } else {
                    /* resolved template from manifest */
                  }

                  if (candidate) {
                    templateHtml = String(candidate);
                  }
                }

                // Fallback to filesystem when manifest doesn't provide template
                if (!templateHtml) {
                  let templatePath = path.join(this.projectDir, 'ux', templateRel.replace(/^\//, ''));
                  if (!fsExtra.existsSync(templatePath)) {
                    const alt = path.join(this.projectDir, templateRel.replace(/^\//, ''));
                    if (fsExtra.existsSync(alt)) templatePath = alt;
                  }

                  try { templateHtml = await fsp.readFile(templatePath, 'utf-8'); } catch (e) {
                    /* could not read template at path */
                  }
                }
              } catch (err) {
                /* manifest/template resolution failed */
              }

              // Final fallback to project-specific index view logic
              const renderedTemplate = renderTpl(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site });

              const viewLayoutName = (view && view.layout) ? String(view.layout) : 'default';
              const chromeWrapperPath = path.join(this.projectDir, 'ux', 'layout', 'chrome', 'wrapper.html');

              // Layout selection priority:
              // 1. Specific view layout (e.g., default.html)
              // 2. Project default layout (ux/layout/_.html)
              // 3. Framework default layout (src/ui/layouts/_.html)
              let projectLayoutPath = path.join(this.projectDir, 'ux', 'layout', `${viewLayoutName}.html`);
              if (!fsExtra.existsSync(projectLayoutPath)) {
                projectLayoutPath = path.join(this.projectDir, 'ux', 'layout', '_.html');
              }
              const frameworkDefaultPath = path.join(process.cwd(), 'src', 'ui', 'layouts', '_.html');

              let chromeWrapperHtml = '';
              let viewLayoutHtml = '';

              // Load chrome/wrapper or project _.html as the root shell
              if (fsExtra.existsSync(chromeWrapperPath)) {
                chromeWrapperHtml = await fsp.readFile(chromeWrapperPath, 'utf-8');
                // If we have a wrapper, the view's layout goes inside IT
                if (fsExtra.existsSync(projectLayoutPath)) {
                  viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
                }
              } else if (fsExtra.existsSync(path.join(this.projectDir, 'ux', 'layout', '_.html'))) {
                // If there's an ux/layout/_.html, it MUST be the chrome (shell)
                chromeWrapperHtml = await fsp.readFile(path.join(this.projectDir, 'ux', 'layout', '_.html'), 'utf-8');
                // The specific layout (default.html) then becomes the inner layout
                if (viewLayoutName !== '_' && fsExtra.existsSync(path.join(this.projectDir, 'ux', 'layout', `${viewLayoutName}.html`))) {
                    viewLayoutHtml = await fsp.readFile(path.join(this.projectDir, 'ux', 'layout', `${viewLayoutName}.html`), 'utf-8');
                }
              } else if (fsExtra.existsSync(frameworkDefaultPath)) {
                chromeWrapperHtml = await fsp.readFile(frameworkDefaultPath, 'utf-8');
                if (fsExtra.existsSync(projectLayoutPath)) {
                  viewLayoutHtml = await fsp.readFile(projectLayoutPath, 'utf-8');
                }
              }

              // Assemble: chrome <- viewLayout <- renderedTemplate
              
              if (viewLayoutHtml) {
                // Inject view into viewLayout
                viewLayoutHtml = viewLayoutHtml.replace(/\{\{\{\s*content\s*\}\}\}/g, renderedTemplate);
                viewLayoutHtml = renderTpl(viewLayoutHtml, { i18n, site });
              } else {
                viewLayoutHtml = renderedTemplate;
              }

              let finalHtml = '';
              if (chromeWrapperHtml) {
                // Inject viewLayout into chrome
                finalHtml = chromeWrapperHtml
                  .replace(/\{\{\{\s*content\s*\}\}\}/g, viewLayoutHtml)
                  .replace(/\{\{\s*>\s*layout\s*\}\}/g, viewLayoutHtml)
                  .replace(/\{\{\s*site\.template\s*\}\}/g, viewLayoutHtml);
                
                finalHtml = renderTpl(finalHtml, { i18n, site });
              } else {
                finalHtml = viewLayoutHtml;
              }

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
              try { uxConfig = YAML.parse(ux3Content); } catch { /* ignore */ }

              const i18n = (this.manifest?.config as any)?.i18n || {};
              const siteFromManifest = (this.manifest?.config as any)?.site || {};
              const siteFromYaml = uxConfig.site || {};
              
              const mergedSite = {
                title: path.basename(this.projectDir), // base fallback
                ...siteFromManifest,
                ...siteFromYaml
              };

              const site = processAssets({ config: { ...this.manifest?.config, site: mergedSite } }, this.projectDir);

              const indexSpec: string = uxConfig.index || 'view/index.yaml';
              const indexPath = path.join(this.projectDir, 'ux', indexSpec.replace(/^\//, ''));

              if (fsExtra.existsSync(indexPath)) {
                // Load view YAML
                const viewYaml = await fsp.readFile(indexPath, 'utf-8');
                let view: any = {};
                try { view = YAML.parse(viewYaml); } catch {}

                // Resolve view template path (handle top-level and nested states)
                let templateRel = '';
                if (view.template) {
                  templateRel = view.template;
                } else if (view.states) {
                  const stateName = view.initial || 'index';
                  templateRel = (view.states[stateName] && view.states[stateName].template) || '';
                }
                let templateHtml = '';

                // Prefer manifest template first (compiled output), otherwise read source file
                try {
                  const m = String(templateRel).match(/^view\/([^\/]+)(?:\/(.*))?$/);
                  let viewName: string | null = null;
                  let stateName: string | null = null;
                  if (m) {
                    viewName = m[1];
                    stateName = m[2] ? m[2].replace(/\.html$/,'') : (view.initial || 'index');
                  }

                  if (viewName && this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                    const tplMap = (this.manifest.config as any).templates || {};
                    const viewTpl = tplMap[viewName] || {};
                    const candidate = (viewTpl[stateName as string] || Object.values(viewTpl)[0]);
                    if (candidate) {
                      templateHtml = String(candidate);
                      /* resolved template from manifest */
                    }
                  }

                  if (!templateHtml) {
                    let templatePath = path.join(this.projectDir, 'ux', templateRel.replace(/^\//, ''));
                    if (!fsExtra.existsSync(templatePath)) {
                      const alt = path.join(this.projectDir, templateRel.replace(/^\//, ''));
                      if (fsExtra.existsSync(alt)) templatePath = alt;
                    }

                    // DEBUG: show paths and existence
                    /* index path debug removed */
                    try { templateHtml = await fsp.readFile(templatePath, 'utf-8'); } catch (e) { /* could not read template at path */ }
                  }
                } catch (err) {
                  /* manifest template lookup failed */
                }

                // If still missing, instruct developer to run compilation (fail-fast, don't guess)
                if (!templateHtml) {
                  const msg = `<div style="font-family:system-ui,Arial; padding:1rem"><h2>Missing view template</h2><p>The index view references <code>${templateRel}</code> but the template could not be found.</p><p>Run <code>npx ux3 compile</code> or <code>npm run build</code> to generate view artifacts, then refresh.</p></div>`;
                  templateHtml = msg;
                  // Note: do not throw or attempt additional fs guessing — stay within architecture contract
                  console.warn(`[DevServer] Missing template: ${templateRel}. Instructing developer to compile generated views.`);
                }

                // Render the template into layout, resolving layoutName/title similar to other index path
                const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site });

                // Layout selection priority (most specific -> fallback):
                // 1) ux/layout/<layoutName>.html
                // 2) ux/layout/<layoutName>/_.html
                // 3) ux/layout/_.html (project default)
                // 4) src/ui/layouts/_.html (framework default)
                // This ensures compiled manifest templates that include app bootstrapping are wrapped consistently.
                const layoutName = (view && view.layout) ? String(view.layout) : '_';
                const candidateLayoutA = path.join(this.projectDir, 'ux', 'layout', `${layoutName}.html`);
                const candidateLayoutB = path.join(this.projectDir, 'ux', 'layout', layoutName, '_.html');
                const projectDefaultLayout = path.join(this.projectDir, 'ux', 'layout', '_.html');
                const defaultLayout = path.join(process.cwd(), 'src', 'ui', 'layouts', '_.html');

                let layoutPath = defaultLayout;
                if (fsExtra.existsSync(candidateLayoutA)) layoutPath = candidateLayoutA;
                else if (fsExtra.existsSync(candidateLayoutB)) layoutPath = candidateLayoutB;
                else if (fsExtra.existsSync(projectDefaultLayout)) layoutPath = projectDefaultLayout;

                let layoutHtml = '';
                try { layoutHtml = await fsp.readFile(layoutPath, 'utf-8'); } catch {}

                // Render layout with site/i18n context
                let layoutToRender = layoutHtml || '';
                // Normalize layout placeholders to a canonical site.template token, then render.
                layoutToRender = layoutToRender.replace(/\{\{\{\s*content\s*\}\}\}/g, '{{ site.template }}');
                layoutToRender = layoutToRender.replace(/\{\{\s*>\s*layout\s*\}\}/g, '{{ site.template }}');
                
                const finalHtml = renderTemplate(layoutToRender, { site: { ...site, template: renderedTemplate }, i18n });

                res.writeHead(200, { 'Content-Type': 'text/html' });
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
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent);
            return;
          }

          // Final fallback: informational page pointing to dev dashboard
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>No application index found</h1><p>Visit <a href="/$/">Dev Dashboard</a></p></body></html>`);
          return;
        }

        // Serve static files
        const filePath = path.join(this.projectDir, 'public', pathname);
        try {
          const content = await fsp.readFile(filePath);
          const contentType = this.getContentType(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
          return;
        } catch (e) {
          // File not found - continue
        }

        // Try to resolve as a configured route -> view
        try {
          const routes: Array<{ path: string; view: string }> = (this.manifest?.config?.routes && Array.isArray(this.manifest!.config.routes)) ? this.manifest!.config.routes : [];
          const match = routes.find(r => this.pathMatches(r.path, pathname));
          if (match) {
            const viewName = match.view;
            const viewYamlPath = path.join(this.projectDir, 'ux', 'view', `${viewName}.yaml`);
            if (fsExtra.existsSync(viewYamlPath)) {
              const viewYaml = await fsp.readFile(viewYamlPath, 'utf-8');
              let view: any = {};
              try { view = YAML.parse(viewYaml); } catch {}

              const i18n = (this.manifest?.config as any)?.i18n || {};
              const site = processAssets(this.manifest, this.projectDir);

              const templateRel = view.template || '';
              let templateHtml = '';

              // Try compiled manifest template for this view first
              try {
                if (this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                  const tplMap = (this.manifest.config as any).templates || {};
                  const viewTpl = tplMap[viewName] || {};
                  // Use specific state template or first available
                  const stateName = (view.initial || 'index');
                  const candidate = viewTpl[stateName] || Object.values(viewTpl)[0];
                  if (candidate) {
                    templateHtml = String(candidate);
                  }
                }

                if (!templateHtml && templateRel) {
                  let templatePath = path.join(this.projectDir, 'ux', templateRel.replace(/^\//,''));
                  if (!fsExtra.existsSync(templatePath)) {
                    const alt = path.join(this.projectDir, templateRel.replace(/^\//,''));
                    if (fsExtra.existsSync(alt)) templatePath = alt;
                  }
                  templateHtml = await fsp.readFile(templatePath, 'utf-8');
                }
              } catch (e) {}

              const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site });

              const layoutName = (view && view.layout) ? String(view.layout) : '_';
              const candidateLayoutA = path.join(this.projectDir, 'ux', 'layout', `${layoutName}.html`);
              const projectDefaultLayout = path.join(this.projectDir, 'ux', 'layout', '_.html');
              const defaultLayout = path.join(process.cwd(), 'src', 'ui', 'layouts', '_.html');

              let layoutPath = defaultLayout;
              if (fsExtra.existsSync(candidateLayoutA)) layoutPath = candidateLayoutA;
              else if (fsExtra.existsSync(projectDefaultLayout)) layoutPath = projectDefaultLayout;

              let layoutHtml = '';
              try { layoutHtml = await fsp.readFile(layoutPath, 'utf-8'); } catch {}

              let finalHtml = '';
              if (layoutHtml) {
                // First pass: replace content/layout placeholders with the actual template
                const assembled = layoutHtml
                  .replace(/\{\{\{\s*content\s*\}\}\}/g, renderedTemplate)
                  .replace(/\{\{\s*>\s*layout\s*\}\}/g, renderedTemplate)
                  .replace(/\{\{\s*site\.template\s*\}\}/g, renderedTemplate);
                
                // Second pass: render the final result with site/i18n tags
                finalHtml = renderTemplate(assembled, { site, i18n });
              } else {
                finalHtml = renderedTemplate;
              }

              res.writeHead(200, { 'Content-Type': 'text/html' });
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
        console.log(`🌐 Dev server running on http://${this.host}:${this.port}`);
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

  broadcast(message: Record<string, any>): void {
    for (const client of Array.from(this.clients)) {
      try {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
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
  private generateIndexFromManifest(): string {
    const manifest = this.manifest ?? null;

    const stats = (manifest && manifest.stats) || {};

    let configSummary = {
      routes: 0,
      services: 0,
      views: 0,
      i18n: 0,
    };

    let viewsList: string[] = [];
    let i18nCount = 0;

    if (manifest) {
      configSummary = {
        routes: Object.keys((manifest.config as any).routes || {}).length,
        services: Object.keys((manifest.config as any).services || {}).length,
        views: Object.keys((manifest.config as any).views || {}).length,
        i18n: Object.keys((manifest.config as any).i18n || {}).length,
      };

      // Attempt to extract view names from manifest.config.views if present
      try {
        const vs = (manifest.config as any).views || {};
        viewsList = Object.keys(vs).map(k => `/view/${k}`);
      } catch {}
    } else {
      // Attempt to compute a lightweight summary from project files
      try {
        const viewsDir = path.join(this.projectDir, 'ux', 'view');

        if (fsExtra.existsSync(viewsDir)) {
          let allFiles: string[] = [];
          try {
            allFiles = fsExtra.readdirSync(viewsDir);
          } catch (err) { console.log('[DevServer] error reading viewsDir', err); }
          const files = allFiles.filter(f => typeof f === 'string' && f.endsWith('.yaml'));

          configSummary.views = files.length;

          // Read each yaml to try to glean view name
          for (const f of files) {
            try {
              const content = fsExtra.readFileSync(path.join(viewsDir, f), 'utf-8');
              let parsed: any = {};
              try { parsed = YAML.parse(content); } catch {}
              let name = parsed?.view?.name || parsed?.name || f.replace(/\.yaml$/, '');
              viewsList.push(`/view/${name}`);
            } catch (err) { console.log('[DevServer] error reading view file', f, err); }
          }
        }

        const i18nDir = path.join(this.projectDir, 'ux', 'i18n');
        if (fsExtra.existsSync(i18nDir)) {
          // Try to read en.json or en/index.json
          const enFile = path.join(i18nDir, 'en.json');
          const enDirIndex = path.join(i18nDir, 'en', 'index.json');
          let keysCount = 0;
          if (fsExtra.existsSync(enFile)) {
            try {
              const content = fsExtra.readFileSync(enFile, 'utf-8');
              const data = JSON.parse(content);
              keysCount = Object.keys(data || {}).length;
            } catch {}
          } else if (fsExtra.existsSync(enDirIndex)) {
            try {
              const content = fsExtra.readFileSync(enDirIndex, 'utf-8');
              const data = JSON.parse(content);
              keysCount = Object.keys(data || {}).length;
            } catch {}
          }
          configSummary.i18n = keysCount;
          i18nCount = keysCount;
        }
      } catch (e) {
        // ignore
      }
    }

    // Include a small, accurate header using the project directory name
    const projectName = path.basename(this.projectDir);

    const viewsHtml = viewsList.length ? `<ul class="space-y-2">${viewsList.map(v => `<li><a href="${v}">${v}</a></li>`).join('\n')}</ul>` : '<div class="text-sm text-slate-500">No views found</div>';

    return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>UX3 Dev — ${projectName}</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n  <style>/* fallback styles */ body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2rem}pre{background:#f8fafc;padding:1rem;border-radius:6px}</style>\n</head>\n<body>\n  <div class="container">\n    <h1>UX3 Dev Server — ${projectName}</h1>\n    <div><strong>Status:</strong> Connected</div>\n\n\n    <div class="grid grid-cols-2 gap-6">\n      <div>\n        <h2 class="text-lg font-semibold">Build Stats</h2>\n        <pre id="stats" class="mt-2 bg-slate-50 p-4 rounded text-sm">${JSON.stringify(stats, null, 2)}</pre>\n\n        <h2 class="text-lg font-semibold mt-4">Configuration Summary</h2>\n        <pre id="summary" class="mt-2 bg-slate-50 p-4 rounded text-sm">${JSON.stringify(configSummary, null, 2)}</pre>\n\n        <h2 class="text-lg font-semibold mt-4">Available Endpoints</h2>\n        <ul class="list-disc list-inside mt-2">\n          <li><a class="text-blue-600 hover:underline" href="/$/config"><code class="bg-slate-100 px-2 py-1 rounded">GET /$/config</code></a> — configuration</li>\n          <li><a class="text-blue-600 hover:underline" href="/$/types"><code class="bg-slate-100 px-2 py-1 rounded">GET /$/types</code></a> — generated types</li>\n          <li><a class="text-blue-600 hover:underline" href="/$/manifest"><code class="bg-slate-100 px-2 py-1 rounded">GET /$/manifest</code></a> — service invokes</li>\n          <li><a class="text-blue-600 hover:underline" href="/$/stats"><code class="bg-slate-100 px-2 py-1 rounded">GET /$/stats</code></a> — build stats</li>\n          <li><a class="text-blue-600 hover:underline" href="/$/hot-reload"><code class="bg-slate-100 px-2 py-1 rounded">GET /$/hot-reload</code></a> — SSE endpoint</li>\n        </ul>\n      </div>\n\n      <div>\n        <h2 class="text-lg font-semibold">Views</h2>\n        <div class="mt-2">\n          ${viewsHtml}\n        </div>\n\n        <h2 class="text-lg font-semibold mt-6">i18n</h2>\n        <div class="mt-2 text-sm text-slate-700">Total keys: ${configSummary.i18n}</div>\n      </div>\n    </div>\n\n    <script>\n      const es = new EventSource('/$/hot-reload');\n      es.onmessage = (e)=>{ try{ const d=JSON.parse(e.data); if(d.type==='rebuild') location.reload(); }catch(e){} };\n      async function refresh(){ try{ const s=await (await fetch('/$/stats')).json(); document.getElementById('stats').textContent = JSON.stringify(s,null,2); const c=await (await fetch('/$/config')).json(); document.getElementById('summary').textContent = JSON.stringify({ routes: Object.keys(c.routes||{}).length, services: Object.keys(c.services||{}).length, views: Object.keys(c.views||{}).length, i18n: Object.keys(c.i18n||{}).length }, null, 2);}catch(e){} }\n      window.addEventListener('load', ()=>refresh());\n    </script>\n  </div>\n</body>\n</html>`;
  }

  private pathMatches(routePath: string, requestPath: string): boolean {
    const norm = (p: string) => (p || '').replace(/\/+$/, '') || '/';
    return norm(routePath) === norm(requestPath);
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

function renderTemplate(template: string, context: Record<string, any> = {}): string {
  if (!template) return '';

  let html = template;

  // Handle i18n placeholders: {{i18n.key.path}}
  html = html.replace(/\{\{\s*i18n\.([^\}]+?)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((acc: any, part: string) => (acc && acc[part] !== undefined ? acc[part] : undefined), context.i18n || {});
    return val !== undefined ? String(val) : `[${key}]`;
  });

  // Handle triple-mustache {{{ key }}} first for raw insertion (e.g., unescaped HTML)
  html = html.replace(/\{\{\{\s*([^\}]+?)\s*\}\}\}/g, (_, key) => {
    const val = key.split('.').reduce((acc: any, part: string) => (acc && acc[part] !== undefined ? acc[part] : undefined), context);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });

  // Then handle double-mustache with escaping semantics (basic: return string value)
  return html.replace(/\{\{\s*([^\}]+?)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((acc: any, part: string) => (acc && acc[part] !== undefined ? acc[part] : undefined), context);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}

