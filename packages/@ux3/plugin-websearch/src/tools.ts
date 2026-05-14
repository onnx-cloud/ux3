import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';

export interface WebsearchQueryArgs {
  query: string;
  provider?: string;
  count?: number;
  locale?: string;
  safeSearch?: 'off' | 'moderate' | 'strict';
  browserHints?: Record<string, unknown>;
}

export interface WebsearchPageFetchArgs {
  url: string;
  provider?: string;
  render?: 'text' | 'html' | 'screenshot';
  maxChars?: number;
}

export interface WebsearchSummarizeArgs {
  inputs: Array<{ url: string; content?: string }>;
  format?: 'text' | 'bullets' | 'json';
}

export const Websearch = {
  QUERY: 'websearch.query',
  PAGE_FETCH: 'websearch.page.fetch',
  SUMMARIZE: 'websearch.summarize',
  QUERY_PROVIDERS: 'websearch.queryProviders',
} as const;

export const WebsearchResources = {
  DOCS: 'plugin://websearch/docs',
  SCHEMA: 'plugin://websearch/schema',
  PROVIDERS: 'plugin://websearch/providers',
} as const;

const DEFAULT_BRAVE_ENDPOINT = 'https://search.brave.com/api/v1/search';

function getSearchProviderConfig(provider?: string) {
  const normalized = (provider || process.env.WEBSEARCH_PROVIDER || 'brave').trim().toLowerCase();
  const braveEndpoint = process.env.BRAVE_SEARCH_ENDPOINT || DEFAULT_BRAVE_ENDPOINT;
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || '';

  return {
    provider: normalized,
    brave: {
      endpoint: braveEndpoint,
      apiKey: braveApiKey,
    },
  };
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Websearch provider request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function searchBrave(args: WebsearchQueryArgs) {
  const cfg = getSearchProviderConfig(args.provider);
  const endpoint = cfg.brave.endpoint;
  const url = new URL(endpoint);
  url.searchParams.set('q', args.query);
  url.searchParams.set('count', String(args.count || 5));
  if (args.locale) url.searchParams.set('locale', args.locale);
  if (args.safeSearch) url.searchParams.set('safeSearch', args.safeSearch);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (cfg.brave.apiKey) {
    headers.Authorization = `Bearer ${cfg.brave.apiKey}`;
  }

  const data = await fetchJson(url.toString(), { headers });
  const results = Array.isArray(data?.results)
    ? data.results.map((item: any, index: number) => ({
        title: item.title ?? item.name ?? '',
        snippet: item.snippet ?? item.description ?? item.excerpt ?? '',
        url: item.url ?? item.link ?? item.target ?? '',
        source: item.source ?? 'brave',
        rank: item.rank ?? index + 1,
        metadata: item.metadata ?? item,
      }))
    : [];

  return {
    query: args.query,
    provider: 'brave',
    results,
    providerMetadata: {
      provider: 'brave',
      raw: data,
    },
  };
}

async function fetchPageContent(args: WebsearchPageFetchArgs) {
  const response = await fetch(args.url, { redirect: 'follow' });
  const text = await response.text();
  const content = args.render === 'html' ? text : text.replace(/<[^>]+>/g, ' ');
  const payload: Record<string, unknown> = {
    url: response.url,
    content: args.render === 'html' ? undefined : content.slice(0, args.maxChars ?? 2000),
    html: args.render === 'html' ? content.slice(0, args.maxChars ?? 2000) : undefined,
    screenshot: args.render === 'screenshot' ? null : undefined,
    metadata: {
      status: response.status,
      finalUrl: response.url,
      contentLength: text.length,
    },
  };
  if (args.render === 'screenshot') {
    payload.screenshot = null;
  }
  return payload;
}

function summarizeContent(args: WebsearchSummarizeArgs) {
  const summaries = args.inputs.map((input) => {
    const source = input.content || '';
    const normalized = source.trim().replace(/\s+/g, ' ');
    const snippet = normalized.slice(0, 300);
    const summaryText = normalized.length > 300 ? `${snippet.trim()}...` : snippet;
    return {
      url: input.url,
      summary: summaryText || `No content available for ${input.url}`,
      highlights: [summaryText],
      json: args.format === 'json' ? { summary: summaryText, url: input.url } : undefined,
    };
  });

  return { summaries };
}

export const websearchToolHandlers = {
  [Websearch.QUERY]: async (args: WebsearchQueryArgs) => {
    return await searchBrave(args);
  },
  [Websearch.PAGE_FETCH]: async (args: WebsearchPageFetchArgs) => {
    return await fetchPageContent(args);
  },
  [Websearch.SUMMARIZE]: async (args: WebsearchSummarizeArgs) => {
    return summarizeContent(args);
  },
  [Websearch.QUERY_PROVIDERS]: async () => ({
    providers: [
      {
        name: 'brave',
        displayName: 'Brave Search',
        capabilities: ['search', 'page.fetch', 'summarize'],
        config: {
          endpoint: 'string',
          apiKeyEnv: 'BRAVE_SEARCH_API_KEY',
        },
      },
    ],
  }),
} as const satisfies Record<string, (args: any) => Promise<unknown>>;

export const websearchResourceHandlers = {
  [WebsearchResources.DOCS]: async () => {
    return `# Web Search Plugin\n\nUse the following tools to query the web, fetch page content, and summarize search results. Configure Brave search via \`BRAVE_SEARCH_API_KEY\` or by setting \`BRAVE_SEARCH_ENDPOINT\`.\n\nTools:\n- \`websearch.query\`\n- \`websearch.page.fetch\`\n- \`websearch.summarize\`\n- \`websearch.queryProviders\``;
  },
  [WebsearchResources.SCHEMA]: async () => {
    return JSON.stringify({
      tools: ['websearch.query', 'websearch.page.fetch', 'websearch.summarize', 'websearch.queryProviders'],
    }, null, 2);
  },
  [WebsearchResources.PROVIDERS]: async () => {
    return JSON.stringify([
      { name: 'brave', displayName: 'Brave Search', capabilities: ['search', 'page.fetch', 'summarize'] },
    ], null, 2);
  },
} as const satisfies Record<string, () => Promise<string>>;
