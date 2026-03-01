#!/usr/bin/env node
import { PluginLoader } from '../build/plugin-loader';

/**
 * Simple CLI script to list or test project plugins.  Usage:
 *   node src/cli/plugin-loader.js list [<dir>]
 *   node src/cli/plugin-loader.js validate [<dir>]
 */

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';
  const dir = args[1] || './plugins';
  const loader = new PluginLoader();
  try {
    const plugins = await loader.loadProjectPlugins(dir);
    if (cmd === 'list') {
      console.log(`found ${plugins.length} plugin(s)`);
      plugins.forEach(p => console.log(`- ${p.name}@${p.version}`));
    } else if (cmd === 'validate') {
      // simple validation: ensure each has install function or services/hooks
      let ok = true;
      plugins.forEach(p => {
        if (!p.name || !p.version) {
          console.error('invalid plugin', p);
          ok = false;
        }
      });
      process.exit(ok ? 0 : 1);
    }
  } catch (err) {
    console.error('error loading plugins', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
