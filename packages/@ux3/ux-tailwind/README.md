# @ux3/ux-tailwind

Tailwind CSS utility integration for UX3.

## Features

- Tailwind-compatible utility classes and design tokens
- Runtime class merge helpers
- Headless component style functions
- Tailwind Plus widget registration from official sources

## Installation

```bash
npm install @ux3/ux-tailwind
```

## Basic Usage

```ts
import TailwindPlugin from '@ux3/ux-tailwind';

const app = initializeApp({
  plugins: [TailwindPlugin],
});
```

## Plugin Usage

- Register the plugin in your UX3 app.
- Use `app.utils.tailwind` helpers for classes and theme tokens.
- Configure external Plus widgets via `config.widgets`.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-tailwind'
    config:
      css: '/styles/tailwind.css'
      widgets:
        - id: 'hero'
          source: 'https://tailwindcss.com/plus/hero'
          template: '<section>...</section>'
```

## API

- `app.utils.tailwind.mergeClasses(...classes)` — concatenate Tailwind class strings.
- `app.utils.tailwind.buttonClass(variant, size, additional)` — button class helper.
- `app.utils.tailwind.cardClass(padding, additional)` — card class helper.
- `app.utils.tailwind.badgeClass(color, additional)` — badge class helper.
- `app.utils.tailwind.alertClass(type, additional)` — alert class helper.
- `app.utils.tailwind.isOfficialTailwindPlusSource(url)` — validate Plus widget sources.
- `app.utils.tailwind.registerOfficialTailwindPlusWidgets(app, widgets)` — register Tailwind Plus widgets.

## Example

```ts
const classes = app.utils.tailwind.mergeClasses('p-4', app.utils.tailwind.buttonClass('primary'));
console.log(classes);
```

## Notes

- Tailwind Plus widget registration only accepts official Tailwind Plus sources.
- The plugin also supports injecting a configured Tailwind CSS asset.
