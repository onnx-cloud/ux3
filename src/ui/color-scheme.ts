/**
 * Color Scheme (dark-mode) runtime helper
 *
 * Toggles between light and dark mode by setting `data-color-scheme` on
 * `<html>`.  The corresponding CSS custom properties are emitted by
 * `tokensToCss()` in `src/build/style-utils.ts` into `generated/tokens.css`.
 *
 * Usage:
 *   import { initColorScheme, setColorScheme } from '@ux3/ui/color-scheme';
 *   initColorScheme(); // call once at startup to apply saved/OS preference
 *   setColorScheme('dark');
 */

export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'ux3:color-scheme';

/**
 * Read the current scheme preference from localStorage or the OS media query.
 */
export function getColorScheme(): ColorScheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable (SSR, privacy mode, etc.)
  }
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Apply a color scheme immediately and persist the preference.
 */
export function setColorScheme(scheme: ColorScheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-color-scheme', scheme);
  try {
    localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    // ignore storage errors
  }
  // Dispatch a custom event so other parts of the app can react
  document.dispatchEvent(new CustomEvent('ux3:color-scheme-change', { detail: { scheme } }));
}

/**
 * Apply the persisted / OS-preferred scheme on page load.
 * Call once in your app entry point (before first render) to avoid FOUC.
 */
export function initColorScheme(): void {
  setColorScheme(getColorScheme());
}

/**
 * Toggle between light and dark.
 */
export function toggleColorScheme(): void {
  setColorScheme(getColorScheme() === 'dark' ? 'light' : 'dark');
}
