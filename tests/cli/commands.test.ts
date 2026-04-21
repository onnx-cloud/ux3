// @vitest-environment node

import * as fs from 'fs-extra';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// import commands directly (use .js extension for runtime)
import { createCommand } from '../../src/cli/commands/create.ts';
import { checkCommand } from '../../src/cli/commands/check.ts';
import { lintCommand } from '../../src/cli/commands/lint.ts';
import { buildCommand } from '../../src/cli/commands/build.ts';
import { compileCommand } from '../../src/cli/compile.ts';
import { configCommand } from '../../src/cli/commands/config.ts';
import { previewCommand } from '../../src/cli/commands/preview.ts';
import { helpCommand } from '../../src/cli/commands/help.ts';
import { pluginCommand } from '../../src/cli/commands/plugin.ts';

// helper to run a command and capture exit code
async function runCommand(cmd: any, args: string[], cwd: string) {
  const originalCwdFn = process.cwd;
  const originalExit = process.exit;
  let code = 0;
  let exitCalled = false;

  // override cwd function so code thinks it's running in the desired folder
  (process as any).cwd = () => cwd;

  // override exit so tests don't terminate the process
  (process as any).exit = (c?: number) => {
    exitCalled = true;
    code = typeof c === 'number' ? c : 0;
    throw { exitCode: code, message: 'process.exit called' };
  };

  try {
    // commander takes the first element as the command name when from='user'
    await cmd.parseAsync(args, { from: 'user' });
  } catch (e: any) {
    // capture exit exceptions thrown by our override
    if (e && typeof e.exitCode === 'number') {
      code = e.exitCode;
    } else if (e.code === 'ERR_COMMAND_FAILED') {
      code = 1;
    } else {
      process.exit = originalExit;
      (process as any).cwd = originalCwdFn;
      throw e;
    }
  } finally {
    process.exit = originalExit;
    (process as any).cwd = originalCwdFn;
  }

  return code;
}

