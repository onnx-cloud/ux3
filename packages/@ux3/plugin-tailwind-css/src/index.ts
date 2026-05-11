// allow Node-style require if ever needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '@ux3/ui/app.js';
import { registerStyles } from '../../../../src/ui/style-registry.js';

// ============================================================================
// COLOR PALETTES
// ============================================================================

export const colorPalette = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    500: '#64748b',
    900: '#0f172a'
  },
  blue: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    900: '#1e3a8a'
  },
  green: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    900: '#15803d'
  },
  red: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    900: '#7f1d1d'
  },
  yellow: {
    50: '#fefce8',
    500: '#eab308',
    600: '#ca8a04',
    900: '#713f12'
  }
};

// ============================================================================
// TYPOGRAPHY CLASSES
// ============================================================================

export const typography = {
  h1: 'text-4xl font-bold leading-tight tracking-tighter',
  h2: 'text-3xl font-bold leading-snug tracking-tight',
  h3: 'text-2xl font-semibold leading-snug tracking-tight',
  h4: 'text-xl font-semibold leading-normal',
  h5: 'text-lg font-semibold',
  h6: 'text-base font-semibold',
  body: 'text-base leading-relaxed',
  small: 'text-sm leading-normal',
  caption: 'text-xs leading-normal tracking-wide'
};

// ============================================================================
// LAYOUT UTILITIES
// ============================================================================

export const layout = {
  container: 'mx-auto px-4 max-w-6xl',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  gridCols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  gridCols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  gridCols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
};

// ============================================================================
// COMPONENT STYLES
// ============================================================================

export const components = {
  button: 'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors',
  buttonPrimary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
  buttonSecondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400',
  buttonSmall: 'px-3 py-1 text-sm',
  buttonLarge: 'px-6 py-3 text-lg',

  input: 'w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  inputError: 'border-red-500 focus:ring-red-500',

  card: 'bg-white rounded-lg border border-slate-200 shadow-sm',
  cardPadding: 'p-4 md:p-6',

  badge: 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
  badgeBlue: 'bg-blue-100 text-blue-800',
  badgeGreen: 'bg-green-100 text-green-800',
  badgeRed: 'bg-red-100 text-red-800',
  badgeYellow: 'bg-yellow-100 text-yellow-800',

  alert: 'p-4 rounded-md border-l-4',
  alertInfo: 'bg-blue-50 border-blue-400 text-blue-800',
  alertSuccess: 'bg-green-50 border-green-400 text-green-800',
  alertWarning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  alertError: 'bg-red-50 border-red-400 text-red-800'
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
  '3xl': '3rem'
};

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge multiple class strings, filtering out falsy values
 */
export function mergeClasses(...classes: (string | undefined | null | boolean)[]): string {
  return classes
    .filter((cls): cls is string => typeof cls === 'string' && cls.length > 0)
    .join(' ');
}

/**
 * Compose a button class with color variant and size
 */
export function buttonClass(
  variant: 'primary' | 'secondary' = 'primary',
  size: 'small' | 'medium' | 'large' = 'medium',
  additional?: string
): string {
  const base = components.button;
  const variantClass = variant === 'primary' ? components.buttonPrimary : components.buttonSecondary;
  const sizeClass =
    size === 'small'
      ? components.buttonSmall
      : size === 'large'
        ? components.buttonLarge
        : '';

  return mergeClasses(base, variantClass, sizeClass, additional);
}

/**
 * Compose a card class with optional padding
 */
export function cardClass(padding: boolean = true, additional?: string): string {
  return mergeClasses(components.card, padding && components.cardPadding, additional);
}

/**
 * Compose a badge class by color
 */
export function badgeClass(
  color: 'blue' | 'green' | 'red' | 'yellow' = 'blue',
  additional?: string
): string {
  const colorClass =
    color === 'blue'
      ? components.badgeBlue
      : color === 'green'
        ? components.badgeGreen
        : color === 'red'
          ? components.badgeRed
          : components.badgeYellow;

  return mergeClasses(components.badge, colorClass, additional);
}

