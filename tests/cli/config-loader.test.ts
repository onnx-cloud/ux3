// @vitest-environment node

import fs from 'fs-extra';
import path from 'path';
import {
  deepMerge,
  getConfigValue,
  setConfigValue,
  loadConfig,
  loadConfigCached,
  clearConfigCache,
} from '../../src/cli/config-loader.ts';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'config-loader');

describe('config-loader utilities', () => {
  beforeEach(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(tmpRoot);
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
    clearConfigCache();
  });

  it('deepMerge combines objects with last-wins behavior', () => {
    const o1 = { a: { b: 1, c: 2 }, d: 3 };
    const o2 = { a: { c: 99, e: 4 }, f: 5 };
    const merged = deepMerge<any>(o1, o2);
    expect(merged.a.b).toBe(1);
    expect(merged.a.c).toBe(99);
    expect(merged.a.e).toBe(4);
    expect(merged.d).toBe(3);
    expect(merged.f).toBe(5);
  });

  it('getConfigValue and setConfigValue work with dot paths', () => {
    const cfg: any = {};
    setConfigValue(cfg, 'foo.bar.0', 'baz');
    expect(getConfigValue(cfg, 'foo.bar.0')).toBe('baz');
    expect(getConfigValue(cfg, 'foo.bar.1', 'def')).toBe('def');
  });

  it('loadConfig throws if mandatory keys missing', async () => {
    // create a config dir without required keys
    const cfgPath = path.join(tmpRoot, 'configs');
    await fs.ensureDir(cfgPath);
    await fs.writeFile(path.join(cfgPath, 'a.yaml'), `something: 1`);

    await expect(loadConfig(tmpRoot)).rejects.toThrow(/Missing mandatory config keys/);
  });

  it('loadConfig merges yaml/json/js and honors priority', async () => {
    const cfgDir = path.join(tmpRoot, 'configs');
    await fs.ensureDir(cfgDir);
    await fs.writeFile(path.join(cfgDir, '01.yaml'), `routes: [{ path: "/" }]
services: []
tokens: {}
`);
    await fs.writeJson(path.join(cfgDir, '02.json'), { services: [{ type: 'json' }] });
    // js config
    const jsCfg = path.join(tmpRoot, 'ux3.config.ts');
    await fs.writeFile(jsCfg, 'export default { services: [{ type: "js" }], tokens: { foo: "bar" } };');

    const cfg = await loadConfig(tmpRoot, { validateMandatory: true });
    expect(cfg.routes).toBeDefined();
    expect(Array.isArray(cfg.services)).toBe(true);
    // cast to any since union type preserves unknown indexing
    expect((cfg.services as any)[0].type).toBe('js');
    expect(cfg.tokens?.foo).toBe('bar');
  });

  it('loadConfigCached returns cached result and respects clearConfigCache', async () => {
    const cfgDir = path.join(tmpRoot, 'configs');
    await fs.ensureDir(cfgDir);
    await fs.writeFile(path.join(cfgDir, 'a.yaml'), `routes: [{ path: "/" }]
services: []
tokens: {}
`);
    const first = await loadConfigCached(tmpRoot);
    expect(first.routes).toBeDefined();

    // mutate disk
    await fs.writeFile(path.join(cfgDir, 'b.yaml'), `routes: [{ path: "/foo" }]
services: []
tokens: {}
`);
    const second = await loadConfigCached(tmpRoot);
    // still old value because cached
    expect((second.routes as any[])[0].path).toBe('/');

    clearConfigCache(tmpRoot);
    const third = await loadConfigCached(tmpRoot);
    expect((third.routes as any[])[0].path).toBe('/foo');
  });
});
