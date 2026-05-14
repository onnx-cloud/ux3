import { registerLightStyle } from './style-registry.js';

const TOKEN_CSS = `
  :root {
    /* ── Colors: Surface ── */
    --ux-surface: #ffffff;
    --ux-surface-secondary: #f8fafc;
    --ux-surface-tertiary: #f1f5f9;
    --ux-surface-overlay: rgba(0,0,0,0.5);

    /* ── Colors: Text ── */
    --ux-text: #0f172a;
    --ux-text-secondary: #475569;
    --ux-text-tertiary: #94a3b8;
    --ux-text-muted: #6b7280;
    --ux-text-inverse: #ffffff;

    /* ── Colors: Interactive ── */
    --ux-primary: #3b82f6;
    --ux-primary-hover: #2563eb;
    --ux-secondary: #64748b;
    --ux-secondary-hover: #475569;
    --ux-success: #10b981;
    --ux-success-hover: #059669;
    --ux-warning: #f59e0b;
    --ux-warning-hover: #d97706;
    --ux-danger: #ef4444;
    --ux-danger-hover: #dc2626;
    --ux-info: #06b6d4;
    --ux-info-hover: #0891b2;

    /* ── Colors: Border ── */
    --ux-border: #d1d5db;
    --ux-border-light: #e2e8f0;
    --ux-border-strong: #94a3b8;

    /* ── Colors: Feedback ── */
    --ux-feedback-success-bg: #d1fae5;
    --ux-feedback-success-text: #065f46;
    --ux-feedback-warning-bg: #fef3c7;
    --ux-feedback-warning-text: #92400e;
    --ux-feedback-error-bg: #fee2e2;
    --ux-feedback-error-text: #991b1b;
    --ux-feedback-info-bg: #cffafe;
    --ux-feedback-info-text: #0e7490;

    /* ── Spacing ── */
    --ux-space-1: 0.25rem;
    --ux-space-2: 0.5rem;
    --ux-space-3: 0.75rem;
    --ux-space-4: 1rem;
    --ux-space-5: 1.25rem;
    --ux-space-6: 1.5rem;
    --ux-space-8: 2rem;
    --ux-space-10: 2.5rem;

    /* ── Radius ── */
    --ux-radius-sm: 0.25rem;
    --ux-radius-md: 0.375rem;
    --ux-radius-lg: 0.5rem;
    --ux-radius-xl: 0.75rem;
    --ux-radius-full: 9999px;

    /* ── Typography ── */
    --ux-font-sans: "Inter", system-ui, -apple-system, sans-serif;
    --ux-font-mono: "JetBrains Mono", "Fira Code", monospace;
    --ux-font-size-xs: 0.75rem;
    --ux-font-size-sm: 0.8125rem;
    --ux-font-size-base: 0.875rem;
    --ux-font-size-md: 1rem;
    --ux-font-size-lg: 1.125rem;
    --ux-font-size-xl: 1.25rem;
    --ux-font-weight-normal: 400;
    --ux-font-weight-medium: 500;
    --ux-font-weight-semibold: 600;
    --ux-font-weight-bold: 700;
    --ux-leading-tight: 1.25;
    --ux-leading-normal: 1.5;

    /* ── Shadows ── */
    --ux-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
    --ux-shadow-md: 0 4px 12px rgba(0,0,0,0.1);
    --ux-shadow-lg: 0 10px 40px rgba(0,0,0,0.2);
    --ux-shadow-xl: 0 20px 60px rgba(0,0,0,0.3);

    /* ── Focus rings ── */
    --ux-focus-ring: 0 0 0 2px rgba(59,130,246,0.15);
    --ux-focus-ring-danger: 0 0 0 2px rgba(220,38,38,0.15);
    --ux-focus-outline: 2px solid var(--ux-primary);
    --ux-focus-outline-offset: 2px;

    /* ── Transitions ── */
    --ux-transition-fast: 150ms ease;
    --ux-transition-normal: 200ms ease;
    --ux-transition-slow: 300ms ease;

    /* ── Z-index scales ── */
    --ux-z-dropdown: 100;
    --ux-z-sticky: 500;
    --ux-z-overlay: 1000;
    --ux-z-modal: 9998;
    --ux-z-toast: 9999;
    --ux-z-tooltip: 10000;

    /* ── Legacy aliases (for backward compat) ── */
    --color-bg: var(--ux-surface);
    --color-bg-muted: var(--ux-surface-secondary);
    --color-text: var(--ux-text);
    --color-text-muted: var(--ux-text-muted);
    --color-border: var(--ux-border-light);
    --color-border-default: var(--ux-border);
    --color-primary: var(--ux-primary);
    --color-danger: var(--ux-danger);
    --color-success: var(--ux-success);
    --color-warning: var(--ux-warning);
    --color-surface-tertiary: var(--ux-surface-tertiary);
    --color-text-default: var(--ux-text);
    --color-text-secondary: var(--ux-text-secondary);
    --spacing-xs: var(--ux-space-1);
    --spacing-sm: var(--ux-space-2);
    --spacing-md: var(--ux-space-4);
    --spacing-lg: var(--ux-space-6);
    --spacing-xl: var(--ux-space-8);
    --spacing-xxs: var(--ux-space-1);
    --radius-md: var(--ux-radius-md);
    --radius-lg: var(--ux-radius-xl);
    --transition-normal: var(--ux-transition-normal);
    --transition-fast: var(--ux-transition-fast);
    --opacity-disabled: 0.6;
    --cursor-disabled: not-allowed;
    --focus-outline: var(--ux-focus-outline);
    --focus-outline-offset: var(--ux-focus-outline-offset);
  }
`;

registerLightStyle('ux-design-tokens', TOKEN_CSS);
