import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { scaffold } from '../src/core/pipeline';
import { getPluginTemplatesDir } from '../src/types';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('scaffold pipeline', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temp directory for tests
    tempDir = path.join(__dirname, '..', 'tmp', 'scaffold-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore errors
    }
  });

  it('scaffolds a plugin', async () => {
    const result = await scaffold({
      section: 'app/plugin',
      name: 'my-test-plugin',
      targetDir: path.join(tempDir, 'plugin'),
    });

    expect(result.written.length).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);

    // Check that package.json was created and interpolated
    const packageJsonPath = path.join(tempDir, 'plugin', 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    expect(content).toContain('@ux3/plugin-my-test-plugin');
    expect(content).not.toContain('[[');
  });

  it('emits file-written events', async () => {
    const result = await scaffold({
      section: 'app/plugin',
      name: 'test',
      targetDir: path.join(tempDir, 'plugin'),
    });

    const writtenEvents = result.events.filter((e) => e.type === 'file-written');
    expect(writtenEvents.length).toBeGreaterThan(0);
  });

  it('respects dry-run flag', async () => {
    const dryRunResult = await scaffold({
      section: 'app/plugin',
      name: 'test',
      targetDir: path.join(tempDir, 'dry-run'),
      dryRun: true,
    });

    // Dry-run should report what would be written
    expect(dryRunResult.written.length).toBeGreaterThan(0);

    // But target directory should remain empty (or not exist)
    try {
      await fs.access(path.join(tempDir, 'dry-run', 'package.json'));
      throw new Error('Dry run should not create files');
    } catch (e: unknown) {
      if (e instanceof Error && !e.message.includes('should not create')) {
        // ENOENT or similar is expected
      } else {
        throw e;
      }
    }
  });

  it('skips existing files by default', async () => {
    const targetDir = path.join(tempDir, 'existing');
    await fs.mkdir(targetDir, { recursive: true });

    // Create a file that exists
    const existingFile = path.join(targetDir, 'package.json');
    await fs.writeFile(existingFile, 'EXISTING CONTENT');

    const result = await scaffold({
      section: 'app/plugin',
      name: 'test',
      targetDir,
    });

    // Check that the file was not overwritten
    const content = await fs.readFile(existingFile, 'utf-8');
    expect(content).toBe('EXISTING CONTENT');

    // Check for skip event
    const skipEvents = result.events.filter((e) => e.type === 'file-skipped' && e.reason === 'exists');
    expect(skipEvents.length).toBeGreaterThan(0);
  });

  it('overwrites files with force flag', async () => {
    const targetDir = path.join(tempDir, 'force');
    await fs.mkdir(targetDir, { recursive: true });

    // Create a file that exists
    const existingFile = path.join(targetDir, 'package.json');
    await fs.writeFile(existingFile, 'OLD CONTENT');

    const result = await scaffold({
      section: 'app/plugin',
      name: 'test',
      targetDir,
      force: true,
    });

    // Check that the file was overwritten
    const content = await fs.readFile(existingFile, 'utf-8');
    expect(content).not.toBe('OLD CONTENT');
    expect(content).toContain('@ux3/plugin-test');
  });

  it('provides helpful error when template not found', async () => {
    try {
      await scaffold({
        section: 'nonexistent-section',
        name: 'test',
        targetDir: path.join(tempDir, 'error'),
      });
      throw new Error('Should have thrown');
    } catch (e: unknown) {
      expect(e instanceof Error).toBe(true);
      const msg = (e as Error).message;
      expect(msg).toContain('nonexistent-section');
    }
  });
});
