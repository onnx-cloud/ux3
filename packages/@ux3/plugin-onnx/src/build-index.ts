import { mkdirSync } from 'node:fs';
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeOnnxIndex } from './flatbuffer-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, '../content');
const PROMPTS_DIR = path.join(__dirname, '../prompts');
const MODEL_TTL = path.join(__dirname, '../zoo/onnx/models.ttl');
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

interface OnnxBinding {
  name: string;
  term: string;
  shape: string;
  type: string;
}

interface OnnxModel {
  id: string;
  path: string;
  version: string;
  task: string;
  inputShape: string;
  outputShape: string;
  batchSize: number;
  latency: number;
  mapId: string;
  gpu: boolean;
  providers: string[];
  tags: string[];
  priority: number;
  available: string;
}

interface OnnxMappingProfile {
  id: string;
  model: string;
  input: OnnxBinding[];
  output: OnnxBinding[];
}

function splitTopLevel(text: string, delimiter: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = '';

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const prev = text[i - 1];

    if (char === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (char === '[') depth += 1;
      if (char === ']') depth -= 1;
      if (char === delimiter && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.filter(Boolean);
}

function parseTurtleValue(value: string): any {
  const text = value.trim();
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    const triples = splitTopLevel(inner, ';').map((entry) => entry.trim()).filter(Boolean);
    const obj: Record<string, any> = {};
    for (const triple of triples) {
      const [predicate, rawObject] = triple.split(/\s+(.+)/s);
      const parsed = parseTurtleValue(rawObject.trim());
      const key = predicate.trim();
      if (obj[key]) {
        obj[key] = Array.isArray(obj[key]) ? [...obj[key], parsed] : [obj[key], parsed];
      } else {
        obj[key] = parsed;
      }
    }
    return obj;
  }

  const literalMatch = text.match(/^"([\s\S]*?)"(?:\^\^([^\s]+))?$/);
  if (literalMatch) {
    const [, raw, type] = literalMatch;
    if (type?.endsWith('integer')) {
      return Number(raw);
    }
    if (type?.endsWith('boolean')) {
      return raw === 'true';
    }
    return raw;
  }

  if (text === 'true') return true;
  if (text === 'false') return false;
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && String(numeric) === text) {
    return numeric;
  }

  return text;
}

function parseTurtle(text: string) {
  const cleaned = text
    .replace(/#.*/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const statements = splitTopLevel(cleaned, '.').map((part) => part.trim()).filter(Boolean);
  const subjects: Record<string, Record<string, any>> = {};

  for (const statement of statements) {
    const [subjectToken, rest] = statement.split(/\s+(.+)/s);
    if (!rest) continue;
    const subject = subjectToken.trim();
    const predicateClauses = splitTopLevel(rest, ';').map((c) => c.trim()).filter(Boolean);
    const model: Record<string, any> = subjects[subject] || {};

    for (const clause of predicateClauses) {
      const [predicate, objectRaw] = clause.split(/\s+(.+)/s);
      if (!predicate || !objectRaw) continue;
      const value = parseTurtleValue(objectRaw.trim());
      const key = predicate.trim();
      if (model[key]) {
        model[key] = Array.isArray(model[key]) ? [...model[key], value] : [model[key], value];
      } else {
        model[key] = value;
      }
    }

    subjects[subject] = model;
  }

  return subjects;
}

function normalizeTurtleTerm(value: any): string {
  if (typeof value !== 'string') return String(value);
  return value.replace(/^[:<]?([^:>]+):?$/, '$1');
}

function buildModelMetadata(): Promise<{ models: OnnxModel[]; mappings: OnnxMappingProfile[] }> {
  return readFile(MODEL_TTL, 'utf-8').then((raw) => {
    const subjects = parseTurtle(raw);
    const models: OnnxModel[] = [];
    const mappings: OnnxMappingProfile[] = [];

    for (const subject of Object.keys(subjects)) {
      const entry = subjects[subject];
      if (entry['a'] === 'onnx:Model') {
        models.push({
          id: String(entry['onnx:id'] ?? normalizeTurtleTerm(subject)),
          path: String(entry['onnx:path'] ?? ''),
          version: String(entry['onnx:version'] ?? ''),
          task: String(entry['onnx:task'] ?? ''),
          inputShape: String(entry['onnx:inputShape'] ?? ''),
          outputShape: String(entry['onnx:outputShape'] ?? ''),
          batchSize: Number(entry['onnx:batchSize'] ?? 0),
          latency: Number(entry['onnx:latency'] ?? 0),
          mapId: String(entry['onnx:mapId'] ?? ''),
          gpu: Boolean(entry['onnx:gpu'] ?? false),
          providers: (Array.isArray(entry['onnx:provider']) ? entry['onnx:provider'] : entry['onnx:provider'] ? [entry['onnx:provider']] : []).map(normalizeTurtleTerm),
          tags: (Array.isArray(entry['onnx:tag']) ? entry['onnx:tag'] : entry['onnx:tag'] ? [entry['onnx:tag']] : []).map(normalizeTurtleTerm),
          priority: Number(entry['onnx:priority'] ?? 0),
          available: String(entry['onnx:available'] ?? ''),
        });
      }

      if (entry['a'] === 'onnx:MappingProfile') {
        const inputValues = Array.isArray(entry['onnx:input']) ? entry['onnx:input'] : entry['onnx:input'] ? [entry['onnx:input']] : [];
        const outputValues = Array.isArray(entry['onnx:output']) ? entry['onnx:output'] : entry['onnx:output'] ? [entry['onnx:output']] : [];

        mappings.push({
          id: String(entry['onnx:id'] ?? normalizeTurtleTerm(subject)),
          model: String(entry['onnx:model'] ?? ''),
          input: inputValues.map((binding: any) => ({
            name: String(binding['onnx:name'] ?? ''),
            term: String(binding['onnx:term'] ?? ''),
            shape: String(binding['onnx:shape'] ?? ''),
            type: String(binding['onnx:type'] ?? ''),
          })),
          output: outputValues.map((binding: any) => ({
            name: String(binding['onnx:name'] ?? ''),
            term: String(binding['onnx:term'] ?? ''),
            shape: String(binding['onnx:shape'] ?? ''),
            type: String(binding['onnx:type'] ?? ''),
          })),
        });
      }
    }

    return { models, mappings };
  });
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
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

async function main() {
  const content = await buildContentEntries();
  const prompts = await buildPromptTemplates();
  const { models, mappings } = await buildModelMetadata();

  const payload = { entries: content, prompts, models, mappings };
  const bytes = serializeOnnxIndex(payload);
  const base64 = Buffer.from(bytes).toString('base64');

  const tsSource = `// Generated by src/build-index.ts\nexport const ONNX_INDEX_BASE64 = ${JSON.stringify(base64)};\n`;

  await writeFile(OUT_TS, tsSource, 'utf-8');
  mkdirSync(path.dirname(OUT_BIN.pathname), { recursive: true });
  await writeFile(OUT_BIN, bytes, 'binary');
  console.log(`Generated ONNX index from ${content.length} content entries, ${prompts.length} prompt templates, and ${models.length} model metadata entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
