import type { OnnxContentEntry, OnnxModel, OnnxMappingProfile, OnnxPromptTemplate } from './flatbuffer-parser.js';
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

export const OnnxTools = {
  SEARCH_QUERY: 'onnx.search.query',
  PROMPT_SELECT: 'onnx.prompt.select',
  INDEX_DESCRIBE: 'onnx.index.describe',
  INDEX_LIST: 'onnx.index.list',
  INDEX_USE: 'onnx.index.use',
  INDEX_GET_ACTIVE: 'onnx.index.getActive',
  INDEX_LOAD: 'onnx.index.load',
  INDEX_SAVE: 'onnx.index.save',
  MODEL_LIST: 'onnx.model.list',
  MODEL_SELECT: 'onnx.model.select',
  MODEL_DESCRIBE: 'onnx.model.describe',
} as const;

export const OnnxResources = {
  INDEX: 'plugin://onnx/index',
  CONTENT: 'plugin://onnx/content',
  PROMPTS: 'plugin://onnx/prompts',
  MODELS: 'plugin://onnx/models',
  MAPPINGS: 'plugin://onnx/mappings',
  INDICES: 'plugin://onnx/indices',
  ACTIVE_INDEX: 'plugin://onnx/active-index',
  GUIDE: 'plugin://onnx/guide',
} as const;

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

function selectPromptTemplate(query: string, intent: string, prompts: OnnxPromptTemplate[]) {
  const tokens = normalizeQuery(`${query} ${intent}`);
  const matches = prompts.map((prompt) => {
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
    return { prompt, score };
  });

  const sorted = matches.sort((a, b) => b.score - a.score);
  return sorted[0]?.prompt || prompts[0];
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
  return filterOnnxModels(models, options)[0];
}

export const onnxToolHandlers = {
  [OnnxTools.SEARCH_QUERY]: async (args: { query: string; topK?: number; requireGpu?: boolean; provider?: string; indexName?: string }) => {
    const { query, topK = 5, requireGpu = false, provider, indexName } = args;
    const { entries, models } = getOnnxIndex(indexName);
    const tokens = normalizeQuery(query);
    const scored = entries
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
      results: scored,
      count: scored.length,
      recommendedModel: recommendedModel ? {
        id: recommendedModel.id,
        path: recommendedModel.path,
        task: recommendedModel.task,
        gpu: recommendedModel.gpu,
        providers: recommendedModel.providers,
      } : null,
    };
  },

  [OnnxTools.PROMPT_SELECT]: async (args: { query: string; intent?: string; indexName?: string }) => {
    const { query, intent = 'search', indexName } = args;
    const { prompts } = getOnnxIndex(indexName);
    const prompt = selectPromptTemplate(query, intent, prompts);

    return {
      selectedPrompt: prompt.name,
      template: prompt.template,
      description: prompt.description,
      category: prompt.category,
      indexName: indexName || getActiveOnnxIndexName(),
    };
  },

  [OnnxTools.INDEX_LIST]: async () => {
    return {
      indices: listOnnxIndices(),
      activeIndex: getActiveOnnxIndexName(),
    };
  },

  [OnnxTools.INDEX_USE]: async (args: { name: string }) => {
    const { name } = args;
    const active = setActiveOnnxIndex(name);
    return {
      activeIndex: active,
    };
  },

  [OnnxTools.INDEX_GET_ACTIVE]: async () => {
    return {
      activeIndex: getActiveOnnxIndexName(),
    };
  },

  [OnnxTools.INDEX_LOAD]: async (args: { name: string; base64?: string; path?: string; storageKey?: string }) => {
    const { name, base64, path, storageKey } = args;
    return managerLoadOnnxIndex(name, { base64, path, storageKey });
  },

  [OnnxTools.INDEX_SAVE]: async (args: { name: string; path?: string; storageKey?: string }) => {
    const { name, path, storageKey } = args;
    return managerSaveOnnxIndex(name, { path, storageKey });
  },

  [OnnxTools.MODEL_LIST]: async (args: { task?: string; maxLatency?: number; requireGpu?: boolean; provider?: string; indexName?: string } = {}) => {
    const { models } = getOnnxIndex(args.indexName);
    return {
      models: filterOnnxModels(models, args),
      count: filterOnnxModels(models, args).length,
      indexName: args.indexName || getActiveOnnxIndexName(),
    };
  },

  [OnnxTools.MODEL_SELECT]: async (args: { task?: string; maxLatency?: number; requireGpu?: boolean; provider?: string; indexName?: string } = {}) => {
    const { models } = getOnnxIndex(args.indexName);
    const selected = selectOnnxModel(models, args);
    if (!selected) {
      return { selectedModel: null, indexName: args.indexName || getActiveOnnxIndexName() };
    }
    return {
      selectedModel: {
        id: selected.id,
        path: selected.path,
        task: selected.task,
        batchSize: selected.batchSize,
        latency: selected.latency,
        gpu: selected.gpu,
        providers: selected.providers,
        tags: selected.tags,
      },
      indexName: args.indexName || getActiveOnnxIndexName(),
    };
  },

  [OnnxTools.MODEL_DESCRIBE]: async (args: { id: string; indexName?: string }) => {
    const { id, indexName } = args;
    const { models, mappings } = getOnnxIndex(indexName);
    const model = models.find((item) => item.id === id);
    if (!model) {
      return { error: `Model not found: ${id}` };
    }
    return {
      model,
      mapping: mappings.find((item) => item.model === model.id) ?? null,
      indexName: indexName || getActiveOnnxIndexName(),
    };
  },

  [OnnxTools.INDEX_DESCRIBE]: async (args: { indexName?: string } = {}) => {
    return getOnnxIndexInfo(args.indexName);
  },
} as const satisfies Record<string, (args: any) => Promise<unknown>>;

