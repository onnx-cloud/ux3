# @ux3/ux-cytoscape

Cytoscape.js graph visualization for UX3.

## Features

- Registers `<ux-graph>` custom element for graph rendering
- Loads Cytoscape.js from CDN or bundled sources
- Provides graph service helpers for create/layout operations
- Supports client-side graph visualization in UX3 apps

## Installation

```bash
npm install @ux3/ux-cytoscape
```

## Basic Usage

```ts
import CytoscapePlugin from '@ux3/ux-cytoscape';

const app = initializeApp({
  plugins: [CytoscapePlugin],
});
```

## Plugin Usage

- Use `<ux-graph>` in templates for declarative graph rendering.
- Call `app.services.graph.create(el, options)` to instantiate graphs programmatically.
- Use `app.services.graph.layout(graph, name, options)` to run Cytoscape layouts.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-cytoscape'
    config:
      cdn: 'https://unpkg.com/cytoscape@3.29.2/dist/cytoscape.min.js'
      bundled: true
      layout: 'cose'
```

## API

- `app.services.graph.create(el, options)` — create a Cytoscape graph.
- `app.services.graph.layout(graph, name, options)` — apply a layout to an existing graph.
- `app.utils.cytoscape.cdn` — configured Cytoscape CDN URL.
- `UxGraph` — exported custom element class.

## Example

```ts
const graph = app.services.graph.create(document.querySelector('#graph'), {
  elements: [
    { data: { id: 'a' } },
    { data: { id: 'b' } },
    { data: { id: 'ab', source: 'a', target: 'b' } },
  ],
});

app.services.graph.layout(graph, 'grid', { rows: 1 });
```

## Notes

- Leaflet-style graph visualization requires the Cytoscape runtime to be loaded.
- The plugin attempts to load Cytoscape from CDN automatically when installed.
