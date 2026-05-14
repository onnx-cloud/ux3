import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, '../content');
const PROMPTS_DIR = path.join(__dirname, '../prompts');
const OUT_TS = new URL('./built-index.ts', import.meta.url);
const OUT_BIN = new URL('../dist/onnx-index.bin', import.meta.url);

interface ContentEntry {
  id: string;
  title: string;
  uri: string;
  snippet: string;
  body: string;
  tags: string[];
}

interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  category: string;
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^# .+$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[*_]{1,3}/g, '')
    .replace(/>\s?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMarkdownFile(filename: string, text: string): { title: string; body: string; description: string; tags: string[] } {
  const lines = text.split(/\r?\n/);
  let title = '';
  let bodyLines = [...lines];
  if (lines[0]?.startsWith('# ')) {
    title = lines[0].slice(2).trim();
    bodyLines = lines.slice(1);
  }

  const body = bodyLines.join('\n').trim();
  const plainBody = stripMarkdown(body);
  const description = plainBody.split(/\n\s*\n/)[0].slice(0, 240).trim();
  const tags = filename
    .replace(/\.md$/i, '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());

  return {
    title: title || path.basename(filename, '.md'),
    body,
    description,
    tags,
  };
}

async function collectMarkdownFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(folder, entry.name));
}

async function buildContentEntries(): Promise<ContentEntry[]> {
  const files = await collectMarkdownFiles(CONTENT_DIR);
  const entries: ContentEntry[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { title, body, description, tags } = parseMarkdownFile(path.basename(filePath), raw);
    entries.push({
      id: path.basename(filePath, '.md'),
      title,
      uri: `plugin://onnx/content/${path.basename(filePath, '.md')}`,
      snippet: description,
      body,
      tags,
    });
  }

  return entries;
}

function promptNameFromFile(filename: string): string {
  const base = path.basename(filename, '.md');
  return `onnx.prompt.${base.replace(/[^a-z0-9]+/gi, '.').replace(/\.+$/, '')}`;
}

function promptCategoryFromFile(filename: string): string {
  const base = path.basename(filename, '.md');
  const candidate = base.toLowerCase();
  if (candidate.includes('search')) return 'search';
  if (candidate.includes('summary')) return 'summary';
  if (candidate.includes('tutorial')) return 'tutorial';
  return 'general';
}

async function buildPromptTemplates(): Promise<PromptTemplate[]> {
  const files = await collectMarkdownFiles(PROMPTS_DIR);
  const prompts: PromptTemplate[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { title, body, description } = parseMarkdownFile(path.basename(filePath), raw);

    prompts.push({
      name: promptNameFromFile(filePath),
      description: description || title,
      template: body,
      category: promptCategoryFromFile(filePath),
    });
  }

  return prompts;
}

async function buildFlatBufferPayload(payload: unknown): Promise<Uint8Array> {
  const text = JSON.stringify(payload);
  const payloadBytes = encodeUtf8(text);

  const vtableLength = 6;
  const tableSize = 8;
  const rootTableStart = 4 + vtableLength;
  const paddedRootTableStart = Math.ceil(rootTableStart / 4) * 4;
  const fieldEntryOffset = 4;
  const fieldValueOffset = 4;

  const tableEnd = paddedRootTableStart + tableSize;
  const payloadStart = Math.ceil(tableEnd / 4) * 4;
  const totalSize = payloadStart + 4 + payloadBytes.length;

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  writeUint32(view, 0, paddedRootTableStart);

  const vtableStart = 4;
  writeUint16(view, vtableStart + 0, vtableLength);
  writeUint16(view, vtableStart + 2, tableSize);
  writeUint16(view, vtableStart + 4, fieldEntryOffset);

  const rootTableOffset = paddedRootTableStart;
  const vtableOffset = vtableStart - rootTableOffset;
  view.setInt16(rootTableOffset + 0, vtableOffset, true);
  view.setInt16(rootTableOffset + 2, 0, true);
  writeUint32(view, rootTableOffset + 4, fieldValueOffset);

  writeUint32(view, payloadStart, payloadBytes.length);
  buffer.set(payloadBytes, payloadStart + 4);

  return buffer;
}

function base64FromBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

async function main() {
  const content = await buildContentEntries();
  const prompts = await buildPromptTemplates();

  const payload = { entries: content, prompts };
  const bytes = await buildFlatBufferPayload(payload);
  const base64 = base64FromBytes(bytes);

  const tsSource = `// Generated by src/build-index.ts\nexport const ONNX_INDEX_BASE64 = ${JSON.stringify(base64)};\n`;

  await writeFile(OUT_TS, tsSource, 'utf-8');
  await writeFile(OUT_BIN, bytes, 'binary');
  console.log(`Generated ONNX index from ${content.length} content entries and ${prompts.length} prompt templates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
