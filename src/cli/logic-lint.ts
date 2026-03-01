import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

// reuse the same export parser from view-compiler
export function parseExports(file: string): Set<string> {
  const text = fs.readFileSync(file, 'utf-8');
  const names = new Set<string>();
  const re1 = /export\s+(?:function|const|let|var|class)\s+([A-Za-z0-9_]+)/g;
  let m1: RegExpExecArray | null;
  while ((m1 = re1.exec(text))) {
    names.add(m1[1]);
  }
  const re2 = /export\s*\{([^}]+)\}/g;
  let m2: RegExpExecArray | null;
  while ((m2 = re2.exec(text))) {
    m2[1].split(',').forEach((part) => {
      let n = part.trim();
      if (n.includes(' as ')) {
        // take the alias name
        n = n.split(' as ')[1].trim();
      }
      if (n) names.add(n);
    });
  }
  return names;
}

/**
 * Gather all referenced logic names from view YAML files.
 * Returns a Set of names used in guards/actions/entry/exit/invoke.src
 */
export function gatherReferencedNames(viewsDir: string): Set<string> {
  const refs = new Set<string>();

  if (!fs.existsSync(viewsDir)) {
    return refs;
  }

  const files = fs.readdirSync(viewsDir).filter((f) => f.endsWith('.yaml'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(viewsDir, file), 'utf-8');
    let parsed: any;
    try {
      parsed = YAML.parse(content) || {};
    } catch {
      continue;
    }

    const scanObj = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (['guard', 'entry', 'exit', 'src'].includes(k) && typeof v === 'string') {
          refs.add(v);
        }
        if (k === 'actions' && Array.isArray(v)) {
          v.forEach((x) => typeof x === 'string' && refs.add(x));
        }
        // recurse
        if (typeof v === 'object') scanObj(v);
      }
    };

    scanObj(parsed);
  }

  return refs;
}

/**
 * Lint logic modules for unused exports.
 * Logs issues and returns count of unused symbols.
 */
export function lintLogicModules(options: {
  logicDir: string;
  viewsDir: string;
}): number {
  const { logicDir, viewsDir } = options;
  const refNames = gatherReferencedNames(viewsDir);
  let unusedCount = 0;

  if (!fs.existsSync(logicDir)) {
    console.warn(`[ux3] logic directory not found: ${logicDir}`);
    return 0;
  }

  const files = fs.readdirSync(logicDir).filter((f) => f.endsWith('.ts'));
  for (const file of files) {
    const full = path.join(logicDir, file);
    const exports = parseExports(full);
    exports.forEach((name) => {
      if (!refNames.has(name)) {
        console.log(`⚠️  unused export in ${file}: ${name}`);
        unusedCount += 1;
      }
    });
  }

  if (unusedCount === 0) {
    console.log('✅ No unused logic exports detected');
  }
  return unusedCount;
}
