# @ux3/ux-search-lunr

Full-text search using Lunr.js for UX3.

## Features

- Builds client-side Lunr search indexes
- Cached index persistence in localStorage
- Search service for UX3 apps
- Configurable CDN and cache settings

## Installation

```bash
npm install @ux3/ux-search-lunr
```

## Basic Usage

```ts
import SearchLunrPlugin from '@ux3/ux-search-lunr';

const app = initializeApp({
  plugins: [SearchLunrPlugin],
});
```

## Plugin Usage

- Use `app.services.search` to build and query the index.
- Configure `bundled`, `cached`, `cdn`, and `cacheKey` in plugin config.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-search-lunr'
    config:
      bundled: true
      cached: true
      cdn: 'https://unpkg.com/lunr/lunr.js'
      cacheKey: 'ux3:search:index'
```

## API

- `app.services.search.build(documents, fields)` — build the Lunr index.
- `app.services.search.search(query)` — execute a search query.
- `app.services.search.clearCache()` — clear cached index storage.

## Example

```ts
await app.services.search.build(
  [
    { id: '1', title: 'Hello world', body: 'UX3 search example' },
  ],
  ['title', 'body'],
);

const results = app.services.search.search('UX3');
console.log(results);
```

## Notes

- The plugin relies on Lunr.js and will load it from CDN if not already available.
- Cached index storage is optional but improves reload performance.
