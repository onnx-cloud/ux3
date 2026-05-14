# @ux3/ux-icons

Iconify/Lucide integration for UX3.

## Features

- `<ux-icon>` custom element for SVG icons
- Local caching and bundled rendering options
- Default collection and auto-replace support
- Utility API exposed via `app.utils.icones`

## Installation

```bash
npm install @ux3/ux-icons
```

## Basic Usage

```ts
import IconPlugin from '@ux3/ux-icons';

const app = initializeApp({
  plugins: [IconPlugin],
});
```

## Plugin Usage

- Use `<ux-icon name="lucide:camera"></ux-icon>` in templates.
- Use the `i ux-icon="name"` shorthand if `autoReplace` is enabled.
- Access `app.utils.icones` and `app.services.icones` for icon rendering helpers.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-icons'
    config:
      defaultCollection: 'lucide'
      cached: true
      bundled: true
      autoReplace: true
```

## API

- `app.utils.icones.icon(name)` — render an icon placeholder or element.
- `app.services.icones` — icon service entrypoint.

## Example

```html
<ux-icon name="lucide:alarm-clock"></ux-icon>
```

## Notes

- Icon payloads are cached in local storage when enabled.
- The plugin auto-replaces inline icon placeholders by default.
