# @ux3/ux-primitives

Canonical UI primitives and widget runtime for UX3.

## Features

- Low-level UX3 widget primitives and core component registry
- Reusable input, form, toggle, overlay, and control components
- Plugin installation for built-in primitive registration
- Programmatic widget registration and metadata utilities

## Installation

```bash
npm install @ux3/ux-primitives
```

## Basic Usage

```ts
import PrimitivesPlugin from '@ux3/ux-primitives';

const app = initializeApp({
  plugins: [PrimitivesPlugin],
});
```

## Plugin Usage

- Install the plugin to register core UX3 primitives.
- Use `registerBuiltInPrimitives(app)` to register primitives manually.
- Import widget classes directly for custom widget definitions.

## API

- `UxBase`, `UxRegion`, `UxControl`, `UxOverlay`, `UxToggle`, `UxForm`, `UxInput`, `UxTextarea`, `UxSelect`, `UxComboBox` — primitive component exports.
- `registerWidget`, `resolveWidgetMetadata`, `getRegisteredWidgets`, `clearWidgetRegistry` — widget registry utilities.
- `registerBuiltInPrimitives`, `installCoreWidgets` — runtime registration helpers.

## Example

```ts
import { UxInput, registerBuiltInPrimitives } from '@ux3/ux-primitives';

registerBuiltInPrimitives(app);
```

## Notes

- This package is the foundation for UX3 custom widgets and runtime primitives.
