# @ux3/ux-openmaps

OpenStreetMap / Leaflet integration for UX3.

## Features

- Leaflet-based map rendering in UX3 views
- `<ux-map>` custom element for declarative maps
- `app.services.map.create` for programmatic map creation
- CDN configuration for Leaflet JS and CSS

## Installation

```bash
npm install @ux3/ux-openmaps
```

## Basic Usage

```ts
import OpenMapsPlugin from '@ux3/ux-openmaps';

const app = initializeApp({
  plugins: [OpenMapsPlugin],
});
```

## Plugin Usage

- Use `<ux-map lat="51.505" lng="-0.09" zoom="13"></ux-map>` in templates.
- Call `app.services.map.create(el, { center, zoom })` for manual map initialization.
- Access `app.utils.openmaps` for configured tile and CDN metadata.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-openmaps'
    config:
      cdn: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      tileProvider: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      tileAttribution: '© OpenStreetMap contributors'
      tileMaxZoom: 19
```

## API

- `app.services.map.create(el, opts)` — create a Leaflet map in the given element.
- `app.services.map.L` — raw Leaflet global when loaded.
- `app.utils.openmaps` — configured tile and CDN metadata.

## Example

```ts
const map = app.services.map.create(document.querySelector('#map'), {
  center: [48.8566, 2.3522],
  zoom: 12,
});
```

## Notes

- Leaflet JS and CSS are injected automatically via CDN.
- Use `bundled:true` when loading Leaflet from a local bundle instead.
