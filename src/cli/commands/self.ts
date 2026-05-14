import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import { buildContext, emitScaffold } from '../template-engine.js';
import { startDevServer } from './dev.js';

interface SelfCommandOptions {
  template: string;
  version: string;
  port: string;
  host: string;
  open: boolean;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectoryEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir);
    return entries.length === 0;
  } catch {
    return true;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

async function patchUx3Config(projectDir: string): Promise<void> {
  const ux3ConfigPath = path.join(projectDir, 'ux3.config.json');
  let config: any = { views: 'ux/widget/**/*.yaml', output: 'src/generated', plugins: ['@ux3/plugin-self'] };

  if (await pathExists(ux3ConfigPath)) {
    try {
      const raw = await fs.readFile(ux3ConfigPath, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      config = { views: 'ux/widget/**/*.yaml', output: 'src/generated', plugins: ['@ux3/plugin-self'] };
    }
  }

  if (Array.isArray(config.plugins)) {
    const hasSelfPlugin = config.plugins.some((entry: any) => {
      if (typeof entry === 'string') return entry === '@ux3/plugin-self';
      return entry?.name === '@ux3/plugin-self';
    });

    if (!hasSelfPlugin) {
      config.plugins.push('@ux3/plugin-self');
    }
  } else if (config.plugins && typeof config.plugins === 'object') {
    if (!Object.prototype.hasOwnProperty.call(config.plugins, '@ux3/plugin-self')) {
      config.plugins['@ux3/plugin-self'] = {};
    }
  } else {
    config.plugins = ['@ux3/plugin-self'];
  }

  await writeJsonFile(ux3ConfigPath, config);
}

async function patchPackageJson(projectDir: string): Promise<void> {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!await pathExists(pkgPath)) return;

  let pkg: any;
  try {
    const raw = await fs.readFile(pkgPath, 'utf-8');
    pkg = JSON.parse(raw);
  } catch {
    return;
  }

  pkg.dependencies = pkg.dependencies || {};
  if (pkg.dependencies['@ux3/plugin-self']) {
    return;
  }

  const repoRoot = path.resolve(__dirname, '../../..');
  const selfPackageDir = path.join(repoRoot, 'packages', '@ux3', 'plugin-self');
  const localPackagePath = fsSync.existsSync(selfPackageDir)
    ? path.relative(projectDir, selfPackageDir).replace(/\\/g, '/')
    : '';

  const packageSpecifier = localPackagePath
    ? `file:${localPackagePath.startsWith('.') ? localPackagePath : `./${localPackagePath}`}`
    : '^0.1.0';

  pkg.dependencies['@ux3/plugin-self'] = packageSpecifier;
  await writeJsonFile(pkgPath, pkg);
}

async function ensureSelfOnboardingFiles(projectDir: string, projectName: string): Promise<void> {
  const widgetYamlPath = path.join(projectDir, 'ux', 'widget', 'self-onboarding.yaml');
  const widgetDir = path.join(projectDir, 'ux', 'widget', 'self-onboarding');
  const routePath = path.join(projectDir, 'ux', 'route', 'routes.yaml');

  await fs.mkdir(widgetDir, { recursive: true });

  const widgetYaml = `name: self-onboarding
layout: default
initial: welcome
context:
  projectName: "${projectName}"
  template: app
  port: "1337"
  host: localhost
  ready: false
  onboarded: false
  onboardingStep: welcome
states:
  welcome:
    template: widget/self-onboarding/welcome.html
    on:
      START:
        target: details
  details:
    template: widget/self-onboarding/details.html
    on:
      NEXT:
        target: review
  review:
    template: widget/self-onboarding/review.html
    on:
      CONFIRM:
        target: complete
      EDIT:
        target: details
  complete:
    template: widget/self-onboarding/complete.html
    on:
      RESTART:
        target: welcome
`;

  const welcomeHtml = `<div class="view-self-onboarding">
  <h1>Welcome to UX3 Self</h1>
  <p>Use this wizard to configure a self-hosted development shell for UX3.</p>
  <button ux-event="START">Begin onboarding</button>
</div>
`;

  const detailsHtml = `<div class="view-self-onboarding">
  <h2>Project details</h2>
  <form ux-event="submit:NEXT" ux-prevent-default="true">
    <label>
      Project name
      <input name="projectName" data-bind="projectName" type="text" required />
    </label>
    <label>
      Template
      <input name="template" data-bind="template" type="text" required />
    </label>
    <label>
      Host
      <input name="host" data-bind="host" type="text" required />
    </label>
    <label>
      Port
      <input name="port" data-bind="port" type="number" required />
    </label>
    <div class="actions">
      <button type="submit">Review configuration</button>
    </div>
  </form>
</div>
`;

  const reviewHtml = `<div class="view-self-onboarding">
  <h2>Review configuration</h2>
  <dl>
    <dt>Project name</dt><dd><span data-bind="projectName"></span></dd>
    <dt>Template</dt><dd><span data-bind="template"></span></dd>
    <dt>Host</dt><dd><span data-bind="host"></span></dd>
    <dt>Port</dt><dd><span data-bind="port"></span></dd>
  </dl>
  <div class="actions">
    <button ux-event="click:EDIT">Edit details</button>
    <button ux-event="click:CONFIRM" ux-event-value='{ "ready": true, "onboarded": true }'>Confirm and finish</button>
  </div>
</div>
`;

  const completeHtml = `<div class="view-self-onboarding">
  <h2>All set!</h2>
  <p>Your self-hosted UX3 app has been configured.</p>
  <p>Open <a href="/self">this onboarding page</a> again anytime.</p>
  <button ux-event="RESTART">Restart onboarding</button>
</div>
`;

  if (!await pathExists(widgetYamlPath)) {
    await fs.writeFile(widgetYamlPath, widgetYaml, 'utf-8');
  }
  await fs.writeFile(path.join(widgetDir, 'welcome.html'), welcomeHtml, 'utf-8');
  await fs.writeFile(path.join(widgetDir, 'details.html'), detailsHtml, 'utf-8');
  await fs.writeFile(path.join(widgetDir, 'review.html'), reviewHtml, 'utf-8');
  await fs.writeFile(path.join(widgetDir, 'complete.html'), completeHtml, 'utf-8');

  if (await pathExists(routePath)) {
    const routes = await fs.readFile(routePath, 'utf-8');
    if (!routes.includes('path: /self')) {
      let appended = routes.trimEnd();
      if (/routes:\s*\[\s*\]/.test(appended)) {
        appended = appended.replace(/routes:\s*\[\s*\]/, 'routes:');
      }
      appended = `${appended}\n  - path: /self\n    view: self-onboarding\n    title: Self Onboarding\n`;
      await fs.writeFile(routePath, appended, 'utf-8');
    }
  } else {
    const routesYaml = `routes:\n  - path: /\n    view: hello\n    title: Home\n  - path: /self\n    view: self-onboarding\n    title: Self Onboarding\n`;
    await fs.mkdir(path.dirname(routePath), { recursive: true });
    await fs.writeFile(routePath, routesYaml, 'utf-8');
  }
}

async function ensureProjectScaffold(
  projectDir: string,
  template: string,
  version: string
): Promise<{ name: string }> {
  const projectName = path.basename(projectDir) || 'ux3-self';
  const ctx = buildContext(projectName, { version });
  const pkgPath = path.join(projectDir, 'package.json');
  const ux3ConfigPath = path.join(projectDir, 'ux3.config.json');
  const uxDirPath = path.join(projectDir, 'ux');

  const needsPackage = !(await pathExists(pkgPath));
  const needsUx3Config = !(await pathExists(ux3ConfigPath));
  const needsUxDir = !(await pathExists(uxDirPath));
  const directoryEmpty = await isDirectoryEmpty(projectDir);

  if (directoryEmpty || needsPackage || needsUx3Config || needsUxDir) {
    console.log('🧩 No complete UX3 project detected. Bootstrapping self-managed scaffold...');
    if (!await pathExists(projectDir)) {
      await fs.mkdir(projectDir, { recursive: true });
    }

    if (needsPackage || needsUx3Config) {
      try {
        await emitScaffold('project', ctx, projectDir, { force: false });
      } catch (error) {
        console.warn('⚠️ Could not emit project scaffold:', error instanceof Error ? error.message : String(error));
      }
    }

    if (needsUxDir) {
      try {
        await emitScaffold(template, ctx, projectDir, { force: false });
      } catch (error) {
        console.warn('⚠️ Could not emit app scaffold:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const dir of ['ux/style', 'ux/validation', 'ux/i18n', 'ux/token', 'public']) {
      await fs.mkdir(path.join(projectDir, dir), { recursive: true });
    }

    console.log('✅ Self-managed scaffold created or completed.');
  }

  await patchUx3Config(projectDir);
  await patchPackageJson(projectDir);
  await ensureSelfOnboardingFiles(projectDir, projectName);

  return { name: ctx.name };
}

async function writeEnvFile(projectDir: string, values: Record<string, string>): Promise<void> {
  const envPath = path.join(projectDir, '.env');
  let existing = '';
  if (await pathExists(envPath)) {
    existing = await fs.readFile(envPath, 'utf-8');
  }

  const lines = existing
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith('#'));

  const existingMap = new Map<string, string>();
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (!key || rest.length === 0) continue;
    existingMap.set(key.trim(), rest.join('=').trim());
  }

  for (const [key, value] of Object.entries(values)) {
    existingMap.set(key, value);
  }

  const outputLines: string[] = [
    '# UX3 Self runtime configuration',
    ...Array.from(existingMap.entries()).map(([key, value]) => `${key}=${value}`),
  ];

  await fs.writeFile(envPath, `${outputLines.join('\n')}\n`, 'utf-8');
}

export const selfCommand = new Command()
  .name('self')
  .description('Start a self-configuring UX3 app with onboarding and MCP enabled')
  .argument('[project]', 'project directory')
  .option('--template <template>', 'starter template name', 'app')
  .option('--version <version>', 'semantic version', '0.0.0')
  .option('--port <port>', 'port to run on', '1337')
  .option('--host <host>', 'host to bind to', 'localhost')
  .option('--open', 'open browser on startup', false)
  .action(async (project: string | undefined, options: SelfCommandOptions) => {
    const projectDir = project ? path.resolve(project) : process.cwd();
    const { name } = await ensureProjectScaffold(projectDir, options.template, options.version);

    await writeEnvFile(projectDir, {
      UX3_SELF: '1',
      UX3_MCP: '1',
      UX3_PROJECT_NAME: name,
      UX3_PORT: options.port,
      UX3_HOST: options.host,
      UX3_OPEN: options.open ? '1' : '0',
    });

    console.log(`📦 Starting self-managed UX3 app in ${projectDir}`);
    console.log(`🔌 MCP support is enforced and always enabled.`);
    await startDevServer(projectDir, {
      port: options.port,
      host: options.host,
      open: options.open,
      mcp: true,
    });
  });
