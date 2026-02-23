import * as http from 'http';
import * as path from 'path';
import { promises as fsp } from 'fs';
import fsExtra from 'fs-extra';
import YAML from 'yaml';

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
          try {
            // Resolve dev widget from either source or dist to avoid static import failures during tests
            let DevWidget: any = undefined;

            const sourcePath = path.join(this.projectDir, 'src', 'ui', 'compositions', 'dev-widget.js');
            const distPath = path.join(process.cwd(), 'dist', 'ui', 'compositions', 'dev-widget.js');

            if (fsExtra.existsSync(sourcePath)) {
              const mod = await import(sourcePath);
              DevWidget = mod.DevWidget;
            } else if (fsExtra.existsSync(distPath)) {
              const mod = await import(distPath);
              DevWidget = mod.DevWidget;
            }

            if (DevWidget && this.manifest) {
              const widget = new DevWidget();
              await widget.initialize();
              const html = widget.render({ props: { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), projectDir: this.projectDir } });
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(html);
              return;
            }

            // If DevWidget is present but we don't yet have a manifest, prefer a filesystem-derived summary
            const indexContent = this.generateIndexFromManifest();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent);
            return;
          } catch (e) {
            const indexContent = this.generateIndexFromManifest();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent);
            return;
          }
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

              // If still missing, instruct developer to compile (fail-fast, don't guess)
              if (!templateHtml) {
                templateHtml = `<div style="font-family:system-ui,Arial; padding:1rem"><h2>Missing view template</h2><p>The index view references <code>${templateRel}</code> but the template could not be found.</p><p>Run <code>npx ux3 compile</code> or <code>npm run build</code> to generate view artifacts, then refresh.</p></div>`;
              }

              const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir) });
              /* index: renderedTemplate preview removed */

              // Resolve layout: prefer view.layout name (if provided in index.yaml), then project layout files, then default
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

              // If manifest provides cdn, inject
              const cdnList = (this.manifest?.config && (this.manifest.config as any).cdn) || [];
              if (cdnList && Array.isArray(cdnList) && cdnList.length) {
                const scripts = cdnList.map((u: string) => `<script src="${u}"></script>`).join('\n');
                layoutHtml = layoutHtml.replace(/<script[^>]*ux-repeat="site\.cdn"[^>]*src="[^"]*"[^>]*>\s*<\/script>/g, scripts);
                if (layoutHtml.includes('ux-repeat="site.cdn"') || layoutHtml.includes("ux-repeat='site.cdn'")) {
                  layoutHtml = layoutHtml.replace('</head>', scripts + '\n</head>');
                }
              }

              /* defaultIndex: layout preview removed */
              /* defaultIndex: layoutHtml preview removed */
              /* defaultIndex: layoutHtml full removed */
              // Also consider ux3.yaml at project root or ux/ux3.yaml for cdn entries
              try {
                let ux3Path: string | null = null;
                const rootUx3 = path.join(this.projectDir, 'ux3.yaml');
                const legacyUx3 = path.join(this.projectDir, 'ux', 'ux3.yaml');
                if (fsExtra.existsSync(rootUx3)) ux3Path = rootUx3;
                else if (fsExtra.existsSync(legacyUx3)) ux3Path = legacyUx3;

                if (ux3Path) {
                  const ux3Content = await fsp.readFile(ux3Path, 'utf-8');
                  let uxConfig: any = {};
                  try { uxConfig = YAML.parse(ux3Content); } catch {}
                  if (uxConfig.cdn && Array.isArray(uxConfig.cdn) && uxConfig.cdn.length) {
                    const scripts = uxConfig.cdn.map((u: string) => `<script src="${u}"></script>`).join('\n');
                    layoutHtml = layoutHtml.replace(/<script[^>]*ux-repeat="site\.cdn"[^>]*src="[^\"]*"[^>]*>\s*<\/script>/g, scripts);
                    if (layoutHtml.includes('ux-repeat="site.cdn"') || layoutHtml.includes("ux-repeat='site.cdn'")) {
                      layoutHtml = layoutHtml.replace('</head>', scripts + '\n</head>');
                    }
                  }
                }
              } catch (e) {
                // ignore
              }
              // Prefer title from manifest.config.title then from i18n index.json then fallback
              let title = (this.manifest?.config && (this.manifest.config as any).title) || path.basename(this.projectDir);
              try {
                const i18nIndex = path.join(this.projectDir, 'ux', 'i18n', 'en', 'index.json');
                if (fsExtra.existsSync(i18nIndex)) {
                  const content = await fsp.readFile(i18nIndex, 'utf-8');
                  const i18nData = JSON.parse(content);
                  if (i18nData && i18nData.site && i18nData.site.title) {
                    title = i18nData.site.title;
                  }
                }
              } catch {}

              let layoutToRender = layoutHtml || '';
              let html = '';
              if (/{{\s*>\s*layout\s*}}/.test(layoutToRender)) {
                layoutToRender = layoutToRender.replace(/{{\s*>\s*layout\s*}}/g, renderedTemplate);
                html = renderTemplate(layoutToRender, { site: { title } });
              } else {
                html = renderTemplate(layoutToRender, { site: { template: renderedTemplate, title } });
              }
              /* defaultIndex: final html preview removed */
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(html);
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
                const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir) });

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

                // If manifest provides cdn, inject
                const cdnList = (this.manifest?.config && (this.manifest.config as any).cdn) || [];
                if (cdnList && Array.isArray(cdnList) && cdnList.length) {
                  const scripts = cdnList.map((u: string) => `<script src="${u}"></script>`).join('\n');
                  layoutHtml = layoutHtml.replace(/<script[^>]*ux-repeat="site\.cdn"[^>]*src="[^"]*"[^>]*>\s*<\/script>/g, scripts);
                  if (layoutHtml.includes('ux-repeat="site.cdn"') || layoutHtml.includes("ux-repeat='site.cdn'")) {
                    layoutHtml = layoutHtml.replace('</head>', scripts + '\n</head>');
                  }
                }

                // DEBUG: log template and renderedTemplate sizes to diagnose missing insertion
                /* index: templateHtml len removed */
                try { const tmp = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir) }); /* renderTemplate executed */ } catch (e) { /* renderTemplate failed */ }

                // Also consider ux3.yaml at project root or ux/ for cdn entries
                try {
                  let ux3Path: string | null = null;
                  const rootUx3 = path.join(this.projectDir, 'ux3.yaml');
                  const legacyUx3 = path.join(this.projectDir, 'ux', 'ux3.yaml');
                  if (fsExtra.existsSync(rootUx3)) ux3Path = rootUx3;
                  else if (fsExtra.existsSync(legacyUx3)) ux3Path = legacyUx3;

                  if (ux3Path) {
                    const ux3Content = await fsp.readFile(ux3Path, 'utf-8');
                    let uxConfig: any = {};
                    try { uxConfig = YAML.parse(ux3Content); } catch {}
                    if (uxConfig.cdn && Array.isArray(uxConfig.cdn) && uxConfig.cdn.length) {
                      const scripts = uxConfig.cdn.map((u: string) => `<script src="${u}"></script>`).join('\n');
                      layoutHtml = layoutHtml.replace(/<script[^>]*ux-repeat="site\.cdn"[^>]*src="[^"]*"[^>]*>\s*<\/script>/g, scripts);
                      if (layoutHtml.includes('ux-repeat="site.cdn"') || layoutHtml.includes("ux-repeat='site.cdn'")) {
                        layoutHtml = layoutHtml.replace('</head>', scripts + '\n</head>');
                      }
                    }
                  }
                } catch (e) {
                  // ignore
                }

                // Prefer title from manifest.config.title then from i18n index.json then fallback
                let title = (this.manifest?.config && (this.manifest.config as any).title) || path.basename(this.projectDir);
                try {
                  const i18nIndex = path.join(this.projectDir, 'ux', 'i18n', 'en', 'index.json');
                  if (fsExtra.existsSync(i18nIndex)) {
                    const content = await fsp.readFile(i18nIndex, 'utf-8');
                    const i18nData = JSON.parse(content);
                    if (i18nData && i18nData.site && i18nData.site.title) {
                      title = i18nData.site.title;
                    }
                  }
                } catch {}

                /* index: layoutPath resolved */
                let layoutToRender = layoutHtml || '';
                // Normalize layout placeholders to a canonical site.template token, then render.
                // This avoids accidental partial parsing of triple-brace syntax by the templater.
                layoutToRender = layoutToRender.replace(/\{\{\{\s*content\s*\}\}\}/g, '{{ site.template }}');
                layoutToRender = layoutToRender.replace(/\{\{\s*>\s*layout\s*\}\}/g, '{{ site.template }}');
                const html = renderTemplate(layoutToRender, { site: { template: renderedTemplate, title } });
                /* index: final html preview removed */

                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Final pass: ensure any remaining layout placeholders are replaced with the rendered template
                const finalHtml = html.replace(/\{\{\{\s*content\s*\}\}\}/g, renderedTemplate).replace(/\{\{\s*>\s*layout\s*\}\}/g, renderedTemplate).replace(/\{\{\s*site\.template\s*\}\}/g, renderedTemplate);
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

              const templateRel = view.template || '';
              let templateHtml = '';

              // Try compiled manifest template for this view first (so compiled app wrapper / bootstrapping is used when available)
              try {
                const m = String(templateRel).match(/^view\/([^\/]+)(?:\/(.*))?$/);
                const tplViewName = m ? m[1] : viewName;
                const tplStateName = m && m[2] ? m[2].replace(/\.html$/,'') : undefined;

                if (this.manifest && this.manifest.config && typeof this.manifest.config.templates === 'object') {
                  const tplMap = (this.manifest.config as any).templates || {};

                  // Try the view name derived from the template path first, then fall back to the view's own name
                  const viewTpl = tplViewName ? (tplMap[tplViewName] || {}) : {};
                  let candidate = (tplStateName && viewTpl[tplStateName]) || Object.values(viewTpl)[0];

                  if (!candidate) {
                    const currentViewTpl = tplMap[viewName] || {};
                    candidate = (tplStateName && currentViewTpl[tplStateName]) || Object.values(currentViewTpl)[0];
                    if (candidate) { /* resolved template from manifest for current view/state */ }
                  } else {
                    /* resolved template from manifest */
                    templateHtml = String(candidate);
                  }
                }

                if (!templateHtml) {
                  const templatePath = path.join(this.projectDir, 'ux', templateRel.replace(/^\//, ''));
                  try { templateHtml = await fsp.readFile(templatePath, 'utf-8'); } catch (e) { /* ignore */ }
                }
              } catch (err) {
                /* manifest/template resolution failed */
              }

              // Resolve layout: prefer view.layout name (if provided in view YAML), then project layout files, then default
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

              // Render the view template
              const renderedTemplate = renderTemplate(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir) });

              // Inject cdn from ux3.yaml if present in manifest.config
              const cdnList = (this.manifest?.config && (this.manifest.config as any).cdn) || [];
              if (cdnList && Array.isArray(cdnList) && cdnList.length) {
                const scripts = cdnList.map((u: string) => `<script src="${u}"></script>`).join('\n');
                layoutHtml = layoutHtml.replace(/<script[^>]*ux-repeat="site\.cdn"[^>]*src="[^"]*"[^>]*>\s*<\/script>/g, scripts);                if (layoutHtml.includes('ux-repeat="site.cdn"') || layoutHtml.includes("ux-repeat='site.cdn'")) {
                  layoutHtml = layoutHtml.replace('</head>', scripts + '\n</head>');
                }              }

              const title = (this.manifest?.config && (this.manifest.config as any).title) || path.basename(this.projectDir);

              let layoutToRender = layoutHtml || '';
              // Normalize triple-brace and partial placeholders to canonical `{{ site.template }}` and render.
              layoutToRender = layoutToRender.replace(/\{\{\{\s*content\s*\}\}\}/g, '{{ site.template }}');
              layoutToRender = layoutToRender.replace(/\{\{\s*>\s*layout\s*\}\}/g, '{{ site.template }}');
              const html = renderTemplate(layoutToRender, { site: { template: renderedTemplate, title } });

              /* route: final html preview removed */

              res.writeHead(200, { 'Content-Type': 'text/html' });
              // Final pass: ensure any remaining layout placeholders are replaced with the rendered template
              const finalHtml = html.replace(/\{\{\{\s*content\s*\}\}\}/g, renderedTemplate).replace(/\{\{\s*>\s*layout\s*\}\}/g, renderedTemplate).replace(/\{\{\s*site\.template\s*\}\}/g, renderedTemplate);
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

  // Handle triple-mustache {{{ key }}} first for raw insertion (e.g., unescaped HTML)
  template = template.replace(/\{\{\{\s*([^\}]+?)\s*\}\}\}/g, (_, key) => {
    const val = key.split('.').reduce((acc: any, part: string) => (acc && acc[part] !== undefined ? acc[part] : undefined), context);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });

  // Then handle double-mustache with escaping semantics (basic: return string value)
  return template.replace(/\{\{\s*([^\}]+?)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((acc: any, part: string) => (acc && acc[part] !== undefined ? acc[part] : undefined), context);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}

