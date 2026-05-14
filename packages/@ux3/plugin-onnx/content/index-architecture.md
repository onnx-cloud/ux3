# FlatBuffer RAG Index Architecture

The FlatBuffer RAG index stores content metadata and prompt templates in a compact binary layout.

Build-time index generation keeps runtime lookup fast and deterministic, while the plugin exposes the index as an MCP resource for agents and tools.
