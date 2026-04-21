// @vitest-environment node

import * as fs from 'fs-extra';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHintsCommand } from '../../src/cli/commands/hints.ts';

async function runHints(args: string[], cwd: string): Promise<number> {
  const originalCwd = process.cwd;
  const originalExit = process.exit;
  let code = 0;

  (process as any).cwd = () => cwd;
  (process as any).exit = (c?: number) => {
    code = c ?? 0;
    throw new Error(`exit:${c}`);
  };

  try {
    const hintsCommand = createHintsCommand();
    await hintsCommand.parseAsync(['', '', ...args]);
  } catch (e: any) {
    if (!String(e?.message).startsWith('exit:')) throw e;
  } finally {
    (process as any).cwd = originalCwd;
    (process as any).exit = originalExit;
  }

  return code;
}

describe('ux3 hints', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'hints');
  const project = path.join(tmpRoot, 'app');

  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(project);
    await fs.writeJson(path.join(project, 'package.json'), { name: 'hints-test', version: '0.0.0' });
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it('copies scaffold markdown hints into ux folders', async () => {
    const code = await runHints(['--project', project], project);
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
    const code = await runHints(['--project', project, '--dry-run'], project);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'SPEC.md'))).toBe(false);
  });

  it('does not overwrite without --force', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'sentinel', 'utf8');

    const code = await runHints(['--project', project], project);
    expect(code).toBe(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'utf8')).toBe('sentinel');
  });

  it('overwrites existing hint files with --force', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'sentinel', 'utf8');

    const code = await runHints(['--project', project, '--force'], project);
    expect(code).toBe(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'SPEC.md'), 'utf8')).not.toBe('sentinel');
  });
});
