import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigGenerator } from '../../build/config-generator.js';
import { TypeGenerator } from '../../build/type-generator.js';
import { ServiceResolver } from '../../build/service-resolver.js';
import { Validator } from '../../build/validator.js';
import { ManifestGenerator } from '../../build/manifest-generator.js';
import { BuildWatcher } from '../../build/watch.js';
import { Bundler } from '../../build/bundler.js';
import { ViewCompiler } from '../../build/view-compiler.js';
import { DevServer } from '../../dev/dev-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');

interface DevCommandOptions {
  port: string;
  host: string;
  open: boolean;
}

interface JsonSchema {
  [key: string]: unknown;
}

// Load schemas
function loadSchemas() {
  const schemasDir = path.join(rootDir, 'schema');
  const schemas: Record<string, JsonSchema> = {};

  const schemaFiles = ['routes', 'services', 'i18n', 'style', 'tokens', 'validate', 'view', 'content'];
  for (const file of schemaFiles) {
    const schemaPath = path.join(schemasDir, `${file}.schema.json`);
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      schemas[file] = JSON.parse(content) as JsonSchema;
    }
  }

  return schemas;
}

export const devCommand = new Command()
  .name('dev')
  .description('Start development server with hot reload')
  .argument('[project]', 'project directory')
  .option('--port <port>', 'port to run on', '1337')
  .option('--host <host>', 'host to bind to', 'localhost')
  .option('--open', 'open browser on startup', false)
  .action(async (project: string | undefined, options: DevCommandOptions) => {
    try {
      const projectDir = project ? path.resolve(project) : process.cwd();
      const generatedDir = path.join(projectDir, 'generated');
      const port = parseInt(options.port, 10);

      // Load schemas
      const schemas = loadSchemas();

      // Build function
      const performBuild = async () => {
        const startTime = Date.now();
        
        try {
          const configGenerator = new ConfigGenerator({
            configDir: projectDir,
            outputDir: generatedDir,
            schemas,
          });
          const config = await configGenerator.generate();
          await configGenerator.emit(config);
          const configSize = fs.statSync(path.join(generatedDir, 'config.ts')).size;

          const typeGenerator = new TypeGenerator({
            outputDir: generatedDir,
          });
          const types = await typeGenerator.generate(config, projectDir);
          const typesPath = path.join(generatedDir, 'types.ts');
          fs.writeFileSync(typesPath, types, 'utf-8');
          const typesSize = fs.statSync(typesPath).size;

          const serviceResolver = new ServiceResolver({
            projectDir,
            outputDir: generatedDir,
          });
          const invokes = await serviceResolver.resolve();
          await serviceResolver.emit(invokes);

          const validator = new Validator({
            projectDir,
            schemas,
          });
          const validation = await validator.validate();

          // Compile views from ux/view YAML → generated/views TS
          const viewsDir = path.join(projectDir, 'ux', 'view');
          const viewsOutputDir = path.join(generatedDir, 'views');
          if (fs.existsSync(viewsDir)) {
            try {
              const viewCompiler = new ViewCompiler(viewsDir, viewsOutputDir, projectDir);
              await viewCompiler.compileAllViews();
            } catch (e) {
              console.warn(`[Dev] View compilation warning: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          const buildTime = Date.now() - startTime;

          // compute runtime info: bundle & styles may exist under dist path
          let bundleRel = '';
          const styles: string[] = [];
          let pkgVersion = '0.0.0';
          try {
            const pkgData = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8');
            const pkg = JSON.parse(pkgData) as { version?: string };
            if (pkg.version) pkgVersion = pkg.version;
          } catch {}

          // ensure dist folder exists and generate bundle on-demand
          const outputDir = path.join(projectDir, 'dist');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          try {
            const bundler = new Bundler({
              projectDir,
              generatedDir,
              outputDir,
              minify: false,
              sourcemaps: true,
            });
            const bundlePath = await bundler.bundle();
            bundleRel = path.relative(projectDir, bundlePath).replace(/\\/g, '/');
          } catch (e) {
            // bundling failed or skipped; continue gracefully
          }

          if (bundleRel) {
            // collect css files
            const files = fs.readdirSync(outputDir);
            for (const f of files) {
              if (f.endsWith('.css')) {
                styles.push(path.join(path.relative(projectDir, outputDir), f).replace(/\\/g, '/'));
              }
            }
          }

          const runtimeInfo = bundleRel ? {
            bundle: bundleRel,
            styles,
            version: pkgVersion,
            minified: false,
          } : undefined;

          const manifest = ManifestGenerator.generate(
            config,
            invokes,
            validation,
            projectDir,
            configSize,
            typesSize,
            0,
            buildTime,
            runtimeInfo
          );
          
          // Notify dev server of new manifest
          devServer.setManifest({
            config: config,
            types: {},
            invokes: manifest.invokes,
            stats: manifest.stats,
            runtime: manifest.runtime,
          });

          // Broadcast hot reload events
          devServer.broadcast({ type: 'rebuild', timestamp: Date.now() });
          if (manifest.runtime) {
            devServer.broadcast({
              type: 'runtime-reload',
              payload: {
                bundleUrl: manifest.runtime.bundle,
                styles: manifest.runtime.styles,
                timestamp: Date.now(),
              },
            });
          }

          console.log(`✅ Rebuilt in ${buildTime}ms`);
        } catch (error) {
          console.error(
            `❌ Build error:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      };

      // Initialize dev server
      const devServer = new DevServer(projectDir, port, options.host, {
        verbose: false,
      });

      // Perform initial build
      console.log(`🔨 Building initial project...`);
      await performBuild();
      console.log(`\n✅ Initial build complete!\n`);

      // Start dev server
      await devServer.start();

      // Start watcher
      const watcher = new BuildWatcher(projectDir, {
        verbose: false,
        onBuildStart: async () => {
          process.stdout.write(`🔄 Rebuilding...`);
          await performBuild();
        },
      });

      await watcher.start();

      console.log(`📝 Watch mode enabled. Changes will rebuild automatically.\n`);

      // Handle Ctrl+C and SIGTERM (idempotent, with forced timeout)
      let stopping = false;
      const shutdown = async (signal: string) => {
        if (stopping) return;
        stopping = true;

        // Remove our handlers to avoid reentrancy
        process.removeListener('SIGINT', onSigint);
        process.removeListener('SIGTERM', onSigterm);

        console.log(`\n\n👋 Stopping dev server (${signal})...`);

        // Force exit if shutdown doesn't finish in time
        const forceTimeout = setTimeout(() => {
          console.warn('✖ Forced shutdown after timeout');
          process.exit(1);
        }, 3000);

        try {
          await watcher.stop();
        } catch (e) {
          // ignore
        }
        try {
          await devServer.stop();
        } catch (e) {
          // ignore
        }

        clearTimeout(forceTimeout);
        console.log('✋ Stopped watching');
        process.exit(0);
      };

      const onSigint = () => void shutdown('SIGINT');
      const onSigterm = () => void shutdown('SIGTERM');
      process.on('SIGINT', onSigint);
      process.on('SIGTERM', onSigterm);

    } catch (error) {
      console.error(
        `❌ Failed to start dev server:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
