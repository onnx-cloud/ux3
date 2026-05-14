# @ux3/plugin-mcp-dev

Developer MCP tooling plugin for UX3, exposing build-time project inspection and developer workflows over MCP.

## Features

- MCP tool call client for UX3
- Dev server proxy mode for local testing
- HTTP and command-based MCP transport
- Request tracing and context propagation
- Configurable headers, env, and endpoints

## Installation

```bash
npm install @ux3/plugin-mcp-dev
```

## Basic Usage

```ts
import PluginMcpDev from '@ux3/plugin-mcp-dev';

const app = initializeApp({
  plugins: [PluginMcpDev],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-mcp-dev'
    config:
      # Plugin-specific options
      
```

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginMcpDev from '@ux3/plugin-mcp-dev';

const app = initializeApp({
  plugins: [PluginMcpDev],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
