# @ux3/ux-dashboard

Dashboard and visualization widgets for UX3.

## Features

- Custom elements for dashboards, KPI boards, and workflow views
- UX3-native widget registration for analytics layouts
- Designed for responsive dashboards and reporting interfaces

## Installation

```bash
npm install @ux3/ux-dashboard
```

## Basic Usage

```ts
import DashboardPlugin from '@ux3/ux-dashboard';

const app = initializeApp({
  plugins: [DashboardPlugin],
});
```

## Plugin Usage

- Use `<ux-dashboard>`, `<ux-kpi-board>`, and `<ux-workflow>` in view templates.
- Combine with data services and charts for rich dashboards.

## API

- `UxDashboard`, `UxKpiBoard`, `UxWorkflow` — exported dashboard widget classes.

## Example

```html
<ux-dashboard>
  <ux-kpi-board></ux-kpi-board>
  <ux-workflow></ux-workflow>
</ux-dashboard>
```

## Notes

- This plugin is UI-focused and works best with data services from UX3.
