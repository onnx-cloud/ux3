# @ux3/plugin-websearch

A UX3 plugin that exposes web search and page extraction tools for MCP/LLM orchestration.

## Features

- `websearch.query` — search the web via Brave or another configured provider
- `websearch.page.fetch` — fetch page content from a URL
- `websearch.summarize` — summarize page text or search results
- `websearch.queryProviders` — discover supported providers

## Configuration

Set environment variables for Brave search:

- `BRAVE_SEARCH_ENDPOINT`
- `BRAVE_SEARCH_API_KEY`

## Usage

Register the plugin in your UX3 app and invoke the tools via MCP.

Example `config.plugins` entry:

```js
export const config = {
  plugins: [
    '@ux3/plugin-websearch',
  ],
};
```

Then call the MCP tools from your agent or runtime.
