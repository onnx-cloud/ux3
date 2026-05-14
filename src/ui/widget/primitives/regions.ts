import type { PrimitiveDefinition } from './types.js';

export const regionPrimitives: PrimitiveDefinition[] = [
  // ── Canonical ux-region tag ──
  { tag: 'ux-region', role: 'region', kind: 'region', family: 'layout' },

  // ── Layout regions (compat aliases) ──
  { tag: 'ux-app-shell', role: 'application', kind: 'region', family: 'layout' },
  { tag: 'ux-topbar', role: 'banner', kind: 'region', family: 'layout' },
  { tag: 'ux-sidebar', role: 'navigation', kind: 'region', family: 'layout' },
  { tag: 'ux-content', role: 'region', kind: 'region', family: 'layout' },
  { tag: 'ux-tab', role: 'tabpanel', kind: 'region', family: 'layout' },
  { tag: 'ux-card-icon', role: 'img', kind: 'region', family: 'layout' },
  { tag: 'ux-surface', role: 'region', kind: 'region', family: 'layout' },
  { tag: 'ux-divider', role: 'separator', kind: 'region', family: 'layout' },
  { tag: 'ux-stack', kind: 'region', family: 'layout' },
  { tag: 'ux-inline', kind: 'region', family: 'layout' },
  { tag: 'ux-grid', kind: 'region', family: 'layout' },
  { tag: 'ux-hero', role: 'region', kind: 'region', family: 'layout' },
  { tag: 'ux-article', role: 'article', kind: 'region', family: 'layout' },
  { tag: 'ux-list', role: 'list', kind: 'region', family: 'layout' },
  { tag: 'ux-description-list', role: 'list', kind: 'region', family: 'layout' },
  { tag: 'ux-dl', role: 'list', kind: 'region', family: 'layout' },

  // ── Action regions ──
  { tag: 'ux-menu-item', role: 'menuitem', kind: 'toggle', stateAttr: 'selected', family: 'navigation' },
  { tag: 'ux-context-menu-item', role: 'menuitem', kind: 'toggle', stateAttr: 'selected', family: 'overlay' },
  { tag: 'ux-icon-button', role: 'button', kind: 'toggle', stateAttr: 'pressed', family: 'action' },

  // ── Overlay regions ──
  { tag: 'ux-hover-panel', role: 'dialog', kind: 'tooltip', stateAttr: 'open', family: 'overlay' },

  // ── Form regions ──
  { tag: 'ux-search-input', role: 'searchbox', kind: 'input', family: 'form', formAssociated: true },
  { tag: 'ux-search-tags', role: 'list', kind: 'region', family: 'form' },
  { tag: 'ux-search-results', role: 'list', kind: 'region', family: 'form' },
  { tag: 'ux-form-errors', role: 'alert', kind: 'region', family: 'form' },

  // ── Chat regions ──
  { tag: 'ux-chat-messenger', role: 'log', kind: 'region', family: 'layout' },
  { tag: 'ux-chat-thread-list', role: 'list', kind: 'region', family: 'layout' },
  { tag: 'ux-chat-bubble', role: 'article', kind: 'region', family: 'layout' },
  { tag: 'ux-chat-roster', role: 'list', kind: 'region', family: 'layout' },

  // ── Misc ──
  { tag: 'ux-chart-line-legend', role: 'list', kind: 'region', family: 'data' },
];
