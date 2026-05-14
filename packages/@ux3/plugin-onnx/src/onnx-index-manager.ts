import { type OnnxIndexPayload, parseOnnxIndexFromBase64, parseOnnxIndexFromBytes, serializeOnnxIndex } from './flatbuffer-parser.js';
import { ONNX_INDEX_BASE64 } from './built-index.js';

const DEFAULT_INDEX_NAME = 'default';

interface OnnxIndexMeta {
  payload: OnnxIndexPayload;
  source: string;
  createdAt: string;
}

const indices = new Map<string, OnnxIndexMeta>();
let activeIndexName = DEFAULT_INDEX_NAME;

const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string';
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function ensureDefaultIndex(): void {
  if (!indices.has(DEFAULT_INDEX_NAME)) {
    indices.set(DEFAULT_INDEX_NAME, {
      payload: parseOnnxIndexFromBase64(ONNX_INDEX_BASE64),
      source: 'builtin',
      createdAt: new Date().toISOString(),
    });
  }
}

export function listOnnxIndices(): Array<{ name: string; source: string; createdAt: string }> {
  ensureDefaultIndex();
  return Array.from(indices.entries()).map(([name, meta]) => ({
    name,
    source: meta.source,
    createdAt: meta.createdAt,
  }));
}

export function getActiveOnnxIndexName(): string {
  ensureDefaultIndex();
  return activeIndexName;
}

export function setActiveOnnxIndex(name: string): string {
  ensureDefaultIndex();
  if (!indices.has(name)) {
    throw new Error(`ONNX index not found: ${name}`);
  }
  activeIndexName = name;
  return activeIndexName;
}

export function getOnnxIndex(name?: string): OnnxIndexPayload {
  ensureDefaultIndex();
  const indexName = name ?? activeIndexName;
  const entry = indices.get(indexName);
  if (!entry) {
    throw new Error(`ONNX index not found: ${indexName}`);
  }
  return entry.payload;
}

export function getOnnxIndexInfo(name?: string) {
  ensureDefaultIndex();
  const indexName = name ?? activeIndexName;
  const entry = indices.get(indexName);
  if (!entry) {
    throw new Error(`ONNX index not found: ${indexName}`);
  }
  return {
    name: indexName,
    source: entry.source,
    createdAt: entry.createdAt,
    contentCount: entry.payload.entries.length,
    promptCount: entry.payload.prompts.length,
    modelCount: entry.payload.models.length,
    mappingCount: entry.payload.mappings.length,
  };
}

export function registerOnnxIndex(name: string, payload: OnnxIndexPayload, source = 'custom'): void {
  indices.set(name, {
    payload,
    source,
    createdAt: new Date().toISOString(),
  });
}

export function loadOnnxIndexFromBase64(name: string, base64: string) {
  registerOnnxIndex(name, parseOnnxIndexFromBase64(base64), 'base64');
  return getOnnxIndexInfo(name);
}

export function loadOnnxIndexFromBytes(name: string, bytes: Uint8Array) {
  registerOnnxIndex(name, parseOnnxIndexFromBytes(bytes), 'bytes');
  return getOnnxIndexInfo(name);
}

export async function loadOnnxIndexFromFile(name: string, filePath: string) {
  if (!isNode) {
    throw new Error('File system index loading is only available in Node.js.');
  }
  const { readFile } = await import('node:fs/promises');
  const file = await readFile(filePath);
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);
  registerOnnxIndex(name, parseOnnxIndexFromBytes(bytes), `file:${filePath}`);
  return getOnnxIndexInfo(name);
}

export async function saveOnnxIndexToFile(name: string, filePath: string) {
  if (!isNode) {
    throw new Error('File system index saving is only available in Node.js.');
  }
  const payload = getOnnxIndex(name);
  const bytes = serializeOnnxIndex(payload);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(filePath, bytes);
  return { path: filePath, bytes: bytes.length };
}

export function saveOnnxIndexToLocalStorage(name: string, storageKey?: string) {
  if (!isBrowser) {
    throw new Error('LocalStorage index saving is only available in the browser.');
  }
  const payload = getOnnxIndex(name);
  const key = storageKey || `onnx.index.${name}`;
  window.localStorage.setItem(key, JSON.stringify(payload));
  return { storageKey: key, length: window.localStorage.getItem(key)?.length ?? 0 };
}

export function loadOnnxIndexFromLocalStorage(name: string, storageKey?: string) {
  if (!isBrowser) {
    throw new Error('LocalStorage index loading is only available in the browser.');
  }
  const key = storageKey || `onnx.index.${name}`;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    throw new Error(`ONNX index not found in LocalStorage: ${key}`);
  }
  registerOnnxIndex(name, JSON.parse(raw) as OnnxIndexPayload, `localStorage:${key}`);
  return getOnnxIndexInfo(name);
}

export async function loadOnnxIndex(name: string, options: { path?: string; storageKey?: string; base64?: string }) {
  if (options.path) {
    return loadOnnxIndexFromFile(name, options.path);
  }
  if (options.storageKey) {
    return loadOnnxIndexFromLocalStorage(name, options.storageKey);
  }
  if (options.base64) {
    return loadOnnxIndexFromBase64(name, options.base64);
  }
  throw new Error('Index load requires one of path, storageKey, or base64.');
}

export async function saveOnnxIndex(name: string, options: { path?: string; storageKey?: string }) {
  if (options.path) {
    return saveOnnxIndexToFile(name, options.path);
  }
  if (options.storageKey) {
    return saveOnnxIndexToLocalStorage(name, options.storageKey);
  }
  if (isBrowser) {
    return saveOnnxIndexToLocalStorage(name);
  }
  throw new Error('Index save requires path in Node.js or storageKey in browser.');
}
