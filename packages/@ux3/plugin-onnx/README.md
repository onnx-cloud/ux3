# @ux3/plugin-onnx

ONNX knowledge and FlatBuffer search plugin for UX3.

## Features

- ONNX knowledge corpus search
- FlatBuffer-powered runtime index lookup
- Prompt metadata and query tools
- Named index discovery and selection
- Index distribution and registry inspection

## Installation

```bash
npm install @ux3/plugin-onnx
```

## Basic Usage

```ts
import OnnxPlugin from '@ux3/plugin-onnx';

const app = initializeApp({
  plugins: [OnnxPlugin],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Use `app.services.onnx` or `app.utils.onnx` to access the local service.
- Use the built-in MCP tools when the plugin is installed into an MCP-enabled app.

## API

- `app.services.onnx.search(query, options?)` — search the ONNX index.
- `app.services.onnx.selectPrompt(query, intent?)` — select a prompt template.
- `app.services.onnx.listModels(options?)` — list eligible ONNX models.
- `app.services.onnx.describeModel(id)` — describe a model and mapping profile.
- `app.services.onnx.listIndices()` — list loaded indices.
- `app.services.onnx.useIndex(name)` — switch the active index.
- MCP tools: `onnx.search.query`, `onnx.prompt.select`, `onnx.model.list`, `onnx.model.describe`, `onnx.index.list`, `onnx.index.use`.

## Example

```ts
const result = await app.services.onnx.search('image classification', { topK: 5 });
console.log(result.results);

const prompt = await app.services.onnx.selectPrompt('classify this model', 'classification');
console.log(prompt.template);
```

## Notes

- This plugin exposes both local service APIs and MCP tools for broader integration.
- Use `app.utils.onnx` when you need a globally available ONNX helper.
