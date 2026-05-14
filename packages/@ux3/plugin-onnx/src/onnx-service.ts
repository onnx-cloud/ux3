import type { OnnxModel, OnnxMappingProfile, OnnxPromptTemplate, OnnxContentEntry } from './flatbuffer-parser.js';
import { serializeOnnxIndex } from './flatbuffer-parser.js';
import {
  getOnnxIndex,
  listOnnxIndices,
  getActiveOnnxIndexName,
  setActiveOnnxIndex,
  loadOnnxIndex as managerLoadOnnxIndex,
  saveOnnxIndex as managerSaveOnnxIndex,
  getOnnxIndexInfo,
} from './onnx-index-manager.js';

export interface OnnxSearchResult {
  id: string;
  title: string;
  uri: string;
  snippet: string;
  score: number;
}

export interface OnnxPromptSelection {
  selectedPrompt: string;
  template: string;
  description: string;
  category: string;
  indexName: string;
}

export interface OnnxModelSelection {
  id: string;
  path: string;
  task: string;
  batchSize: number;
  latency: number;
  gpu: boolean;
  providers: string[];
  tags: string[];
}

export interface OnnxIndexInfo {
  name: string;
  source: string;
  createdAt: string;
  contentCount: number;
  promptCount: number;
  modelCount: number;
  mappingCount: number;
}

export interface OnnxService {
  search(query: string, options?: { topK?: number; requireGpu?: boolean; provider?: string; indexName?: string }): Promise<{
    query: string;
    indexName: string;
    results: OnnxSearchResult[];
    count: number;
    recommendedModel: OnnxModelSelection | null;
  }>;
  selectPrompt(query: string, intent?: string, indexName?: string): Promise<OnnxPromptSelection>;
  listModels(options?: { task?: string; maxLatency?: number; requireGpu?: boolean; provider?: string; indexName?: string }): Promise<{ models: OnnxModel[]; count: number; indexName: string }>;
  selectModel(options?: { task?: string; maxLatency?: number; requireGpu?: boolean; provider?: string; indexName?: string }): Promise<{ selectedModel: OnnxModelSelection | null; indexName: string }>;
  describeModel(id: string, indexName?: string): Promise<{ model: OnnxModel | null; mapping: OnnxMappingProfile | null; indexName: string } | { error: string }>;
  listIndices(): Promise<Array<{ name: string; source: string; createdAt: string }>>;
  getActiveIndex(): Promise<string>;
  useIndex(name: string): Promise<{ activeIndex: string }>;
  loadIndex(args: { name: string; base64?: string; path?: string; storageKey?: string }): Promise<OnnxIndexInfo>;
  saveIndex(args: { name: string; path?: string; storageKey?: string }): Promise<{ path?: string; storageKey?: string; bytes?: number; length?: number }>;
  describeIndex(indexName?: string): Promise<OnnxIndexInfo>;
  serializeActiveIndex(): Promise<string>;
}

function normalizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreContent(entry: OnnxContentEntry, tokens: string[]): number {
  const haystack = `${entry.title} ${entry.snippet} ${entry.body} ${entry.tags.join(' ')}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) score += 10;
  }

  score += tokens.reduce((acc, token) => acc + (haystack.split(token).length - 1), 0);
  return score;
}

function normalizeModelTask(task: string): string {
  return task.trim().toLowerCase();
}

function filterOnnxModels(models: OnnxModel[], options: { task?: string; maxLatency?: number; requireGpu?: boolean; provider?: string } = {}) {
  return models
    .filter((model) => {
      if (options.task && normalizeModelTask(model.task) !== normalizeModelTask(options.task)) {
        return false;
      }
      if (options.requireGpu && !model.gpu) {
        return false;
      }
      if (typeof options.maxLatency === 'number' && model.latency > options.maxLatency) {
        return false;
      }
      if (options.provider && !model.providers.includes(options.provider)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.latency - b.latency;
    });
}

function selectOnnxModel(models: OnnxModel[], options: { task?: string; maxLatency?: number; requireGpu?: boolean; provider?: string } = {}) {
  return filterOnnxModels(models, options)[0] || null;
}

export function createOnnxService(): OnnxService {
  return {
    async search(query, options = {}) {
      const { topK = 5, requireGpu = false, provider, indexName } = options;
      const { entries, models } = getOnnxIndex(indexName);
      const tokens = normalizeQuery(query);
      const results = entries
        .map((entry) => ({ entry, score: scoreContent(entry, tokens) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(({ entry, score }) => ({
          id: entry.id,
          title: entry.title,
          uri: entry.uri,
          snippet: entry.snippet,
          score,
        }));

      const recommendedModel = selectOnnxModel(models, { task: 'embed', requireGpu, provider });
      return {
        query,
        indexName: indexName || getActiveOnnxIndexName(),
        results,
        count: results.length,
        recommendedModel: recommendedModel
          ? {
              id: recommendedModel.id,
              path: recommendedModel.path,
              task: recommendedModel.task,
              batchSize: recommendedModel.batchSize,
              latency: recommendedModel.latency,
              gpu: recommendedModel.gpu,
              providers: recommendedModel.providers,
              tags: recommendedModel.tags,
            }
          : null,
      };
    },

    async selectPrompt(query, intent = 'search', indexName) {
      const { prompts } = getOnnxIndex(indexName);
      const tokens = normalizeQuery(`${query} ${intent}`);
      let best = prompts[0];
      let bestScore = -Infinity;

      for (const prompt of prompts) {
        const score = scoreContent(
          {
            id: prompt.name,
            title: prompt.description,
            uri: '',
            snippet: prompt.template,
            body: prompt.template,
            tags: [prompt.category],
          },
          tokens
        );
        if (score > bestScore) {
          bestScore = score;
          best = prompt;
        }
      }

      return {
        selectedPrompt: best.name,
        template: best.template,
        description: best.description,
        category: best.category,
        indexName: indexName || getActiveOnnxIndexName(),
      };
    },

    async listModels(options = {}) {
      const { models } = getOnnxIndex(options.indexName);
      const filtered = filterOnnxModels(models, options);
      return {
        models: filtered,
        count: filtered.length,
        indexName: options.indexName || getActiveOnnxIndexName(),
      };
    },

    async selectModel(options = {}) {
      const { models } = getOnnxIndex(options.indexName);
      const model = selectOnnxModel(models, options);
      return {
        selectedModel: model
          ? {
              id: model.id,
              path: model.path,
              task: model.task,
              batchSize: model.batchSize,
              latency: model.latency,
              gpu: model.gpu,
              providers: model.providers,
              tags: model.tags,
            }
          : null,
        indexName: options.indexName || getActiveOnnxIndexName(),
      };
    },

    async describeModel(id, indexName) {
      const { models, mappings } = getOnnxIndex(indexName);
      const model = models.find((item) => item.id === id) ?? null;
      if (!model) {
        return { error: `Model not found: ${id}` };
      }
      return {
        model,
        mapping: mappings.find((item) => item.model === model.id) ?? null,
        indexName: indexName || getActiveOnnxIndexName(),
      };
    },

    async listIndices() {
      return listOnnxIndices();
    },

    async getActiveIndex() {
      return getActiveOnnxIndexName();
    },

    async useIndex(name) {
      return { activeIndex: setActiveOnnxIndex(name) };
    },

    async loadIndex(args) {
      return managerLoadOnnxIndex(args.name, args);
    },

    async saveIndex(args) {
      return managerSaveOnnxIndex(args.name, args);
    },

    async describeIndex(indexName) {
      return getOnnxIndexInfo(indexName);
    },

    async serializeActiveIndex() {
      const payload = getOnnxIndex(getActiveOnnxIndexName());
      return btoa ? btoa(String.fromCharCode(...serializeOnnxIndex(payload))) : Buffer.from(serializeOnnxIndex(payload)).toString('base64');
    },
  };
}
