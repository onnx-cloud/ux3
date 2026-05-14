import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import OnnxPlugin from '../packages/@ux3/plugin-onnx/src/index.js';

describe('@ux3/plugin-onnx', () => {
  const tempBase = path.join(os.tmpdir(), 'onnx-index-test-');
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(tempBase);
    await OnnxPlugin.callTool?.('onnx.index.use', { name: 'default' });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
    await OnnxPlugin.callTool?.('onnx.index.use', { name: 'default' });
  });

  it('exports a plugin object with the ONNX model tools', () => {
    expect(OnnxPlugin).toBeTypeOf('object');
    expect(OnnxPlugin.name).toBe('@ux3/plugin-onnx');
    expect(OnnxPlugin.mcp?.tools?.some((tool: any) => tool.name === 'onnx.model.list')).toBe(true);
    expect(OnnxPlugin.mcp?.tools?.some((tool: any) => tool.name === 'onnx.model.select')).toBe(true);
    expect(OnnxPlugin.mcp?.tools?.some((tool: any) => tool.name === 'onnx.model.describe')).toBe(true);
  });

  it('registers the ONNX runtime service and exposes the search API', async () => {
    const mockApp: any = {
      services: {},
      utils: {},
      registerService: vi.fn((name: string, factory: Function) => {
        mockApp.services[name] = factory();
      }),
    };

    OnnxPlugin.install?.(mockApp);

    expect(mockApp.registerService).toHaveBeenCalledWith('onnx', expect.any(Function));
    expect(mockApp.services.onnx).toBeDefined();
    expect(mockApp.utils.onnx).toBeDefined();

    const service = mockApp.services.onnx as any;
    expect(typeof service.search).toBe('function');
    expect(typeof service.listModels).toBe('function');
    expect(typeof service.useIndex).toBe('function');

    const searchResult = await service.search('model');
    expect(searchResult).toEqual(expect.objectContaining({ query: 'model', results: expect.any(Array), count: expect.any(Number) }));
  });

  it('returns ONNX model metadata for embed task', async () => {
    const result = await OnnxPlugin.callTool?.('onnx.model.list', { task: 'embed' });
    expect(result).toBeTypeOf('object');
    expect((result as any).models).toBeInstanceOf(Array);
    expect((result as any).models.length).toBeGreaterThan(0);
    expect((result as any).count).toBe((result as any).models.length);
  });

  it('selects a CPU-compatible embed model and describes it', async () => {
    const selectResult = await OnnxPlugin.callTool?.('onnx.model.select', { task: 'embed', provider: 'cpu' });
    expect(selectResult).toBeTypeOf('object');
    expect((selectResult as any).selectedModel?.providers).toContain('cpu');

    const describeResult = await OnnxPlugin.callTool?.('onnx.model.describe', { id: (selectResult as any).selectedModel.id });
    expect(describeResult).toBeTypeOf('object');
    expect((describeResult as any).model?.id).toBe((selectResult as any).selectedModel.id);
    expect((describeResult as any).mapping).toBeTruthy();
  });

  it('manages multiple ONNX indices and persists a saved index file', async () => {
    const initialList = await OnnxPlugin.callTool?.('onnx.index.list', {});
    expect(initialList).toBeTypeOf('object');
    expect((initialList as any).activeIndex).toBe('default');
    expect((initialList as any).indices).toEqual(expect.arrayContaining([{ name: 'default', source: expect.any(String), createdAt: expect.any(String) }]));

    const filePath = path.join(tempDir, 'onnx-index.bin');
    const saveResult = await OnnxPlugin.callTool?.('onnx.index.save', { name: 'default', path: filePath });
    expect(saveResult).toBeTypeOf('object');
    expect((saveResult as any).path).toBe(filePath);
    expect((await stat(filePath)).isFile()).toBe(true);

    const loadResult = await OnnxPlugin.callTool?.('onnx.index.load', { name: 'loaded-index', path: filePath });
    expect(loadResult).toBeTypeOf('object');
    expect((loadResult as any).name).toBe('loaded-index');
    expect((loadResult as any).contentCount).toBeGreaterThan(0);

    const useResult = await OnnxPlugin.callTool?.('onnx.index.use', { name: 'loaded-index' });
    expect(useResult).toEqual({ activeIndex: 'loaded-index' });

    const postList = await OnnxPlugin.callTool?.('onnx.index.list', {});
    expect((postList as any).activeIndex).toBe('loaded-index');
    expect((postList as any).indices).toEqual(expect.arrayContaining([{ name: 'loaded-index', source: expect.any(String), createdAt: expect.any(String) }]));

    const describeResult = await OnnxPlugin.callTool?.('onnx.index.describe', {});
    expect(describeResult).toEqual(expect.objectContaining({ name: 'loaded-index', source: expect.any(String), contentCount: expect.any(Number), promptCount: expect.any(Number), modelCount: expect.any(Number), mappingCount: expect.any(Number) }));
  });
});
