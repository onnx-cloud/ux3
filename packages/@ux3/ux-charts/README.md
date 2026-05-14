# @ux3/ux-charts

Chart.js integration for UX3.

## Features

- Lightweight Chart.js plugin for UX3
- Registers `<ux-chart-line>`, `<ux-chart-bar>`, and `<ux-chart-donut>` elements
- Exposes chart creation service and CDN configuration
- Supports runtime chart rendering from UX3 templates

## Installation

```bash
npm install @ux3/ux-charts
```

## Basic Usage

```ts
import ChartJsPlugin from '@ux3/ux-charts';

const app = initializeApp({
  plugins: [ChartJsPlugin],
});
```

## Plugin Usage

- Use `<ux-chart-line>`, `<ux-chart-bar>`, or `<ux-chart-donut>` in templates.
- Access `app.services.chart.create(el, config)` to build charts manually.
- Inspect `app.utils.chart.cdn` for the configured Chart.js CDN URL.

## Configuration

```yaml
plugins:
  - name: '@ux3/ux-charts'
    config:
      cdn: 'https://cdn.jsdelivr.net/npm/chart.js'
```

## API

- `app.services.chart.create(el, config)` — create a Chart.js chart in the target element.
- `app.utils.chart.cdn` — configured CDN URL for Chart.js.
- `UxChart` — exported custom element base class.

## Example

```ts
const chart = await app.services.chart.create('#chartCanvas', {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{ label: 'Sales', data: [10, 20, 15] }],
  },
});
```

## Notes

- The plugin loads Chart.js from CDN by default, but can also use a locally bundled version.
- Custom element registration is idempotent, so the plugin is safe to install multiple times.