/**
 * Compose an alert class by type
 */
export function alertClass(
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  additional?: string
): string {
  const typeClass =
    type === 'info'
      ? components.alertInfo
      : type === 'success'
        ? components.alertSuccess
        : type === 'warning'
          ? components.alertWarning
          : components.alertError;

  return mergeClasses(components.alert, typeClass, additional);
}

// ============================================================================
// ASSET CONFIGURATION
// ============================================================================

const DEFAULT_TAILWIND_CSS = '/tailwind.css';

// ============================================================================
// PLUGIN DEFINITION
// ============================================================================

const { version: _cssVersion } = require('../package.json') as { version: string };

function resolvePluginConfig(app: AppContext): Record<string, unknown> {
  const plugins = (app.config as any)?.plugins;

  if (Array.isArray(plugins)) {
    const listEntry = plugins.find((entry: any) => entry?.name === '@ux3/plugin-tailwind-css');
    if (listEntry && typeof listEntry.config === 'object' && listEntry.config !== null) {
      return listEntry.config as Record<string, unknown>;
    }
  }

  if (plugins && typeof plugins === 'object' && plugins['tailwind-css']) {
    return plugins['tailwind-css'] as Record<string, unknown>;
  }

  return {};
}

export const TailwindCssPlugin: Plugin = {
  name: '@ux3/plugin-tailwind-css',
  version: _cssVersion,
  description: 'Lightweight Tailwind CSS integration for UX3',

  async install(app) {
    registerStyles(TAILWIND_STYLES);

    // Get configuration from app (supports both plugin list and keyed configs)
    const config = resolvePluginConfig(app) as {
      cdn?: string | false;
      css?: string | false;
      customProperties?: boolean;
    };
    const explicitCss = typeof config.css === 'string' && config.css.length > 0 ? config.css : undefined;
    const explicitCdn = typeof config.cdn === 'string' && config.cdn.length > 0 ? config.cdn : undefined;
    const assetUrl = explicitCss || explicitCdn || DEFAULT_TAILWIND_CSS;
    const shouldRegisterAsset = config.css !== false && (explicitCss !== undefined || explicitCdn !== undefined || config.cdn !== false);
    const isScriptAsset =
      typeof assetUrl === 'string' &&
      (assetUrl.includes('@tailwindcss/browser') || assetUrl.includes('cdn.tailwindcss.com') || assetUrl.endsWith('.js'));

    // Register configured stylesheet/script if enabled
    if (shouldRegisterAsset && typeof assetUrl === 'string' && assetUrl.length > 0) {
      if (isScriptAsset) {
        app.registerAsset?.({
          type: 'script',
          src: assetUrl,
          async: true,
          defer: true,
        });
      } else {
        app.registerAsset?.({
          type: 'style',
          href: assetUrl,
        });
      }
    }

    // Register utility functions on app context
    app.utils = app.utils || {};
    (app.utils as any).tailwind = {
      mergeClasses,
      buttonClass,
      cardClass,
      badgeClass,
      alertClass,
      // Export all palettes and utilities for direct access
      colors: colorPalette,
      typography,
      layout,
      components,
      spacing,
      breakpoints
    };

    // Optionally register custom CSS custom properties (if stylesheet is being used)
    if (config.customProperties !== false) {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --color-primary: ${colorPalette.blue[500]};
          --color-secondary: ${colorPalette.slate[500]};
          --color-success: ${colorPalette.green[500]};
          --color-warning: ${colorPalette.yellow[500]};
          --color-error: ${colorPalette.red[500]};
          --spacing-base: ${spacing.md};
        }
      `;
      document.head?.appendChild(style);
    }

    injectSplashScreen();
  }
};

function injectSplashScreen(): void {
  if (typeof document === 'undefined' || document.getElementById('ux-loading')) return;

  const style = document.createElement('style');
  style.id = 'ux-loading-style';
  style.textContent = `
    #ux-loading { position:fixed; inset:0; z-index:99999; background:rgba(255,255,255,0.92); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; transition:opacity 0.3s ease; }
    #ux-loading.ux-ready { opacity:0; pointer-events:none; }
  `;
  document.head.appendChild(style);

  const div = document.createElement('div');
  div.id = 'ux-loading';
  document.body.insertBefore(div, document.body.firstChild);

  let tries = 0;
  const check = setInterval(() => {
    if ((window as any).__ux3App || ++tries > 40) {
      clearInterval(check);
      div.classList.add('ux-ready');
      setTimeout(() => { div.remove(); style.remove(); }, 350);
    }
  }, 100);
}

export default TailwindCssPlugin;

// ============================================================================
// TAILWIND STYLE OVERLAY — enriches core default-styles with Tailwind utilities
// Call registerStyles(TAILWIND_STYLES) after core DEFAULT_STYLES to override.
// ============================================================================

export const TAILWIND_STYLES: Record<string, string> = {
  // ── Layout & Shell ────────────────────────────────────────────────────────
  'ux-app-shell':       'min-h-screen flex flex-col bg-[var(--color-bg,#fff)] text-[var(--color-text,#0f172a)]',
  'ux-topbar':          'flex items-center justify-between px-4 py-3 bg-[var(--color-bg,#fff)] border-b border-[var(--color-border,#e2e8f0)]',
  'ux-sidebar':         'flex flex-col w-64 bg-[var(--color-bg,#fff)] border-r border-[var(--color-border,#e2e8f0)] min-h-screen',
  'ux-content':         'flex-1 p-4',
  'ux-breadcrumb':      'flex items-center gap-2 text-[var(--color-text-muted,#64748b)] text-sm',
  'ux-stack':           'flex flex-col gap-4',
  'ux-inline':          'flex items-center gap-2 flex-wrap',
  'ux-grid':            'grid gap-4',
  'ux-hero':            'py-16 px-4 text-center',
  'ux-article':         'prose max-w-prose',
  'ux-divider':         'border-t border-[var(--color-border,#e2e8f0)] my-4',

  // ── Navigation ────────────────────────────────────────────────────────────
  'ux-nav':             'flex items-center gap-4',
  'ux-header':          'flex items-center justify-between px-6 py-4 bg-[var(--color-bg,#fff)] border-b border-[var(--color-border,#e2e8f0)]',
  'ux-footer':          'px-6 py-4 text-sm text-[var(--color-text-muted,#64748b)] border-t border-[var(--color-border,#e2e8f0)]',

  // ── Feedback & Status ─────────────────────────────────────────────────────
  'ux-alert':           'p-4 rounded-md border-l-4 border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/10 text-[var(--color-primary,#2563eb)] text-sm',
  'ux-spinner':         'animate-spin inline-block h-6 w-6 border-2 border-t-transparent rounded-full border-[var(--color-primary,#3b82f6)]',
  'ux-skeleton':        'animate-pulse bg-[var(--color-bg-muted,#e2e8f0)] rounded',
  'ux-progress':        'w-full bg-[var(--color-bg-muted,#f1f5f9)] rounded-full h-2',
  'ux-empty-state':     'flex flex-col items-center justify-center gap-3 py-12 text-[var(--color-text-muted,#94a3b8)]',
  'ux-error-panel':     'p-4 rounded-md bg-[var(--color-danger,#ef4444)]/10 border border-[var(--color-danger,#ef4444)]/20 text-[var(--color-danger,#dc2626)] text-sm',
  'ux-badge':           'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-muted,#f1f5f9)] text-[var(--color-text-secondary,#475569)]',

  // ── Data Display ──────────────────────────────────────────────────────────
  'ux-card':            'bg-[var(--color-bg,#fff)] rounded-lg border border-[var(--color-border,#e2e8f0)] shadow-sm p-4',
  'ux-card-icon':       'flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary,#dbeafe)] text-[var(--color-primary,#2563eb)] mb-3',
  'ux-table':           'w-full text-sm border-collapse',
  'ux-list':            'divide-y divide-[var(--color-border,#e2e8f0)]',
  'ux-description-list': 'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 [&_dt]:font-medium [&_dt]:text-[var(--color-text-secondary,#334155)] [&_dd]:text-[var(--color-text-muted,#475569)] [&_dd]:mb-2',
  'ux-dl':              'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 [&_dt]:font-medium [&_dt]:text-[var(--color-text-secondary,#334155)] [&_dd]:text-[var(--color-text-muted,#475569)] [&_dd]:mb-2',
  'ux-avatar':          'inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-bg-muted,#e2e8f0)] text-[var(--color-text-secondary,#475569)] font-medium text-sm',
  'ux-surface':         'rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] shadow-sm',

  // ── Overlays ──────────────────────────────────────────────────────────────
  'ux-modal':           'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
  'ux-drawer':          'fixed inset-y-0 right-0 z-50 w-80 bg-[var(--color-bg,#fff)] shadow-xl',
  'ux-tooltip':         'absolute z-50 px-2 py-1 text-xs text-white bg-[var(--color-text,#1e293b)] rounded shadow-lg',
  'ux-popover':         'absolute z-40 bg-[var(--color-bg,#fff)] border border-[var(--color-border,#e2e8f0)] rounded-lg shadow-lg p-3',
  'ux-hover-panel':     'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 text-sm shadow-lg',

  // ── Tabs & Accordion ──────────────────────────────────────────────────────
  'ux-tabs':            'flex flex-col rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-1',
  'ux-tab':             'inline-flex items-center px-4 py-1.5 text-sm font-medium cursor-pointer rounded-md transition-colors text-[var(--color-text-muted,#6b7280)] hover:bg-[var(--color-bg-muted,#f1f5f9)]',
  'ux-tab-panel':       'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 text-sm',
  'tab-selected':       'bg-[var(--color-primary,#eff6ff)] text-[var(--color-primary,#1d4ed8)]',
  'ux-accordion':       'border border-[var(--color-border,#e2e8f0)] rounded-lg divide-y divide-[var(--color-border,#e2e8f0)]',
  'ux-menu':            'flex flex-col rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] overflow-hidden text-sm min-w-48',
  'ux-menu-item':       'px-3 py-2 cursor-pointer text-sm hover:bg-[var(--color-bg-muted,#f9fafb)] transition-colors',
  'ux-command-palette': 'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-3 text-sm',

  // ── Forms ─────────────────────────────────────────────────────────────────
  'ux-form':            'flex flex-col gap-4',
  'ux-field':           'grid gap-2 [&>label]:text-sm [&>label]:font-medium [&>label]:text-[var(--color-text-secondary,#334155)]',
  'ux-input':           'block w-full [&::part(input)]:w-full [&::part(input)]:px-3 [&::part(input)]:py-2 [&::part(input)]:border [&::part(input)]:border-[var(--color-border,#cbd5e1)] [&::part(input)]:rounded-md [&::part(input)]:text-sm [&::part(input)]:bg-[var(--color-bg,#fff)] [&::part(input)]:text-[var(--color-text,#1e293b)] [&::part(input)]:placeholder:text-[var(--color-text-muted,#94a3b8)] [&::part(input)]:focus:outline-none [&::part(input)]:focus:ring-2 [&::part(input)]:focus:ring-[var(--color-primary,#3b82f6)]',
  'ux-textarea':        'w-full px-3 py-2 border border-[var(--color-border,#cbd5e1)] rounded-md text-sm bg-[var(--color-bg,#fff)] text-[var(--color-text,#1e293b)] placeholder:text-[var(--color-text-muted,#94a3b8)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)] resize-y',
  'ux-select':          'w-full px-3 py-2 border border-[var(--color-border,#cbd5e1)] rounded-md text-sm bg-[var(--color-bg,#fff)] text-[var(--color-text,#1e293b)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)]',
  'ux-dropdown':        'w-full px-3 py-2 border border-[var(--color-border,#cbd5e1)] rounded-md text-sm bg-[var(--color-bg,#fff)] text-[var(--color-text,#1e293b)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)]',
  'ux-checkbox':        'h-4 w-4 rounded border-[var(--color-border,#cbd5e1)] text-[var(--color-primary,#2563eb)] focus:ring-[var(--color-primary,#3b82f6)]',
  'ux-radio-group':     'flex flex-col gap-2',
  'ux-switch':          'relative inline-flex h-5 w-9 items-center rounded-full bg-[var(--color-bg-muted,#e2e8f0)]',
  'ux-slider':          'w-full h-2 rounded-full bg-[var(--color-bg-muted,#e2e8f0)] accent-[var(--color-primary,#3b82f6)]',
  'ux-form-errors':     'flex flex-col gap-1 text-sm text-[var(--color-danger,#dc2626)]',
  'ux-field-array':     'flex flex-col gap-2',

  // ── Buttons ───────────────────────────────────────────────────────────────
  'ux-button':          'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-colors bg-[var(--color-primary,#2563eb)] text-white hover:bg-[var(--color-primary-hover,#1d4ed8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#3b82f6)] cursor-pointer',
  'ux-icon-button':     'inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--color-bg-muted,#f1f5f9)] transition-colors cursor-pointer',
  'ux-link':            'text-[var(--color-link,#2563eb)] hover:underline cursor-pointer',

  // ── Search ────────────────────────────────────────────────────────────────
  'ux-search-input':    'w-full px-3 py-2 pl-9 border border-[var(--color-border,#cbd5e1)] rounded-md text-sm bg-[var(--color-bg,#fff)] text-[var(--color-text,#1e293b)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)]',
  'ux-search-tags':     'flex flex-wrap gap-1',
  'ux-search-results':  'absolute z-40 w-full bg-[var(--color-bg,#fff)] border border-[var(--color-border,#e2e8f0)] rounded-lg shadow-lg mt-1 max-h-64 overflow-auto',
  'ux-search-bar':      'flex items-center gap-2 rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] px-3 py-2 min-w-64',

  // ── Pagination ────────────────────────────────────────────────────────────
  'ux-pagination':      'flex items-center gap-1',

  // ── Media ─────────────────────────────────────────────────────────────────
  'ux-image':           'block max-w-full rounded',
  'ux-image-panel':     'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-w-48 min-h-28 flex items-center justify-center',
  'ux-video':           'block max-w-full rounded',
  'ux-audio':           'block min-w-72',
  'ux-image-capture':   'rounded-lg border border-dashed border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] p-4 cursor-pointer hover:border-[var(--color-primary,#60a5fa)] hover:bg-[var(--color-primary,#eff6ff)]',
  'ux-video-capture':   'rounded-lg border border-dashed border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] p-4 cursor-pointer hover:border-[var(--color-primary,#60a5fa)] hover:bg-[var(--color-primary,#eff6ff)]',
  'ux-audio-capture':   'rounded-lg border border-dashed border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] p-4 cursor-pointer hover:border-[var(--color-primary,#60a5fa)] hover:bg-[var(--color-primary,#eff6ff)]',

  // ── Charts ────────────────────────────────────────────────────────────────
  'ux-chart-line':      'block min-h-60 min-w-60',
  'ux-chart-bar':       'block min-h-60 min-w-60',
  'ux-chart-donut':     'block min-h-60 min-w-48',
  'ux-chart-line-legend': 'flex flex-wrap gap-3 py-2',

  // ── Chat ──────────────────────────────────────────────────────────────────
  'ux-chat-messenger':  'flex flex-col gap-3 rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 shadow-sm min-h-80',
  'ux-chat-thread-list': 'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg-surface,#f9fafb)] p-3 text-sm',
  'ux-chat-roster':     'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg-surface,#f9fafb)] p-3 text-sm',
  'ux-chat-messages':   'rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 text-sm flex-1 min-h-32 overflow-y-auto flex flex-col gap-3',
  'ux-chat-bubble':     'inline-block rounded-2xl bg-[var(--color-primary,#3b82f6)] text-white px-4 py-2 text-sm max-w-[80%]',
  'ux-chat-composer':   'flex items-center gap-2 border-t border-[var(--color-border,#e2e8f0)] pt-3',

  // ── Rich content ──────────────────────────────────────────────────────────
  'ux-wysiwyg':         'prose min-h-32 px-3 py-2 border border-[var(--color-border,#cbd5e1)] rounded-md bg-[var(--color-bg,#fff)] focus:outline-none',
  'ux-wizard':          'flex flex-col gap-6',
  'ux-panel':           'block rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 shadow-sm',

  // ── Consent / legal ───────────────────────────────────────────────────────
  'ux-consent-banner':  'fixed bottom-0 inset-x-0 z-50 bg-[var(--color-text,#1e293b)] text-[var(--color-bg,#fff)] px-6 py-4 flex items-center justify-between gap-4 text-sm',

  // ── i18n / theme controls ─────────────────────────────────────────────────
  'ux-lang-switcher':   'flex items-center gap-2 text-sm',
  'ux-theme-toggle':    'inline-flex items-center',
  'ux-network-status':  'flex items-center gap-1.5 text-xs text-[var(--color-text-muted,#94a3b8)]',

  // ── Splash ────────────────────────────────────────────────────────────────
  'ux-splash':          'fixed inset-0 flex items-center justify-center bg-[var(--color-bg,#fff)] z-50',
  'ux-splash-screen':   'fixed inset-0 flex items-center justify-center bg-[var(--color-bg,#fff)] z-50',

  // ── Advanced / Tier 2 ─────────────────────────────────────────────────────
  'ux-page':            'flex flex-col gap-4 flex-1',
  'ux-combobox':        'rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] px-3 py-2 min-w-56',
  'ux-date-picker':     'rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] px-3 py-2 min-w-56',
  'ux-file-upload':     'rounded-lg border border-dashed border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg,#fff)] p-4 cursor-pointer',
  'ux-dropzone':        'rounded-lg border-2 border-dashed border-[var(--color-border,#cbd5e1)] bg-[var(--color-bg-surface,#f9fafb)] p-6 flex items-center justify-center hover:border-[var(--color-primary,#60a5fa)] transition-colors',
  'ux-tree-nav':        'flex flex-col gap-1 text-sm',
  'ux-notifications':   'flex flex-col gap-2 rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 text-sm min-h-28',
  'ux-qr-code':         'flex items-center justify-center rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-w-40 min-h-40',
  'ux-data-grid':       'block rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 text-sm min-h-48',
  'ux-table-virtual':   'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 text-sm min-h-40 overflow-y-auto',

  // ── Complex Widgets (plugins) ──────────────────────────────────────────────
  'ux-kanban':          'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4',
  'ux-gantt':           'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-h-48 overflow-x-auto',
  'ux-pivot-table':     'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 overflow-x-auto',
  'ux-filter-builder':  'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-3',
  'ux-query-builder':   'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-3',
  'ux-flow-editor':     'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-h-72',
  'ux-workflow':        'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4',
  'ux-dashboard':       'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4',
  'ux-kpi-board':       'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4',
  'ux-report-builder':  'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-h-40',
  'ux-calendar':        'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-h-60',
  'ux-graph':           'block rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg,#fff)] p-4 min-h-80',
};
