// @vitest-environment node

import * as fs from 'fs-extra';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHintsCommand } from '../../src/cli/commands/hints.ts';
import { createSyncCommand, syncView, syncI18n, syncStyle } from '../../src/cli/commands/sync.ts';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function runHints(args: string[]): Promise<number> {
  const originalExit = process.exit;
  let code = 0;
  (process as any).exit = (c?: number) => {
    code = c ?? 0;
    throw new Error(`exit:${c}`);
  };
  try {
    const cmd = createHintsCommand();
    await cmd.parseAsync(['', '', ...args]);
  } catch (e: any) {
    if (!String(e?.message).startsWith('exit:')) throw e;
  } finally {
    (process as any).exit = originalExit;
  }
  return code;
}

// ---------------------------------------------------------------------------
// ux3 sync hints (renamed from ux3 hints)
// ---------------------------------------------------------------------------

describe('ux3 sync hints', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'sync-hints');
  const project = path.join(tmpRoot, 'app');

  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(project);
    await fs.writeJson(path.join(project, 'package.json'), { name: 'sync-hints-test', version: '0.0.0' });
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it('copies scaffold markdown hints into ux folders', async () => {
    const code = await runHints(['--project', project]);
    expect(code).toBe(0);

    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'SPEC.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'route', 'SPEC.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'i18n', 'SPEC.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'validate', 'SPEC.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'style', 'SPEC.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'service', 'SPEC.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'src', 'services', 'SPEC.md'))).toBe(false);
  });

  it('dry-run does not write files', async () => {
    const code = await runHints(['--project', project, '--dry-run']);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'SPEC.md'))).toBe(false);
  });

  it('does not overwrite without --force', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'sentinel', 'utf8');

    const code = await runHints(['--project', project]);
    expect(code).toBe(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'utf8')).toBe('sentinel');
  });

  it('overwrites existing hint files with --force', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'sentinel', 'utf8');

    const code = await runHints(['--project', project, '--force']);
    expect(code).toBe(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'utf8')).not.toBe('sentinel');
  });
});

// ---------------------------------------------------------------------------
// ux3 sync — command structure
// ---------------------------------------------------------------------------

describe('ux3 sync — command structure', () => {
  it('exposes hints, view, i18n, style, all subcommands', () => {
    const sync = createSyncCommand();
    const names = sync.commands.map(c => c.name());
    expect(names).toContain('hints');
    expect(names).toContain('view');
    expect(names).toContain('i18n');
    expect(names).toContain('style');
    expect(names).toContain('all');
  });

  it('sync is named "sync"', () => {
    expect(createSyncCommand().name()).toBe('sync');
  });
});

// ---------------------------------------------------------------------------
// sync view
// ---------------------------------------------------------------------------

