# @ux3/ux-planning

Unified planning and scheduling widgets for UX3.

## Features

- Calendar, kanban, flow editor, and Gantt components
- Custom UX3 widgets for planning and task management
- Declarative view integration with UX3 state

## Installation

```bash
npm install @ux3/ux-planning
```

## Basic Usage

```ts
import PlanningPlugin from '@ux3/ux-planning';

const app = initializeApp({
  plugins: [PlanningPlugin],
});
```

## Plugin Usage

- Use `<ux-calendar>`, `<ux-kanban>`, `<ux-flow-editor>`, and `<ux-gantt>` in templates.
- Bind planning data via UX3 app state and services.

## API

- `UxCalendar`, `UxKanban`, `UxFlowEditor`, `UxGantt` — exported planning widget classes.

## Example

```html
<ux-calendar></ux-calendar>
<ux-kanban></ux-kanban>
```

## Notes

- This plugin provides UI widgets; data and actions are configured through UX3 services and state.
