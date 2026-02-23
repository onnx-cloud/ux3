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

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create standalone tsconfig.json
    const tsconfig = {
      compilerOptions: {
        rootDir: 'src',
        outDir: 'dist',
      },
    };

    // TODO: don't overwrite existing files if they exist, to prevent data loss
    await fs.writeFile(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    console.log(`✅ Project created at ${projectDir}`);
    console.log(`\n📖 Next steps:\n`);
    console.log(`  cd ${name}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);
  });
