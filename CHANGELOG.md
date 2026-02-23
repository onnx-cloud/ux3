# Changelog

All notable changes to UX3 will be documented in this file.

## [0.1.0] - 2026-02-04

### Added

#### @ux3/core
- Universal Widget primitive (~150 LOC base class)
- Config-based widget system
- Widget state management
- Event system
- Compiler for config → optimized artifacts
- Runtime integration (Alpine.js + HTMX glue)
- HTTP client with RPC/REST auto-detection
- TypeScript support with generated definitions

#### @ux3/cli
- `ux3 create` - Project scaffolding
- `ux3 dev` - Development server (placeholder)
- `ux3 build` - Production build (placeholder)
- `ux3 check` - Project health checks

#### @ux3/stdlib
- **Primitives**: Button, Input, Select, Checkbox
- **Compositions**: Modal, Dropdown, Card, Table
- **Layouts**: Stack, Grid, Sidebar
- Design token system (colors, spacing, typography)
- Variant system for flexible styling
- A11y support across all widgets

#### @ux3/router
- SPA router with pattern matching
- Route guards (`beforeEnter`)
- Lazy loading support
- Browser history integration
- Route parameters and query strings

#### @ux3/forms
- Form validation system
- Field-level and form-level validation
- Custom validation rules
- Form submission handling
- Error state management

#### @ux3/store
- Reactive store (Pinia/Zustand inspired)
- Mutations and actions
- Subscriber pattern
- State snapshots

### Initial Release
- Monorepo structure with pnpm workspaces
- TypeScript configuration
- ESLint setup
- Vitest test runner
- Complete Phase 1-3 implementation
