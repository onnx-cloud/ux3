# @ux3/plugin-onnx

ONNX Search is a UX3 plugin that exposes an ONNX knowledge corpus and FlatBuffer search index through MCP tools and resources.

This plugin supports:

- Build-time FlatBuffer index generation from ONNX content and prompt metadata
- Runtime search queries over the prebuilt index
- Prompt template selection for ONNX-guided responses
- Binary index distribution via `plugin://onnx/index`

## Development

- `npm run build-index` — regenerate the FlatBuffer index data
- `npm run build` — compile the plugin package sources
