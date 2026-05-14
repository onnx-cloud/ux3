# @ux3/ux-data-builders

Unified data manipulation widgets for UX3.

## Features

- Pivot table, filter builder, query builder, and report builder widgets
- Declarative interactive data exploration tools
- UX3-compatible data manipulation components

## Installation

```bash
npm install @ux3/ux-data-builders
```

## Basic Usage

```ts
import DataBuildersPlugin from '@ux3/ux-data-builders';

const app = initializeApp({
  plugins: [DataBuildersPlugin],
});
```

## Plugin Usage

- Use `<ux-pivot-table>`, `<ux-filter-builder>`, `<ux-query-builder>`, and `<ux-report-builder>` in templates.
- Wire data and configuration through your UX3 app state.

## API

- `UxPivotTable`, `UxFilterBuilder`, `UxQueryBuilder`, `UxReportBuilder` — exported widget classes.

## Example

```html
<ux-filter-builder></ux-filter-builder>
<ux-pivot-table></ux-pivot-table>
```

## Notes

- These widgets are designed for interactive BI-style user interfaces.
