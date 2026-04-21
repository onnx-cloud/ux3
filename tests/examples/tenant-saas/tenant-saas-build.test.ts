import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { compileAllViews } from '../../../src/build/view-compiler.ts';

const exampleRoot = path.resolve(__dirname, '../../../examples/tenant.saas');
const viewsDir = path.join(exampleRoot, 'ux', 'view');
const outDir = path.join(exampleRoot, 'generated', 'views-test');

beforeEach(async () => {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe('Tenant SaaS view compilation', () => {
  it('should compile tenant SaaS views successfully', async () => {
    await expect(compileAllViews(viewsDir, outDir, exampleRoot)).resolves.toBeUndefined();
  });
});
