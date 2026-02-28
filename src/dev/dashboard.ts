import * as path from 'path';
import fsExtra from 'fs-extra';
import { renderTpl } from './asset-processor';

/**
 * Generates the Dev Dashboard HTML by wrapping the dashboard "view" 
 * in the project's own layout/chrome.
 */
export async function renderDashboard(projectDir: string, manifest: any, site: any) {
  const projectName = path.basename(projectDir);
  
  // Dashboard "View" Content
  const dashboardContent = `
    <div class="p-8">
      <h1 class="text-2xl font-bold mb-4">UX3 Dev Server — ${projectName}</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 class="text-lg font-semibold mb-3">Project Status</h2>
          <div class="space-y-2 text-sm">
            <div><strong>Project:</strong> ${projectName}</div>
            <div><strong>Path:</strong> ${projectDir}</div>
            <div><strong>Build Time:</strong> ${new Date(manifest?.stats?.buildTime || Date.now()).toLocaleString()}</div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 class="text-lg font-semibold mb-3">Manifest Summary</h2>
          <pre class="text-xs bg-slate-50 p-3 rounded">${JSON.stringify({
            views: Object.keys(manifest?.config?.views || {}).length,
            services: Object.keys(manifest?.config?.services || {}).length,
            routes: Object.keys(manifest?.config?.routes || {}).length
          }, null, 2)}</pre>
        </div>
      </div>

      <div class="mt-8">
        <h2 class="text-xl font-bold mb-4">Available Views</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${Object.keys(manifest?.config?.views || {}).map(v => `
            <a href="/view/${v}" class="block p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-center font-medium transition-colors border border-blue-200">
              ${v}
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Look for project layout or fallback to framework layout
  const chromeWrapperPath = path.join(projectDir, 'ux', 'layout', 'chrome', 'wrapper.html');
  const projectFallbackPath = path.join(projectDir, 'ux', 'layout', '_.html');
  const frameworkDefaultLayout = path.join(process.cwd(), 'src', 'ui', 'layouts', '_.html');

  let layoutTpl = '';
  if (fsExtra.existsSync(chromeWrapperPath)) {
    layoutTpl = fsExtra.readFileSync(chromeWrapperPath, 'utf-8');
  } else if (fsExtra.existsSync(projectFallbackPath)) {
    layoutTpl = fsExtra.readFileSync(projectFallbackPath, 'utf-8');
  } else if (fsExtra.existsSync(frameworkDefaultLayout)) {
    layoutTpl = fsExtra.readFileSync(frameworkDefaultLayout, 'utf-8');
  }

  // Inject dashboard content into layout
  let finalHtml = layoutTpl || dashboardContent;
  if (layoutTpl) {
    // Replace content placeholder
    finalHtml = finalHtml.replace(/\{\{\s*>\s*layout\s*\}\}/g, dashboardContent);
    finalHtml = finalHtml.replace(/\{\{\s*site\.template\s*\}\}/g, dashboardContent);
    // Render placeholders
    finalHtml = renderTpl(finalHtml, { site, i18n: manifest?.config?.i18n || {} });
  }

  return finalHtml;
}
