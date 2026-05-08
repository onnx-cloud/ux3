/**
 * Translate CLI command tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateCommand } from '../../src/cli/commands/translate.ts';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ux3 translate CLI', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('process.exit'); }) as any);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('translate command has expected metadata', () => {
    expect(translateCommand.name()).toBe('translate');
    expect(translateCommand.aliases()).toContain('t');
    expect(translateCommand.description()).toContain('AI-powered');
  });

  it('fails when project directory has no ux3.yaml', async () => {
    try {
      await translateCommand.parseAsync(['node', 'ux3', 'translate', '--project', '/tmp/no-project']);
    } catch (e: any) {
      if (e.message === 'process.exit') {
        expect(console.error).toHaveBeenCalled();
        return;
      }
      throw e;
    }
    // Should have called process.exit
    expect(process.exit).toHaveBeenCalled();
  });

  it('fails when ux3.yaml has no translate plugin', async () => {
    const tmpDir = path.join(os.tmpdir(), 'ux3-translate-test-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'ux'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'ux', 'ux3.yaml'), 'plugins: []\n');

    try {
      await translateCommand.parseAsync(['node', 'ux3', 'translate', '--project', tmpDir]);
    } catch (e: any) {
      if (e.message === 'process.exit') {
        expect(console.error).toHaveBeenCalled();
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return;
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(process.exit).toHaveBeenCalled();
  });

  it('fails when translate plugin is missing required config keys', async () => {
    const tmpDir = path.join(os.tmpdir(), 'ux3-translate-test-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'ux'), { recursive: true });
    const YAML = require('yaml');
    fs.writeFileSync(
      path.join(tmpDir, 'ux', 'ux3.yaml'),
      YAML.stringify({
        plugins: [
          { name: '@ux3/plugin-translate', config: { endpoint: 'https://x' } },
        ],
      })
    );

    try {
      await translateCommand.parseAsync(['node', 'ux3', 'translate', '--project', tmpDir]);
    } catch (e: any) {
      if (e.message === 'process.exit') {
        expect(console.error).toHaveBeenCalled();
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return;
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(process.exit).toHaveBeenCalled();
  });

  it('dry-run outputs config without calling translation', async () => {
    const tmpDir = path.join(os.tmpdir(), 'ux3-translate-test-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'ux'), { recursive: true });
    const YAML = require('yaml');
    fs.writeFileSync(
      path.join(tmpDir, 'ux', 'ux3.yaml'),
      YAML.stringify({
        plugins: [
          {
            name: '@ux3/plugin-translate',
            config: {
              endpoint: 'https://api.example.com',
              model: 'test-model',
              apiKey: 'sk-test',
              locales: ['fr', 'de'],
            },
          },
        ],
      })
    );

    await translateCommand.parseAsync([
      'node', 'ux3', 'translate',
      '--project', tmpDir,
      '--dry-run',
    ]);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[dry-run]')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('https://api.example.com')
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
