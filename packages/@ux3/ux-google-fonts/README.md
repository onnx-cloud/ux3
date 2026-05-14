# @ux3/ux-google-fonts

Google Fonts integration for UX3.

## Features

- Runtime injection of Google Fonts stylesheet
- Configurable font families and display strategy
- Utility API for font family helpers
- Built-in app service for font metadata

## Installation

```bash
npm install @ux3/ux-google-fonts
```

## Basic Usage

```ts
import GoogleFontsPlugin from '@ux3/ux-google-fonts';

const app = initializeApp({
  plugins: [GoogleFontsPlugin],
});
```

## Plugin Usage

- Configure font families via plugin config.
- Access `app.utils.fonts` for font metadata and helper functions.
- Optionally use `app.services.fonts` when available.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-google-fonts'
    config:
      family:
        - 'Inter:400,500,700'
        - 'Roboto:400,500'
      display: 'swap'
      default: 'Inter'
```

## API

- `app.utils.fonts.families` — configured font families.
- `app.utils.fonts.default` — default font family.
- `app.utils.fonts.cssFamily(family)` — returns a safe CSS font-family string.

## Example

```ts
const fontFamily = app.utils.fonts.cssFamily('Inter');
document.body.style.fontFamily = fontFamily;
```

## Notes

- The plugin injects a Google Fonts `<link>` at runtime when families are configured.
- Use `display: 'swap'` to improve text rendering performance.
