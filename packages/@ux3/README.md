# @ux3 Packages

This directory contains UX3 plugins, UI integrations, tooling packages, and test utilities.
Each package is represented by its own folder and dedicated `README.md`.

## Package index

### Core plugins

- [`@ux3/plugin-agentic`](./plugin-agentic) — FSM-driven agentic plan execution engine for UX3
- [`@ux3/plugin-analytics`](./plugin-analytics) — Analytics event collection and telemetry support for UX3
- [`@ux3/plugin-browser`](./plugin-browser) — UX3 browser detection plugin - injects browser state, device info, preferences, connectivity
- [`@ux3/plugin-dev-tools`](./plugin-dev-tools) — Development tooling plugin for UX3 (inspector, diagnostics, event stream)
- [`@ux3/plugin-i18n`](./plugin-i18n) — Internationalization plugin for UX3: locale loading, translation namespaces, and i18n helpers
- [`@ux3/plugin-math`](./plugin-math) — Semantic math plugin for UX3 providing TeX-lite parsing and canonical math IR.
- [`@ux3/plugin-mcp`](./plugin-mcp) — MCP client + dev server proxy for UX3
- [`@ux3/plugin-mcp-dev`](./plugin-mcp-dev) — Developer MCP tooling plugin for UX3, exposing build-time project inspection and developer workflows over MCP.
- [`@ux3/plugin-oidc`](./plugin-oidc) — OIDC/OAuth2 plugin for UX3 with provider presets
- [`@ux3/plugin-onnx`](./plugin-onnx) — ONNX knowledge and FlatBuffer search plugin for UX3.
- [`@ux3/plugin-pdf`](./plugin-pdf) — PDF generator plugin for UX3 with MCP tool support.
- [`@ux3/plugin-perception`](./plugin-perception) — Speech and vision perception tools for MCP workflows
- [`@ux3/plugin-rdf`](./plugin-rdf) — RDF/SPARQL integration for UX3 — rdflib.js + CodeMirror
- [`@ux3/plugin-replay`](./plugin-replay) — Replay and session inspection plugin for UX3, built on top of plugin-store storage adapters.
- [`@ux3/plugin-store`](./plugin-store) — Storage plugin for UX3 with support for localStorage, IndexedDB, remote sync, and hybrid patterns
- [`@ux3/plugin-stripe`](./plugin-stripe) — Stripe payment integration for UX3 — PCI-compliant tokenization
- [`@ux3/plugin-telemetry`](./plugin-telemetry) — Runtime telemetry collection and provider integration
- [`@ux3/plugin-validation`](./plugin-validation) — Data validation utilities and rule support
- [`@ux3/plugin-webrtc`](./plugin-webrtc) — WebRTC video/audio calling for UX3 via SimplePeer
- [`@ux3/plugin-websearch`](./plugin-websearch) — Web search plugin for UX3 with Brave provider support and generic search abstraction.

### UX components and integrations

- [`@ux3/ux-charts`](./ux-charts) — Chart.js integration for UX3
- [`@ux3/ux-chat`](./ux-chat) — Chat UI widgets for UX3
- [`@ux3/ux-cytoscape`](./ux-cytoscape) — Cytoscape.js graph visualization for UX3
- [`@ux3/ux-dashboard`](./ux-dashboard) — Dashboard and visualization widgets for UX3
- [`@ux3/ux-data-builders`](./ux-data-builders) — Unified data manipulation widgets (pivot table, filters, queries, reports)
- [`@ux3/ux-diagrams`](./ux-diagrams) — Mermaid diagram renderer for UX3 markdown
- [`@ux3/ux-google-fonts`](./ux-google-fonts) — Google Fonts integration for UX3
- [`@ux3/ux-icons`](./ux-icons) — Icon package for UX3
- [`@ux3/ux-openmaps`](./ux-openmaps) — OpenStreetMap / Leaflet integration for UX3
- [`@ux3/ux-planning`](./ux-planning) — Unified planning & scheduling widgets (calendar, kanban, flow editor, gantt)
- [`@ux3/ux-primitives`](./ux-primitives) — Canonical UI primitives and widget runtime for UX3
- [`@ux3/ux-search-lunr`](./ux-search-lunr) — Full-text search using Lunr.js for UX3
- [`@ux3/ux-skeleton`](./ux-skeleton) — Scaffolding plugin for UX3 - generates projects, views, services, and other artifacts from templates
- [`@ux3/ux-tailwind`](./ux-tailwind) — Unified Tailwind CSS styling utilities and dynamic Plus widget registration

### Testing utilities

- [`@ux3/test-harness`](./test-harness) — Testing utilities and fixtures for UX3 Framework - FSM testing, mock services, view testing helpers

## Getting started

Install a package:

```bash
npm install @ux3/plugin-browser
```

Register a plugin in your UX3 app:

```ts
import BrowserPlugin from '@ux3/plugin-browser';

const app = initializeApp({
  plugins: [BrowserPlugin],
});
```

For UI integration packages, import the package and follow the package README for registration and usage details.

```ts
import { registerUxCharts } from '@ux3/ux-charts';
registerUxCharts(app);
```

## Notes

See each package README for package-specific installation guidance, configuration options, and API examples.
