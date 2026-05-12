// src/theme.ts - Theme definitions and management

import type { Theme } from './types.js'

export const THEMES = {
  light: {
    primary: '#f0f0f0',
    secondary: '#333',
    tertiary: '#fff',
    text: '#333',
    textOnPrimary: '#000',
    border: '#ccc',
    borderWidth: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    spacing: 40,
  } as Theme,

  dark: {
    primary: '#2a2a2a',
    secondary: '#ccc',
    tertiary: '#1a1a1a',
    text: '#ccc',
    textOnPrimary: '#fff',
    border: '#444',
    borderWidth: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    spacing: 40,
  } as Theme,

  minimal: {
    primary: '#fff',
    secondary: '#000',
    tertiary: '#fff',
    text: '#000',
    textOnPrimary: '#000',
    border: '#000',
    borderWidth: 1,
    borderRadius: 0,
    fontSize: 13,
    fontFamily: 'monospace',
    spacing: 32,
  } as Theme,
}

export function getTheme(name: string | undefined): Theme {
  if (!name || !(name in THEMES)) {
    return THEMES.light
  }
  return THEMES[name as keyof typeof THEMES]
}

export function registerTheme(name: string, theme: Theme): void {
  ;(THEMES as Record<string, Theme>)[name] = theme
}