export const onnxResourceHandlers = {
  [OnnxResources.INDEX]: async () => {
    const activeName = getActiveOnnxIndexName();
    const activeIndex = getOnnxIndex(activeName);
    const bytes = serializeOnnxIndex(activeIndex);
    if (typeof btoa !== 'undefined') {
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
    return Buffer.from(bytes).toString('base64');
  },

  [OnnxResources.CONTENT]: async () => {
    const { entries } = getOnnxIndex();
    return JSON.stringify(entries, null, 2);
  },

  [OnnxResources.PROMPTS]: async () => {
    const { prompts } = getOnnxIndex();
    return JSON.stringify(prompts, null, 2);
  },

  [OnnxResources.MODELS]: async () => {
    const { models } = getOnnxIndex();
    return JSON.stringify(models, null, 2);
  },

  [OnnxResources.MAPPINGS]: async () => {
    const { mappings } = getOnnxIndex();
    return JSON.stringify(mappings, null, 2);
  },

  [OnnxResources.INDICES]: async () => {
    return JSON.stringify(listOnnxIndices(), null, 2);
  },

  [OnnxResources.ACTIVE_INDEX]: async () => {
    return JSON.stringify({ activeIndex: getActiveOnnxIndexName() });
  },

  [OnnxResources.GUIDE]: async () => {
    return `# ONNX Search Plugin

This plugin provides a FlatBuffer-backed search index for ONNX content and prompt templates. Use the following tools and resources via MCP:

- \`onnx.search.query\` to retrieve ranked knowledge results.
- \`onnx.prompt.select\` to choose a prompt template for a query.
- \`onnx.model.list\` to inspect available ONNX models and runtime metadata.
- \`onnx.model.select\` to choose the best model for a task and deployment profile.
- \`onnx.index.list\` to see all loaded indices and the currently active index.
- \`onnx.index.use\` to switch which ONNX index is active.
- \`onnx.index.load\` and \`onnx.index.save\` to persist index payloads in Node or browser storage.
- \`plugin://onnx/index\` to inspect the binary index payload.
- \`plugin://onnx/indices\` and \`plugin://onnx/active-index\` to inspect index registration state.
- \`plugin://onnx/content\`, \`plugin://onnx/prompts\`, \`plugin://onnx/models\`, and \`plugin://onnx/mappings\` for the underlying data.

Build-time generation keeps the runtime index compact and deterministic.
`;
  },
} as const satisfies Record<string, () => Promise<string>>;
