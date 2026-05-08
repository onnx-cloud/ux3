# Templates and Styling

## Templates

- Keep HTML templates adjacent to widget YAML files.
- Bind UI to FSM context (`ctx`) and events.
- Keep templates declarative; avoid imperative DOM mutation.

## Styling Model

- Styles are defined under `ux/style/**`.
- Tokens are defined under `ux/token/**`.
- Widgets reference style compositions via `ux-style`.

## Best Practices

- Reuse tokens instead of hard-coded values.
- Keep style names semantic (intent-based) rather than visual-only.
- Avoid global CSS drift; prefer widget-scoped compositions.

## Tailwind/Utility Usage

Utility classes can be integrated, but design tokens and `ux-style` should remain the source of truth for consistency and theming.
