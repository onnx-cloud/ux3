import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';

export const createCommand = new Command()
  .name('create')
  .description('Create a new UX3 project')
  .argument('<name>', 'project name')
  .option('--template <template>', 'starter template (spa, blog, admin)', 'spa')
  .option('--version 0.0.0', 'semantic version', '0.0.0')
  .action(async (name, options) => {
    console.log(`🎨 Creating UX3 project: ${name}`);
    console.log(`📋 Template: ${options.template}`);

    const projectDir = path.resolve(process.cwd(), name);

    // prevent accidental overwrite
    if (await fs.stat(projectDir).catch(() => null)) {
      const existingPkg = path.join(projectDir, 'package.json');
      if (await fs.stat(existingPkg).catch(() => null)) {
        console.error(
          `❗ Project directory already contains a package.json, aborting to avoid overwrite.`
        );
        process.exit(1);
      }
    }

    // Create directory structure
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'public'), { recursive: true });

    // TODO: if package.json exists, abort to prevent overwriting

    // Create package.json
    const packageJson = {
      name,
      version: options.version || '0.0.0',
      type: 'module',
      scripts: {
        dev: 'ux3 dev',
        build: 'ux3 build',
        preview: 'ux3 preview',
        check: 'ux3 check',
      },
      dependencies: {
        '@ux3/core': '^0.1.0',
        '@ux3/stdlib': '^0.1.0',
        '@ux3/router': '^0.1.0',
        '@ux3/forms': '^0.1.0',
        '@ux3/store': '^0.1.0'
      },
      devDependencies: {
        '@ux3/cli': '^0.1.0',
        typescript: '^5.3.3',
      },
    };

    const packagePath = path.join(projectDir, 'package.json');
    if (!await fs.stat(packagePath).catch(() => null)) {
      await fs.writeFile(
        packagePath,
        JSON.stringify(packageJson, null, 2)
      );
    }

    // Create standalone tsconfig.json
    const tsconfig = {
      compilerOptions: {
        rootDir: 'src',
        outDir: 'dist',
      },
    };

    // don't overwrite existing configuration files
    const tsconfigPath = path.join(projectDir, 'tsconfig.json');
    if (!await fs.stat(tsconfigPath).catch(() => null)) {
      await fs.writeFile(
        tsconfigPath,
        JSON.stringify(tsconfig, null, 2)
      );
    }

    // create a minimal application entrypoint that uses the built-in
    // bootstrap helper.  future versions of the CLI will generate this file
    // automatically; for now it's safe for users to overwrite if they wish.
    const entryPath = path.join(projectDir, 'src', 'index.ts');
    if (!await fs.stat(entryPath).catch(() => null)) {
      const entryContents = `// Minimal bootstrap entry – not required for the framework to
// operate and safe to delete in a code‑free project.  Advanced apps
// can customise or extend this file as needed; see \`@ux3/ui/bootstrap\`.

import createBootstrap from '@ux3/ui/bootstrap';
import { config } from './generated/config.js';

// default initializer exposed for hydration scripts
export const initApp = createBootstrap(config);
export const hydrate = initApp;
`
      await fs.writeFile(entryPath, entryContents);
    }

    console.log(`✅ Project created at ${projectDir}`);
    console.log(`\n📖 Next steps:\n`);
    console.log(`  cd ${name}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);
  });
