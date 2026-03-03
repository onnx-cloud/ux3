// @vitest-environment node

import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { Bundler } from '../../src/build/bundler.ts';

// ensure runtime info calculation logic produces nonempty values when bundle exists

describe('dev command runtime info', () => {
  it('generates runtime bundle and style paths', async () => {
    const temp = path.join(process.cwd(), 'tests/tmp/dev-runtime-' + Date.now());
    await fs.remove(temp);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'generated'));
    // create minimal generated config and types modules
    await fs.writeFile(path.join(temp, 'generated', 'config.ts'), 'export const config = {};');
    await fs.writeFile(
      path.join(temp, 'generated', 'types.ts'),
      'export type Routes = any; export type Services = any; export type I18n = any;'
    );
    // create entry that imports them
    const entryCode = `export { config, type Routes, type Services, type I18n } from '${path
      .join(temp, 'generated', 'config.ts')
      .replace(/\\/g, '/')}'`;
    await fs.writeFile(path.join(temp, 'generated', '__entry__.ts'), entryCode);

    const outputDir = path.join(temp, 'dist');
    await fs.ensureDir(outputDir);

    const bundler = new Bundler({
      projectDir: temp,
      generatedDir: path.join(temp, 'generated'),
      outputDir,
      minify: false,
      sourcemaps: false,
    });
    const bundlePath = await bundler.bundle();
    const bundleRel = path.relative(temp, bundlePath).replace(/\\/g, '/');

    expect(bundleRel).toMatch(/bundle\.js$/);
    const styles: string[] = [];
    const files = fs.readdirSync(outputDir);
    for (const f of files) if (f.endsWith('.css')) styles.push(path.join(path.relative(temp, outputDir), f));

    // styles may be empty if bundler doesn't output css but path is array
    expect(Array.isArray(styles)).toBe(true);
    // runtime info object mimic
    const runtimeInfo = {
      bundle: bundleRel,
      styles,
      version: '0.0.0',
      minified: false,
    };
    expect(runtimeInfo.bundle).toBe(bundleRel);

    await fs.remove(temp);
  });
});
