// allow Node-style require if ever needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

import type { Plugin } from '@ux3/plugin/registry.ts';

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
// CDN CONFIGURATION
// ============================================================================

const DEFAULT_TAILWIND_CDN = 'https://cdn.tailwindcss.com';

// ============================================================================
// PLUGIN DEFINITION
// ============================================================================

export const TailwindCssPlugin: Plugin = {
  name: '@ux3/plugin-tailwind-css',
  version: '0.1.0',
  description: 'Lightweight Tailwind CSS integration for UX3',

  async install(app) {
    // Get configuration from app
    const config = app.config.plugins?.['tailwind-css'] || {};
    const cdnUrl = config.cdn || DEFAULT_TAILWIND_CDN;

    // Register CDN stylesheet if configured
    if (config.cdn !== false) {
      app.registerAsset?.({
        type: 'style',
        href: cdnUrl,
        async: true,
        defer: true
      });
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
  }
};

export default TailwindCssPlugin;
