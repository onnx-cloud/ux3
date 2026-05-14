# @ux3/plugin-rdf

RDF/SPARQL integration for UX3 — rdflib.js + CodeMirror

## Features

- RDF loading and semantic query support
- SPARQL execution in UX3 contexts
- RDF result conversion to UX3 payloads
- CDN-configurable rdflib and editor assets

## Installation

```bash
npm install @ux3/plugin-rdf
```

## Basic Usage

```ts
import PluginRdf from '@ux3/plugin-rdf';

const app = initializeApp({
  plugins: [PluginRdf],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-rdf'
    config:
      # Plugin-specific options
      
```

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginRdf from '@ux3/plugin-rdf';

const app = initializeApp({
  plugins: [PluginRdf],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
