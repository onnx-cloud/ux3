# @ux3/plugin-agentic

FSM-driven agentic plan execution engine for UX3

## Features

- Agentic plan orchestration for UX3 workflows
- Pattern-based execution with reusable plan templates
- Observable plan state, step history, and diagnostics
- Kanban and flow UI components for interactive plan review
- Extensible pattern resolver for custom agent workflows

## Installation

```bash
npm install @ux3/plugin-agentic
```

## Basic Usage

```ts
import PluginAgentic from '@ux3/plugin-agentic';

const app = initializeApp({
  plugins: [PluginAgentic],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

This plugin is typically configured through the UX3 plugin registry under `app.config.plugins`.

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginAgentic from '@ux3/plugin-agentic';

const app = initializeApp({
  plugins: [PluginAgentic],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
