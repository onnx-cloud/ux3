// @vitest-environment node

import * as fs from 'fs-extra';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHintsCommand } from '../../src/cli/commands/hints.ts';

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

describe('ux3 sync hints (createHintsCommand)', () => {
  const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'sync-hints');
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
    const code = await runHints(['--project', project]);
    expect(code).toBe(0);

    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'HINTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'route', 'HINTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'i18n', 'HINTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'validate', 'HINTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'style', 'HINTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'ux', 'service', 'HINTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(project, 'src', 'services', 'HINTS.md'))).toBe(false);
  });

  it('dry-run does not write files', async () => {
    const code = await runHints(['--project', project, '--dry-run']);
    expect(code).toBe(0);
    expect(await fs.pathExists(path.join(project, 'ux', 'view', 'HINTS.md'))).toBe(false);
  });

  it('does not overwrite without --force', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'HINTS.md'), 'sentinel', 'utf8');

    const code = await runHints(['--project', project]);
    expect(code).toBe(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'HINTS.md'), 'utf8')).toBe('sentinel');
  });

  it('overwrites existing hint files with --force', async () => {
    await fs.ensureDir(path.join(project, 'ux', 'view'));
    await fs.writeFile(path.join(project, 'ux', 'view', 'HINTS.md'), 'sentinel', 'utf8');

    const code = await runHints(['--project', project, '--force']);
    expect(code).toBe(0);
    expect(await fs.readFile(path.join(project, 'ux', 'view', 'HINTS.md'), 'utf8')).not.toBe('sentinel');
  });
});
