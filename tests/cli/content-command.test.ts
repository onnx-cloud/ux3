// @vitest-environment node

import fs from 'fs-extra';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runCommand } from './utils.ts';

// We'll create a minimal project and invoke `ux3 content` via Node CLI

describe('ux3 content CLI', () => {
  const tmpDir = path.join(process.cwd(), 'tests/tmp/content-cli');
  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);
  });
  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('generates manifest file when run', async () => {
    const contentDir = path.join(tmpDir, 'content');
    await fs.ensureDir(contentDir);
    await fs.writeFile(contentDir + '/foo.md', '---\ntitle: Foo\nslug: foo\n---\nhello');

    const cli = path.resolve('src/cli/cli.ts');
    const result = await runCommand(`npx tsx ${cli} content --project ${tmpDir}`);
    expect(result.code).toBe(0);
    const manifest = path.join(tmpDir, 'generated', 'content-manifest.json');
    expect(await fs.pathExists(manifest)).toBe(true);
    const data = JSON.parse(await fs.readFile(manifest, 'utf-8'));
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items[0].slug).toBe('foo');
  });
});