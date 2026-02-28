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

              // If still missing, instruct developer to compile (fail-fast, don't guess)
              if (!templateHtml) {
                templateHtml = `<div style="font-family:system-ui,Arial; padding:1rem"><h2>Missing view template</h2><p>The index view references <code>${templateRel}</code> but the template could not be found.</p><p>Run <code>npx ux3 compile</code> or <code>npm run build</code> to generate view artifacts, then refresh.</p></div>`;
              }
              // Final fallback to project-specific index view logic
              const renderedTemplate = renderTpl(templateHtml, { manifest: this.manifest ?? {}, projectName: path.basename(this.projectDir), i18n, site });

              const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, i18n, site, renderTpl);

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

              const finalHtml = await resolveAndRenderLayout(this.projectDir, view, renderedTemplate, i18n, site, renderTemplate);

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
  /* removed unused generateIndexFromManifest */

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

