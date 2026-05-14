# @ux3/plugin-i18n

Internationalization plugin for UX3 with locale management, namespace loading, and remote translation support.

## Features

- Locale activation and runtime locale switching
- Translation namespace loading
- Build-time translation scaffolding
- Markdown and UI localization support
- Optional remote translation endpoints

## Installation

```bash
npm install @ux3/plugin-i18n
```

## Basic Usage

```ts
import I18nPlugin from '@ux3/plugin-i18n';

const app = initializeApp({
  plugins: [I18nPlugin],
});
```

## Plugin Usage

- Register the plugin with the UX3 plugin registry.
- Provide `locale` and `namespaces` in plugin configuration.
- Use `app.utils.pluralise` for localized plural formatting.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-i18n'
    config:
      locale: en
      namespaces:
        ui: '/i18n/ui.json'
        errors: '/i18n/errors.json'
```

## API

- `app.utils.pluralise(key, count)` — localize plural forms using current locale rules.
- `app.i18n(key, props?)` — existing UX3 i18n lookup with injected namespaces.

## Example

```ts
const greeting = app.i18n('welcome.message', { name: 'Sara' });
const itemLabel = app.utils.pluralise('item.count', 3);

console.log(greeting, itemLabel);
```

## Notes

- Remote namespaces are fetched asynchronously and merged into the translation loader.
- Use environment variables for external endpoint configuration.
