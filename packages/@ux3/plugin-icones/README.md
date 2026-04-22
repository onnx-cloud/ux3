# @ux3/plugin-icones

Icones/Iconify integration for UX3 with Lucide as the default icon collection.

## Features

- Default collection: `lucide`
- Native `<ux-icon>` custom element
- Adds utility API at `app.utils.icones`
- Adds `icones` service (`app.services.icones`)
- Converts `[ux-icon]` placeholders into `<ux-icon>` elements
- Local browser cache enabled by default (`cached: true`)
- Runtime in-memory bundle enabled by default (`bundled: true`)

## Install

```bash
npm install @ux3/plugin-icones
```

## Configure

```yaml
plugins:
  - name: '@ux3/plugin-icones'
    config:
      collections: ['lucide']
      bundled: true
      cached: true
```

## Usage

```ts
const html = app.utils.icones.icon('alarm-clock');
// => <ux-icon name="lucide:alarm-clock"></ux-icon>
```

With explicit collection:

```ts
const html = app.utils.icones.icon('mdi:account');
```

Template placeholder mode:

```html
<ux-icon name="lucide:align-justify"></ux-icon>

<i ux-icon="camera"></i>
<!-- becomes <ux-icon name="lucide:camera"></ux-icon> -->
```
