import { Command } from 'commander';
import fsSync from 'fs';
import path from 'path';
import { loadConfig } from '../config-loader.js';

function findUxDir(cwd = process.cwd()): string | null {
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    const ux = path.join(dir, 'ux');
    if (fsSync.existsSync(ux) && fsSync.statSync(ux).isDirectory()) return ux;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadYaml(filePath: string): any {
  try {
    const yaml = require('js-yaml');
    return yaml.load(fsSync.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function renderTree(nodes: any[], indent = '', prefix = ''): string {
  let out = '';
  for (const [i, node] of nodes.entries()) {
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
    const line = `${indent}${prefix}${connector}${node.path || node.name || '?'}`;
    const view = node.view ? ` \u2192 ${node.view}` : '';
    out += `${line}${view}\n`;
    if (node.children && node.children.length > 0) {
      const nextIndent = `${indent}${prefix}${isLast ? '    ' : '\u2502   '}`;
      out += renderTree(node.children, nextIndent, '');
    }
  }
  return out;
}

export const routesCommand = new Command('routes')
  .description('Display routing table')
  .option('--tree', 'Visual routing tree')
  .option('--verbose', 'Full config dump')
  .action(async (options) => {
    const uxDir = findUxDir();
    if (!uxDir) {
      console.error('No ux directory found. Run from a UX3 project root.');
      process.exit(1);
    }

    const routesYaml = loadYaml(path.join(uxDir, 'route', 'routes.yaml'));
    if (!routesYaml?.routes) {
      console.log('No routes found.');
      return;
    }

    const routes = routesYaml.routes;

    if (options.verbose) {
      for (const route of routes) {
        console.log(`  ${route.path} -> ${route.view || '(none)'}`);
        if (route.title) console.log(`    title: ${route.title}`);
        if (route.icon) console.log(`    icon: ${route.icon}`);
        if (route.params) console.log(`    params: ${JSON.stringify(route.params)}`);
        console.log('');
      }
      return;
    }

    if (options.tree) {
      const tree = buildRouteTree(routes);
      console.log(renderTree(tree));
      return;
    }

    // Default: flat list
    for (const route of routes) {
      console.log(`  ${route.path} \u2192 ${route.view || '(none)'}`);
    }
  });

function buildRouteTree(flatRoutes: any[]): any[] {
  const root: any = { children: [] };
  for (const route of flatRoutes) {
    const parts = (route.path || '/').split('/').filter(Boolean);
    if (parts.length === 0) parts.push('');
    let current = root;
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
      let child = current.children?.find((c: any) => c.name === part);
      if (!child) {
        child = { name: part, path: currentPath, children: [] };
        current.children = current.children || [];
        current.children.push(child);
      }
      current = child;
    }
    if (current !== root) {
      current.view = route.view;
    }
  }
  return root.children || [];
}
