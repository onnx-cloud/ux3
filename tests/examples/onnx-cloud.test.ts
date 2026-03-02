// @vitest-environment node

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { ConfigGenerator } from '../../src/build/config-generator.js';

describe('ONNX.Cloud example integration', () => {
  it('generates config with content manifest and corresponding routes', async () => {
    const projectDir = path.resolve('examples/onnx.cloud');
    const outDir = path.join(projectDir, 'generated');
    await fs.remove(outDir);

    const cfgGen = new ConfigGenerator({ configDir: projectDir, outputDir: outDir, schemas: {} });
    const cfg: any = await cfgGen.generate();

    expect(cfg.content).toBeDefined();
    expect(Array.isArray(cfg.content.items)).toBe(true);
    expect(cfg.content.items.length).toBeGreaterThan(0);

    const paths = (cfg.routes || []).map((r: any) => r.path);
    for (const item of cfg.content.items) {
      const expected = item.frontmatter.path || `/${item.slug}`;
      expect(paths).toContain(expected);
    }
  });
});