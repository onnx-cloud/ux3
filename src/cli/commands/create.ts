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
    const existingProject = await fs.stat(projectDir).catch(() => null);
    if (existingProject) {
      const entries = await fs.readdir(projectDir);
      if (entries.length > 0) {
        console.error(
          `❗ Project directory already exists and is not empty, aborting to avoid overwrite.`
        );
        process.exit(1);
      }
    }

    // Create directory structure
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'public'), { recursive: true });

    // Create package.json
    const packageJson = {
      name,
      version: options.version || '0.0.0',
      type: 'module',
      scripts: {
        dev: 'ux3 dev',
        build: 'ux3 build',
        preview: 'ux3 preview',
        lint: 'ux3 lint',
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

    // Create .gitignore with sensible defaults for local env and build artifacts.
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (!await fs.stat(gitignorePath).catch(() => null)) {
      const gitignoreContent = `node_modules/
dist/
src/generated/

# Environment files
.env
.env.*
!.env.example
`;
      await fs.writeFile(gitignorePath, gitignoreContent);
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

    // scaffold basic UX3 directories and a trivial example view/template
    const uxDirs = ['ux/view', 'ux/style', 'ux/validation', 'ux/i18n', 'ux/token'];
    for (const dir of uxDirs) {
      await fs.mkdir(path.join(projectDir, dir), { recursive: true });
    }

    const exampleViewPath = path.join(projectDir, 'ux', 'view', 'hello.yaml');
    if (!await fs.stat(exampleViewPath).catch(() => null)) {
      const yamlContent = `initial: idle
states:
  idle: |
    <div>
      <h1>Welcome to ${name}</h1>
      <button ux-event="CLICK">Click me</button>
    </div>
  clicked: 'view/hello/clicked.html'
`;
      await fs.writeFile(exampleViewPath, yamlContent);

      const htmlDir = path.join(projectDir, 'ux', 'view', 'hello');
      await fs.mkdir(htmlDir, { recursive: true });
      const clickedHtml = path.join(htmlDir, 'clicked.html');
      await fs.writeFile(clickedHtml, '<div>Thanks for clicking!</div>');
    }

    // write a basic ux3.config.json so the CLI can run without extra setup
    const configPath = path.join(projectDir, 'ux3.config.json');
    if (!await fs.stat(configPath).catch(() => null)) {
      const configJson = {
        views: 'ux/view/**/*.yaml',
        output: 'src/generated',
      };
      await fs.writeFile(configPath, JSON.stringify(configJson, null, 2));
    }

    console.log(`✅ Project created at ${projectDir}`);
    console.log(`\n📖 Next steps:\n`);
    console.log(`  cd ${name}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);
  });
