// @vitest-environment node

import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

describe('DevServer public static file routing', () => {
  it('serves resource under /.well-known/appspecific/com.chrome.devtools.json', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const projectDir = path.join(tmpRoot, `ux3-devserver-well-known-${Date.now()}`);
    await fs.ensureDir(projectDir);

    const publicDir = path.join(projectDir, 'public', '.well-known', 'appspecific');
    await fs.ensureDir(publicDir);
    const manifestFile = path.join(publicDir, 'com.chrome.devtools.json');
    const manifestData = { name: 'ux3-dev-server', version: '1.0.0' };
    await fs.writeJson(manifestFile, manifestData, { spaces: 2 });

    const { DevServer } = await import('@ux3/dev/dev-server.ts');
    const server = new DevServer(projectDir, 3730, 'localhost');
    server.setManifest({ config: {}, types: {}, invokes: {}, stats: { buildTime: 0 } });
    await server.start();

    try {
      const res = await fetch('http://localhost:3730/.well-known/appspecific/com.chrome.devtools.json');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type') || '').toContain('application/json');
      const body = await res.json();
      expect(body).toEqual(manifestData);
    } finally {
      await server.stop();
      await fs.remove(projectDir);
    }
  });

  it('serves root-level /.well-known/appspecific/com.chrome.devtools.json when public is absent', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const projectDir = path.join(tmpRoot, `ux3-devserver-well-known-root-${Date.now()}`);
    await fs.ensureDir(projectDir);

    const rootWellKnownDir = path.join(projectDir, '.well-known', 'appspecific');
    await fs.ensureDir(rootWellKnownDir);
    const manifestFile = path.join(rootWellKnownDir, 'com.chrome.devtools.json');
    const manifestData = { name: 'ux3-dev-server-root', version: '2.0.0' };
    await fs.writeJson(manifestFile, manifestData, { spaces: 2 });

    const { DevServer } = await import('@ux3/dev/dev-server.ts');
    const server = new DevServer(projectDir, 3731, 'localhost');
    server.setManifest({ config: {}, types: {}, invokes: {}, stats: { buildTime: 0 } });
    await server.start();

    try {
      const res = await fetch('http://localhost:3731/.well-known/appspecific/com.chrome.devtools.json');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type') || '').toContain('application/json');
      const body = await res.json();
      expect(body).toEqual(manifestData);
    } finally {
      await server.stop();
      await fs.remove(projectDir);
    }
  });
});
