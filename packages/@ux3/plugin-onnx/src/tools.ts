import type { OnnxContentEntry, OnnxPromptTemplate } from './flatbuffer-parser.js';
import { loadOnnxIndex } from './onnx-index.js';

export const OnnxTools = {
  SEARCH_QUERY: 'onnx.search.query',
  PROMPT_SELECT: 'onnx.prompt.select',
  INDEX_DESCRIBE: 'onnx.index.describe',
} as const;

export const OnnxResources = {
  INDEX: 'plugin://onnx/index',
  CONTENT: 'plugin://onnx/content',
  PROMPTS: 'plugin://onnx/prompts',
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

export const onnxToolHandlers = {
  [OnnxTools.SEARCH_QUERY]: async (args: { query: string; topK?: number }) => {
    const { query, topK = 5 } = args;
    const { entries } = loadOnnxIndex();
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

    return { query, results: scored, count: scored.length };
  },

  [OnnxTools.PROMPT_SELECT]: async (args: { query: string; intent?: string }) => {
    const { query, intent = 'search' } = args;
    const { prompts } = loadOnnxIndex();
    const prompt = selectPromptTemplate(query, intent, prompts);

    return {
      selectedPrompt: prompt.name,
      template: prompt.template,
      description: prompt.description,
      category: prompt.category,
    };
  },

  [OnnxTools.INDEX_DESCRIBE]: async () => {
    const { entries, prompts } = loadOnnxIndex();
    return {
      contentCount: entries.length,
      promptCount: prompts.length,
      contentIds: entries.map((entry) => entry.id),
      promptNames: prompts.map((prompt) => prompt.name),
    };
  },
} as const satisfies Record<string, (args: any) => Promise<unknown>>;

export const onnxResourceHandlers = {
  [OnnxResources.INDEX]: async () => {
    const { ONNX_INDEX_BASE64 } = await import('./built-index.js');
    return ONNX_INDEX_BASE64;
  },

  [OnnxResources.CONTENT]: async () => {
    const { entries } = loadOnnxIndex();
    return JSON.stringify(entries, null, 2);
  },

  [OnnxResources.PROMPTS]: async () => {
    const { prompts } = loadOnnxIndex();
    return JSON.stringify(prompts, null, 2);
  },

  [OnnxResources.GUIDE]: async () => {
    return `# ONNX Search Plugin

This plugin provides a FlatBuffer-backed search index for ONNX content and prompt templates. Use the following tools and resources via MCP:

- \`onnx.search.query\` to retrieve ranked knowledge results.
- \`onnx.prompt.select\` to choose a prompt template for a query.
- \`plugin://onnx/index\` to inspect the binary index payload.
- \`plugin://onnx/content\` and \`plugin://onnx/prompts\` for the underlying corpus.

Build-time generation keeps the runtime index compact and deterministic.
`;
  },
} as const satisfies Record<string, () => Promise<string>>;
