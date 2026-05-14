# @ux3/plugin-mcp

MCP client + dev server proxy for UX3.

## Features

- Client-side MCP tool invocation
- Development proxy for local MCP servers
- HTTP and command-based MCP transport
- Tool call context propagation and request tracing
- Configurable environment and headers

## Installation

```bash
npm install @ux3/plugin-mcp
```

## Basic Usage

```ts
import McpPlugin from '@ux3/plugin-mcp';

const app = initializeApp({
  plugins: [McpPlugin],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure MCP servers, agents, and clients in plugin config.
- Access `app.services.mcp` or `app.utils.mcp` for runtime calls.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-mcp'
    config:
      mcpServers:
        dev:
          type: dev
          url: 'http://localhost:3000/mcp'
      agents:
        default:
          client: 'browser'
          servers: ['dev']
```

## API

- `app.services.mcp.executeTool(name, args, server?)` — call an MCP tool by name.
- `app.services.mcp.listServers()` — list configured MCP servers.
- `app.services.mcp.listAgents()` — list configured agents.
- `app.services.mcp.createSession(agentName, options?)` — create an agent session.
- `app.utils.mcp` is also available for the same service API.

## Example

```ts
const response = await app.services.mcp.executeTool('search.query', { query: 'UX3 plugin docs' }, 'dev');
console.log(response);

const session = app.services.mcp.createSession('default', { mode: 'chat' });
const turn = await session.send({ role: 'user', content: 'Hello agent' });
console.log(turn);
```

## Notes

- The plugin installs both `app.services.mcp` and `app.utils.mcp`.
- Use dev mode for local development and HTTP/command transport for production.