describe('sync view', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'sync-view');
  const project = path.join(tmpRoot, 'app');

  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeJson(path.join(project, 'package.json'), { name: 'sync-view-test', version: '0.0.0' });
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it('creates stub HTML for missing state templates', async () => {
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login.yaml'),
      'initial: idle\nstates:\n  idle:\n    template: view/login/idle.html\n  error:\n    template: view/login/error.html\n',
      'utf-8',
    );

    const written = await syncView(project, {});
    expect(written).toHaveLength(2);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'login', 'idle.html'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'login', 'error.html'))).toBe(true);
    const content = await fs.readFile(path.join(project, 'ux', 'view', 'login', 'idle.html'), 'utf-8');
    expect(content).toContain('ux-state="login.idle"');
  });

  it('does not overwrite existing templates', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view', 'login'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'login', 'idle.html'), 'sentinel', 'utf-8');
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login.yaml'),
      'initial: idle\nstates:\n  idle:\n    template: view/login/idle.html\n',
      'utf-8',
    );

    const written = await syncView(project, {});
    expect(written).toHaveLength(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'login', 'idle.html'), 'utf-8')).toBe('sentinel');
  });

  it('dry-run does not write files', async () => {
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login.yaml'),
      'initial: idle\nstates:\n  idle:\n    template: view/login/idle.html\n',
      'utf-8',
    );

    const written = await syncView(project, { dryRun: true });
    expect(written).toHaveLength(1);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'login', 'idle.html'))).toBe(false);
  });

  it('handles shorthand state: template-string syntax', async () => {
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'home.yaml'),
      'initial: idle\nstates:\n  idle: view/home/idle.html\n',
      'utf-8',
    );

    const written = await syncView(project, {});
    expect(written).toHaveLength(1);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'home', 'idle.html'))).toBe(true);
  });

  it('returns empty when no yaml files exist', async () => {
    const written = await syncView(project, {});
    expect(written).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sync i18n
// ---------------------------------------------------------------------------

describe('sync i18n', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'sync-i18n');
  const project = path.join(tmpRoot, 'app');

  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(path.join(project, 'ux', 'view', 'login'));
    await fs.writeJson(path.join(project, 'package.json'), { name: 'sync-i18n-test', version: '0.0.0' });
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it('adds missing keys to existing locale files without clobbering', async () => {
    const enDir = path.join(project, 'ux', 'i18n', 'en');
    await fs.ensureDir(enDir);
    await fs.writeJson(path.join(enDir, 'login.json'), { login: { idle: { label: 'Sign in' } } });

    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div>{{i18n.login.idle.label}} {{i18n.login.idle.help}}</div>',
      'utf-8',
    );

    const written = await syncI18n(project, {});
    expect(written).toHaveLength(1);

    const updated = await fs.readJson(path.join(enDir, 'login.json'));
    expect(updated.login.idle.label).toBe('Sign in'); // existing preserved
    expect(updated.login.idle.help).toBeTruthy();      // new key added
  });

  it('creates en.json when no locale files exist', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'i18n'));
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div>{{i18n.login.title}}</div>',
      'utf-8',
    );

    const written = await syncI18n(project, {});
    expect(written).toHaveLength(1);
    const enFile = path.join(project, 'ux', 'i18n', 'en.json');
    expect(await fs.pathExists(enFile)).toBe(true);
    const data = await fs.readJson(enFile);
    expect(data.login.title).toBeTruthy();
  });

  it('dry-run does not write files', async () => {
    const enDir = path.join(project, 'ux', 'i18n', 'en');
    await fs.ensureDir(enDir);
    await fs.writeJson(path.join(enDir, 'app.json'), {});
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div>{{i18n.nav.home}}</div>',
      'utf-8',
    );

    const written = await syncI18n(project, { dryRun: true });
    expect(written).toHaveLength(1);
    expect(await fs.readJson(path.join(enDir, 'app.json'))).toEqual({});
  });

  it('returns empty when no keys are referenced', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'i18n', 'en'));
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div>No i18n here</div>',
      'utf-8',
    );
    const written = await syncI18n(project, {});
    expect(written).toHaveLength(0);
  });

  it('detects $t() call-style in view YAMLs', async () => {
    const enDir = path.join(project, 'ux', 'i18n', 'en');
    await fs.ensureDir(enDir);
    await fs.writeJson(path.join(enDir, 'app.json'), {});
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login.yaml'),
      "states:\n  idle:\n    label: $t('nav.back')\n",
      'utf-8',
    );

    const written = await syncI18n(project, {});
    expect(written).toHaveLength(1);
    const updated = await fs.readJson(path.join(enDir, 'app.json'));
    expect(updated.nav.back).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// sync style
// ---------------------------------------------------------------------------

describe('sync style', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'sync-style');
  const project = path.join(tmpRoot, 'app');

  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(path.join(project, 'ux', 'view', 'login'));
    await fs.writeJson(path.join(project, 'package.json'), { name: 'sync-style-test', version: '0.0.0' });
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it('creates stub YAML for undefined ux-style widgets', async () => {
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div ux-style="card"><button ux-style="primary-btn">OK</button></div>',
      'utf-8',
    );

    const written = await syncStyle(project, {});
    expect(written.length).toBeGreaterThan(0);
    const cardFile = path.join(project, 'ux', 'style', 'compositions', 'card.yaml');
    expect(await fs.pathExists(cardFile)).toBe(true);
    const content = await fs.readFile(cardFile, 'utf-8');
    expect(content).toContain('card:');
    expect(content).toContain('base:');
  });

  it('does not create stubs for already-defined widgets', async () => {
    const styleDir = path.join(project, 'ux', 'style', 'primitives');
    await fs.ensureDir(styleDir);
    await fs.writeFile(path.join(styleDir, 'button.yaml'), 'button:\n  base: ""\n', 'utf-8');

    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<button ux-style="button">OK</button>',
      'utf-8',
    );

    const written = await syncStyle(project, {});
    expect(written).toHaveLength(0);
  });

  it('dry-run does not write files', async () => {
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div ux-style="hero">content</div>',
      'utf-8',
    );

    const written = await syncStyle(project, { dryRun: true });
    expect(written).toHaveLength(1);
    expect(await fs.pathExists(path.join(project, 'ux', 'style', 'compositions', 'hero.yaml'))).toBe(false);
  });

  it('returns empty when no ux-style attrs are found', async () => {
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'login', 'idle.html'),
      '<div class="p-4">no ux-style here</div>',
      'utf-8',
    );
    const written = await syncStyle(project, {});
    expect(written).toHaveLength(0);
  });
});
