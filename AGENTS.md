# Agent Configuration and Standards

This document provides a high-level, industry-standard reference for agent configuration and semantics in UX3.

## Purpose

Agents are the runtime endpoints that drive autonomous interactions and tool orchestration in UX3-powered applications. They are configured by plugin manifests and service metadata, and they should be designed to be:

- explicit and discoverable
- safe and bounded
- composable across plugins
- reusable by UI and model-assisted workflows

## Recommended agent metadata

A standard agent configuration should include:

- `name`: stable identifier for the agent
- `description`: human-readable summary of agent purpose
- `client`: default client type or environment (`browser`, `server`, `dev`, etc.)
- `servers`: list of backend endpoints or MCP servers that implement the agent
- `defaultMode`: preferred operating mode (`queue`, `interactive`, `stream`, etc.)
- `capabilities`: list of key abilities or tool groups exposed to the agent
- `prompt`: optional system prompt or instruction payload

Example:

```yaml
agents:
  default:
    client: browser
    servers: [dev]
    defaultMode: queue
    description: "Lightweight UX3 agent for tool-driven workflows."
    capabilities: ["search", "dialog", "plugin-invoke"]
```

## Naming and semantics

- Use short, descriptive names (`default`, `assistant`, `planner`).
- Treat `client` as the interface environment rather than a capability name.
- Keep `servers` explicit so runtime configuration can select available backends.
- Prefer `description` for developer-facing docs; use `prompt` for runtime instructions.

## Best practices

- Keep agents narrowly scoped to a clear purpose.
- Avoid embedding large application logic into agent prompts.
- Use plugin-provided tools and MCP contracts for actual execution.
- Document the agent in plugin configuration and in higher-level docs when it is intended for reuse.

## Safety and governance

- Validate agent configuration at startup.
- Expose only supported tools and server endpoints.
- Use explicit defaults for behavior rather than relying on implicit fallback.
- Keep operational modes (`queue`, `interactive`) clearly defined and documented.
