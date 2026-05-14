# @ux3/plugin-websearch

Web search plugin for UX3 with Brave provider support and generic search tools.

## Features

- Web search queries with provider abstraction
- Page content fetching and rendering support
- Result summarization tools for search content
- Provider discovery and schema inspection
- MCP-ready search tool integration

## Installation

```bash
npm install @ux3/plugin-websearch
```

## Basic Usage

```ts
import WebsearchPlugin from '@ux3/plugin-websearch';

const app = initializeApp({
  plugins: [WebsearchPlugin],
});
```

## Plugin Usage

- Register the plugin in your UX3 app.
- Use MCP tool calls to execute searches and fetch pages.
- Configure provider API keys and endpoints through environment variables.

## API

- `websearch.query` — run a web search.
- `websearch.page.fetch` — fetch rendered page content.
- `websearch.summarize` — summarize search or page results.
- `websearch.queryProviders` — list supported providers.

## Example

```ts
const searchResult = await app.services.mcp.executeTool('websearch.query', {
  query: 'UX3 plugin architecture',
  count: 5,
});

console.log(searchResult);

const page = await app.services.mcp.executeTool('websearch.page.fetch', {
  url: 'https://ux3.org',
  render: 'text',
});

console.log(page);
```

## Notes

- Use the plugin alongside `@ux3/plugin-mcp` for MCP tool invocation.
- Ensure provider credentials are configured securely.
