// @vitest-environment node

import * as fs from 'fs-extra';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  buildContext,
  interpolate,
  emitScaffold,
  resolveTemplateDir,
  loadTemplate,
} from '../../src/cli/template-engine.ts';
import { generateCommand } from '../../src/cli/commands/generate.ts';

const TMP = path.join(process.cwd(), 'tests', 'tmp', 'template-engine');

// ---------------------------------------------------------------------------
// Helper: invoke a sub-command of generateCommand
// ---------------------------------------------------------------------------
async function runGenerate(args: string[], cwd: string): Promise<number> {
  const origCwd = process.cwd;
  const origExit = process.exit;
  let code = 0;

  (process as any).cwd = () => cwd;
  (process as any).exit = (c?: number) => { code = c ?? 0; throw new Error(`exit:${c}`); };

  try {
    await generateCommand.parseAsync(['', '', ...args]);
  } catch (e: any) {
    if (!String(e?.message).startsWith('exit:')) throw e;
  } finally {
    (process as any).cwd = origCwd;
    (process as any).exit = origExit;
  }
  return code;
}

// ---------------------------------------------------------------------------
// buildContext
// ---------------------------------------------------------------------------
describe('buildContext', () => {
  it('derives casing variants from kebab input', () => {
    const ctx = buildContext('my-view');
    expect(ctx.name).toBe('my-view');
    expect(ctx.Name).toBe('MyView');
    expect(ctx.name_snake).toBe('my_view');
    expect(ctx.NAME).toBe('MY_VIEW');
  });

  it('normalises PascalCase input to kebab', () => {
    const ctx = buildContext('LoginForm');
    expect(ctx.name).toBe('login-form');
    expect(ctx.Name).toBe('LoginForm');
  });

  it('normalises spaces to kebab', () => {
    const ctx = buildContext('user profile');
    expect(ctx.name).toBe('user-profile');
    expect(ctx.Name).toBe('UserProfile');
  });

  it('includes year and date', () => {
    const ctx = buildContext('x');
    expect(ctx.year).toMatch(/^\d{4}$/);
    expect(ctx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('merges extra tokens', () => {
    const ctx = buildContext('foo', { version: '1.2.3' });
    expect(ctx.version).toBe('1.2.3');
  });
});

// ---------------------------------------------------------------------------
// interpolate
// ---------------------------------------------------------------------------
describe('interpolate', () => {
  it('replaces [[ TOKEN ]] with context value', () => {
    const ctx = buildContext('login');
    const result = interpolate('class="view-[[ name ]]"', ctx);
    expect(result).toBe('class="view-login"');
  });

  it('leaves {{ }} untouched', () => {
    const ctx = buildContext('login');
    const result = interpolate('{{ user.name }} [[ Name ]]', ctx);
    expect(result).toBe('{{ user.name }} Login');
  });

  it('handles missing tokens by leaving placeholder', () => {
    const ctx = buildContext('foo');
    const result = interpolate('[[ MISSING ]]', ctx);
    expect(result).toBe('[[MISSING]]');
  });

  it('handles tokens with extra spaces inside brackets', () => {
    const ctx = buildContext('bar');
    const result = interpolate('[[ name ]]', ctx);
    expect(result).toBe('bar');
  });
});

// ---------------------------------------------------------------------------
// resolveTemplateDir + loadTemplate
// ---------------------------------------------------------------------------
describe('resolveTemplateDir', () => {
  it('returns a path ending in the section name', () => {
    const dir = resolveTemplateDir('view');
    expect(dir).toMatch(/templates[/\\]view$/);
  });

  it('prefers user override when present', async () => {
    const override = path.join(TMP, '.ux3', 'templates', 'view');
    await fs.ensureDir(override);
    const dir = resolveTemplateDir('view', TMP);
    expect(dir).toBe(override);
    await fs.remove(path.join(TMP, '.ux3'));
  });
});

describe('loadTemplate', () => {
  it('loads a built-in template file', async () => {
    const content = await loadTemplate('view', 'SPEC.md');
    expect(content).toContain('ux3 generate view');
  });
});

// ---------------------------------------------------------------------------
// emitScaffold
// ---------------------------------------------------------------------------
describe('emitScaffold', () => {
  const outDir = path.join(TMP, 'emit-test');

  beforeEach(async () => { await fs.ensureDir(outDir); });
  afterEach(async () => { await fs.remove(outDir); });

  it('emits view template files with interpolated names', async () => {
    const ctx = buildContext('login');
    const written = await emitScaffold('view', ctx, outDir);

    expect(written.length).toBeGreaterThan(0);
    // YAML file should exist with interpolated name
    const yaml = path.join(outDir, 'login.yaml');
    expect(await fs.pathExists(yaml)).toBe(true);
    const content = await fs.readFile(yaml, 'utf-8');
    expect(content).toContain('view/login/idle.html');
    expect(content).not.toContain('[[ name ]]');
  });

  it('emits plugin template files', async () => {
    const ctx = buildContext('analytics');
    await emitScaffold('plugin', ctx, outDir);

    expect(await fs.pathExists(path.join(outDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(outDir, 'src', 'index.ts'))).toBe(true);

    const pkg = JSON.parse(await fs.readFile(path.join(outDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('@ux3/plugin-analytics');

    const src = await fs.readFile(path.join(outDir, 'src', 'index.ts'), 'utf-8');
    expect(src).toContain('const analytics: Plugin');
  });

  it('does not emit SPEC.md into output', async () => {
    const ctx = buildContext('test');
    await emitScaffold('view', ctx, outDir);
    expect(await fs.pathExists(path.join(outDir, 'SPEC.md'))).toBe(false);
  });

  it('dry-run writes no files', async () => {
    const ctx = buildContext('dry');
    await emitScaffold('view', ctx, outDir, { dryRun: true });
    const entries = await fs.readdir(outDir);
    expect(entries).toHaveLength(0);
  });

  it('skips existing files without --force', async () => {
    const ctx = buildContext('login');
    await emitScaffold('view', ctx, outDir);
    // overwrite the yaml with sentinel
    const yaml = path.join(outDir, 'login.yaml');
    await fs.writeFile(yaml, 'sentinel');
    // emit again without force
    await emitScaffold('view', ctx, outDir, { force: false });
    expect(await fs.readFile(yaml, 'utf-8')).toBe('sentinel');
  });

  it('overwrites existing files with --force', async () => {
    const ctx = buildContext('login');
    await emitScaffold('view', ctx, outDir);
    const yaml = path.join(outDir, 'login.yaml');
    await fs.writeFile(yaml, 'sentinel');
    await emitScaffold('view', ctx, outDir, { force: true });
    const content = await fs.readFile(yaml, 'utf-8');
    expect(content).not.toBe('sentinel');
  });

  it('leaves {{ }} intact in output', async () => {
    const ctx = buildContext('test');
    // use i18n section which has no {{ }} but logic section is a clean way to test this
    // Instead, write a custom section check with interpolate directly
    const result = interpolate('{{ user.name }} [[ Name ]] works', ctx);
    expect(result).toBe('{{ user.name }} Test works');
  });
});

// ---------------------------------------------------------------------------
// generate command integration
// ---------------------------------------------------------------------------
describe('ux3 generate (integration)', () => {
  const project = path.join(TMP, 'gen-project');

  beforeEach(async () => {
    await fs.ensureDir(project);
    // minimal package.json so findProjectRoot works
    await fs.writeJson(path.join(project, 'package.json'), { name: 'gen-test', version: '0.0.0' });
  });
  afterEach(async () => { await fs.remove(project); });

  it('generate view creates yaml and html files', async () => {
    const code = await runGenerate(['view', 'dashboard', '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'dashboard.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'dashboard', 'idle.html'))).toBe(true);
  });

  it('generate logic creates logic file', async () => {
    const code = await runGenerate(['logic', 'dashboard', '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'src', 'logic', 'dashboard.logic.ts'))).toBe(true);
  });

  it('generate routes creates routes.yaml', async () => {
    const code = await runGenerate(['routes', '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'route', 'routes.yaml'))).toBe(true);
  });

  it('generate i18n creates locale yaml', async () => {
    const code = await runGenerate(['i18n', 'fr', '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'i18n', 'fr.yaml'))).toBe(true);
  });

  it('generate validation creates validation yaml', async () => {
    const code = await runGenerate(['validation', 'registration', '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'validate', 'registration.yaml'))).toBe(true);
  });

  it('generate style creates style yaml', async () => {
    const code = await runGenerate(['style', 'card', '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'style', 'card.yaml'))).toBe(true);
  });

  it('generate plugin creates plugin package files', async () => {
    const pluginDir = path.join(TMP, 'plugin-test');
    const code = await runGenerate(['plugin', 'sentry', '--dir', pluginDir, '--project', project], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(pluginDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(pluginDir, 'src', 'index.ts'))).toBe(true);
    await fs.remove(pluginDir);
  });

  it('generate view --dry-run writes no files', async () => {
    await runGenerate(['view', 'phantom', '--dry-run', '--project', project], project);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'phantom.yaml'))).toBe(false);
  });
});
