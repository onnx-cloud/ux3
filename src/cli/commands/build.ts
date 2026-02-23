import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigGenerator } from '../../build/config-generator.js';
import { TypeGenerator } from '../../build/type-generator.js';
import { ServiceResolver } from '../../build/service-resolver.js';
import { Validator } from '../../build/validator.js';
import { Bundler } from '../../build/bundler.js';
import { ManifestGenerator } from '../../build/manifest-generator.js';
import { BuildWatcher } from '../../build/watch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');

// Load schemas
function loadSchemas() {
  const schemasDir = path.join(rootDir, 'schema');
  const schemas: Record<string, any> = {};

  const schemaFiles = ['routes', 'services', 'i18n', 'style', 'tokens', 'validate', 'view'];
  for (const file of schemaFiles) {
    const schemaPath = path.join(schemasDir, `${file}.schema.json`);
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      schemas[file] = JSON.parse(content);
    }
  }

  return schemas;
}

export const buildCommand = new Command()
  .name('build')
  .description('Build project for production')
  .argument('[project]', 'project directory to build')
  .option('--minify', 'minify output', true)
  .option('--sourcemaps', 'generate source maps', false)
  .option('--analyze', 'analyze bundle size')
  .option('--skip-bundle', 'skip bundling step')
  .option('--watch', 'watch for changes and rebuild', false)
  .action(async (project, options) => {
    try {
      const projectDir = project ? path.resolve(project) : process.cwd();
      const generatedDir = path.join(projectDir, 'generated');
      const outputDir = path.join(projectDir, 'dist');

      // Load schemas once
      const schemas = loadSchemas();

      // Build function
      const performBuild = async () => {
        const startTime = Date.now();
        console.log(`🔨 Building UX3 project at ${projectDir}...`);

      // Step 1: Generate config
      console.log(`⚙️  Generating config...`);
      const configGenerator = new ConfigGenerator({
        configDir: projectDir,
        outputDir: generatedDir,
        schemas,
      });
      const config = await configGenerator.generate();
      await configGenerator.emit(config);
      const configSize = fs.statSync(path.join(generatedDir, 'config.ts')).size;

      // Step 2: Generate types
      console.log(`🎨 Generating types...`);
      const typeGenerator = new TypeGenerator({
        outputDir: generatedDir,
      });
      const types = await typeGenerator.generate(config, projectDir);
      const typesPath = path.join(generatedDir, 'types.ts');
      fs.writeFileSync(typesPath, types, 'utf-8');
      const typesSize = fs.statSync(typesPath).size;
      console.log(`✨ Generated types at ${typesPath}`);

      // Step 3: Resolve service invokes
      console.log(`🔧 Resolving service invokes...`);
      const serviceResolver = new ServiceResolver({
        projectDir,
        outputDir: generatedDir,
      });
      const invokes = await serviceResolver.resolve();
      await serviceResolver.emit(invokes);

      // Step 4: Validate everything
      console.log(`✔️  Validating configuration...`);
      const validator = new Validator({
        projectDir,
        schemas,
      });
      const validation = await validator.validate();

      if (!validation.valid) {
        console.error(`❌ Validation failed:`);
        for (const error of validation.errors) {
          const location = error.line ? `${error.file}:${error.line}` : error.file;
          console.error(`  ${location} — ${error.message}`);
          if (error.suggestion) {
            console.error(`    💡 ${error.suggestion}`);
          }
        }
        process.exit(1);
      }
      console.log(`✅ Configuration valid`);

      // Step 5: Bundle (optional)
      let bundleSize: number | undefined;
      if (!options.skipBundle) {
        console.log(`📦 Bundling application...`);
        const bundler = new Bundler({
          projectDir,
          generatedDir,
          outputDir,
          minify: options.minify,
          sourcemaps: options.sourcemaps,
        });
        await bundler.bundle();
        const bundlePath = path.join(outputDir, 'bundle.js');
        if (fs.existsSync(bundlePath)) {
          bundleSize = fs.statSync(bundlePath).size;
        }
      }

      // Step 6: Generate manifest
      const buildTime = Date.now() - startTime;
      const manifest = ManifestGenerator.generate(
        config,
        invokes,
        validation,
        projectDir,
        configSize,
        typesSize,
        bundleSize,
        buildTime
      );
      ManifestGenerator.emit(manifest, generatedDir);

      if (options.analyze) {
        console.log(`📊 Build analysis:`);
        console.log(`  Config size: ${Math.round(configSize / 1024)}KB`);
        console.log(`  Types size: ${Math.round(typesSize / 1024)}KB`);
        if (bundleSize) {
          console.log(`  Bundle size: ${Math.round(bundleSize / 1024)}KB`);
        }
        console.log(`  Build time: ${buildTime}ms`);
      }

      console.log(`✅ Build complete!\n`);      };

      // Perform initial build
      await performBuild();

      // Watch mode
      if (options.watch) {
        console.log(`\\n📝 Watch mode enabled. Press Ctrl+C to stop.\\n`);
        const watcher = new BuildWatcher(projectDir, {
          verbose: false,
          onBuildStart: async () => {
            console.clear();
            console.log(`🔄 Rebuilding...\\n`);
            await performBuild();
          },
        });

        await watcher.start();

        // Handle Ctrl+C
        process.on('SIGINT', async () => {
          console.log('\\n\\n👋 Stopping watcher...');
          await watcher.stop();
          process.exit(0);
        });
      }    } catch (error) {
      console.error(
        `❌ Build failed:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