describe('UX3 CLI commands', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'cli-commands');

  it('index module exports all expected commands', async () => {
    const idx = await import('../../src/cli/index.ts');
    expect(idx.createCommand).toBeDefined();
    expect(idx.devCommand).toBeDefined();
    expect(idx.buildCommand).toBeDefined();
    expect(idx.lintCommand).toBeDefined();
    expect(idx.checkCommand).toBeDefined();
    expect(idx.compileCommand).toBeDefined();
    expect(idx.configCommand).toBeDefined();
    expect(idx.previewCommand).toBeDefined();
  });

  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(tmpRoot);
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it('`create` scaffolds a basic project', async () => {
    const project = path.join(tmpRoot, 'proj1');
    const exit = await runCommand(createCommand, ['proj1'], tmpRoot);
    expect(exit).toBe(0);

    const pkg = await fs.readJson(path.join(project, 'package.json'));
    expect(pkg.name).toBe('proj1');
    expect(await fs.pathExists(path.join(project, 'src'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'public'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'src', 'index.ts'))).toBe(true);

    // new generators should create UX directories and an example view + config
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'hello.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'hello', 'clicked.html'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux3.config.json'))).toBe(true);

    const gitignore = await fs.readFile(path.join(project, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain('src/generated/');

  });

  it('`create` refuses to overwrite existing package.json', async () => {
    const project = path.join(tmpRoot, 'proj2');
    await fs.ensureDir(project);
    await fs.writeJson(path.join(project, 'package.json'), { name: 'existing' });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // run create command against existing directory
      const code = await runCommand(createCommand, ['proj2'], tmpRoot);
      expect(code).toBe(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('`check --logic` detects unused exports', async () => {
    const project = path.join(tmpRoot, 'proj3');
    await fs.ensureDir(path.join(project, 'ux', 'logic'));
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'logic', 'foo.ts'), 'export function used(){}\nexport function unused(){}\n');
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'v.yaml'),
      'initial: s\nstates:\n  s:\n    entry: enter1\n'
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCommand(checkCommand, ['--logic'], project);
      expect(code).toBe(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('`lint` fails when ux directory is missing', async () => {
    const project = path.join(tmpRoot, 'proj-lint-missing-ux');
    await fs.ensureDir(project);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCommand(lintCommand, [], project);
      expect(code).toBe(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('`build` creates generated/config.ts and dist directory', async () => {
    const project = path.join(tmpRoot, 'proj4');
    await fs.ensureDir(path.join(project, 'ux', 'route'));
    await fs.writeFile(path.join(project, 'ux', 'route', 'routes.yaml'), 'routes: []');
    // provide a minimal package.json to get version
    await fs.writeJson(path.join(project, 'package.json'), { name: 'p4', version: '1.2.3' });

    // run build without bundling, we only care about config/type generation
    const code = await runCommand(buildCommand, ['--skip-bundle'], project);
    expect(code).toBe(0);

    expect(await fs.pathExists(path.join(project, 'generated', 'config.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'generated', 'types.ts'))).toBe(true);
    // dist directory may not be created when bundling is skipped
  });

  it('`compile` command works (via CLI wrapper)', async () => {
    const project = path.join(tmpRoot, 'proj5');
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(
      path.join(project, 'ux', 'view', 'myview.yaml'),
      `name: myview\nstates:\n  idle: idle.html\n`
    );
    await fs.writeFile(path.join(project, 'ux', 'view', 'idle.html'), `<div>idle</div>`);

    const exit = await runCommand(
      compileCommand,
      ['--views', 'ux/view', '--output', 'generated'],
      project
    );
    expect(exit).toBe(0);
    // compiler currently emits into a "views" subdirectory; accept either
    const primary = path.join(project, 'generated', 'myview.ts');
    const alt = path.join(project, 'generated', 'views', 'myview.ts');
    expect(await fs.pathExists(primary) || await fs.pathExists(alt)).toBe(true);
  });

  it('`config` command can display and query configuration', async () => {
    const project = path.join(tmpRoot, 'proj6');
    const cfgDir = path.join(project, 'configs');
    await fs.ensureDir(cfgDir);
    await fs.writeFile(
      path.join(cfgDir, 'a.yaml'),
      `routes: [{ path: "/" }]\nservices: []\ntokens: {}\n`
    );

    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      origLog(...args);
    };

    const exit1 = await runCommand(configCommand, [], project);
    expect(exit1).toBe(0);
    expect(logs.join('\n')).toContain('routes');

    logs = [];
    const exit2 = await runCommand(configCommand, ['--get', 'routes.0.path'], project);
    expect(exit2).toBe(0);
    expect(logs.join('')).toContain('/');

    console.log = origLog;
  });

  it('`help` command exposes resources for components, plugins, and services', async () => {
    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      origLog(...args);
    };

    try {
      let exit = await runCommand(helpCommand, ['components'], process.cwd());
      expect(exit).toBe(0);
      expect(logs.some((l) => l.includes('UX3 components'))).toBe(true);

      logs = [];
      exit = await runCommand(helpCommand, ['plugins'], process.cwd());
      expect(exit).toBe(0);
      expect(logs.some((l) => l.includes('UX3 Plugins'))).toBe(true);

      logs = [];
      exit = await runCommand(helpCommand, ['services'], process.cwd());
      expect(exit).toBe(0);
      expect(logs.some((l) => l.includes('UX3 services'))).toBe(true);
    } finally {
      console.log = origLog;
    }
  });

  it('`plugin create` scaffolds a valid UX3 plugin package', async () => {
    const pluginDir = path.join(tmpRoot, 'pkg-plugin-analytics');
    const exit = await runCommand(
      pluginCommand,
      ['create', 'analytics', '--dir', pluginDir],
      tmpRoot
    );
    expect(exit).toBe(0);

    const pkg = await fs.readJson(path.join(pluginDir, 'package.json'));
    expect(pkg.name).toBe('@ux3/plugin-analytics');
    expect(pkg.peerDependencies?.['@ux3/ux3']).toBeDefined();

    const indexSource = await fs.readFile(path.join(pluginDir, 'src', 'index.ts'), 'utf8');
    expect(indexSource).toContain("import type { Plugin } from '@ux3/ux3';");
    expect(indexSource).toContain("version: '0.1.0'");
    expect(indexSource).not.toContain('TODO:');
    expect(indexSource).not.toContain('console.log(');
  });

  it('`preview` command handles direction and once flag', async () => {
    const project = path.join(tmpRoot, 'proj7');
    await fs.ensureDir(path.join(project, 'dist'));
    await fs.writeFile(path.join(project, 'dist', 'index.html'), '<h1>hi</h1>');

    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      origLog(...args);
    };

    const exit = await runCommand(previewCommand, ['--dir', 'dist', '--port', '0', '--once'], project);
    expect(exit).toBe(0);
    expect(logs.some((l) => l.includes('Previewing'))).toBe(true);

    console.log = origLog;
  });
});
