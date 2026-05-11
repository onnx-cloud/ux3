import type { PrimitiveDefinition } from './types.js';

/**
 * Stateless layout primitives — CSS-only custom elements.
 * No class implementation needed; registered as UxRegion extensions.
 */
export const regionPrimitives: PrimitiveDefinition[] = [
  { tag: 'ux-app-shell', role: 'application', kind: 'region' },
  { tag: 'ux-topbar', role: 'banner', kind: 'region' },
  { tag: 'ux-sidebar', role: 'navigation', kind: 'region' },
  { tag: 'ux-content', role: 'region', kind: 'region' },
  { tag: 'ux-tab-panel', role: 'tabpanel', kind: 'region' },
  { tag: 'ux-tab', role: 'tab', kind: 'toggle', stateAttr: 'selected' },
  { tag: 'ux-menu-item', role: 'menuitem', kind: 'toggle', stateAttr: 'selected' },
  { tag: 'ux-card-icon', role: 'img', kind: 'region' },
  { tag: 'ux-surface', role: 'region', kind: 'region' },
  { tag: 'ux-divider', role: 'separator', kind: 'region' },
  { tag: 'ux-stack', kind: 'region' },
  { tag: 'ux-inline', kind: 'region' },
  { tag: 'ux-grid', kind: 'region' },
  { tag: 'ux-hero', role: 'region', kind: 'region' },
  { tag: 'ux-article', role: 'article', kind: 'region' },
  { tag: 'ux-list', role: 'list', kind: 'region' },
  { tag: 'ux-description-list', role: 'list', kind: 'region' },
  { tag: 'ux-dl', role: 'list', kind: 'region' },
  { tag: 'ux-search-input', role: 'searchbox', kind: 'input' },
  { tag: 'ux-search-tags', role: 'list', kind: 'region' },
  { tag: 'ux-search-results', role: 'list', kind: 'region' },
  { tag: 'ux-form-errors', role: 'alert', kind: 'region' },
  { tag: 'ux-chat-messenger', role: 'log', kind: 'region' },
  { tag: 'ux-chat-thread-list', role: 'list', kind: 'region' },
  { tag: 'ux-chat-bubble', role: 'article', kind: 'region' },
  { tag: 'ux-chat-composer', role: 'form', kind: 'form' },
  { tag: 'ux-chat-roster', role: 'list', kind: 'region' },
  { tag: 'ux-hover-panel', role: 'dialog', kind: 'tooltip', stateAttr: 'open' },
  { tag: 'ux-icon-button', role: 'button', kind: 'toggle', stateAttr: 'pressed' },
  { tag: 'ux-chart-line-legend', role: 'list', kind: 'region' },
];
