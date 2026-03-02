/**
 * Style Registry
 *
 * Provides a centralized runtime mapping of `ux-style`/`data-style` keys to
 * CSS class strings.  Widgets and server-rendered markup reference styles by
 * name, and the registry is responsible for injecting the corresponding
 * class list when the page is hydrated or when views mount.
 *
 * Styles are automatically applied to the document body on
 * `DOMContentLoaded` and to every `ViewComponent` layout when it mounts.
 * Additional helpers are exported for manual application or clearing during
 * tests.
 */

import { ViewComponent } from './view-component.js';

export type StyleMap = Record<string, string>;

// Structured style object (full form with base/variants/props/defaults)
export interface StyleEntry {
  base?: string;
  variants?: Record<string, Record<string, string>>;
  props?: Record<string, string>;
  defaults?: Record<string, string>;
}

// internal registry store
const styles: StyleMap = {};
// full style objects (including variant metadata)
const styleObjects: Record<string, StyleEntry | string> = {};

// exported for read/write in tests or helpers
export function getRegisteredStyles(): StyleMap {
  return styles;
}

/**
 * Register or override style definitions.
 * Multiple calls will merge values; later registrations win.
 */
export function registerStyles(newStyles: StyleMap): void {
  Object.assign(styles, newStyles);
}

/**
 * Register full style objects (including variant metadata).
 */
export function registerStyleObjects(entries: Record<string, StyleEntry | string>): void {
  Object.assign(styleObjects, entries);
}

/**
 * Clear the registry (useful for tests).
 */
export function clearStyles(): void {
  for (const k of Object.keys(styles)) {
    delete styles[k];
  }
  for (const k of Object.keys(styleObjects)) {
    delete styleObjects[k];
  }
}

/**
 * Resolve a style key to a final class string, optionally merging variants.
 *
 * Example:
 *   resolveStyle('button', { variant: 'primary', size: 'md' })
 *   → 'btn btn-primary btn-md'
 *
 * @param key        The style key registered in the style map.
 * @param variants   Optional variant selections (e.g. { variant: 'primary' }).
 * @returns          The merged class string, or empty string when key is unknown.
 */
export function resolveStyle(key: string, variants?: Record<string, string>): string {
  const entry = styleObjects[key];
  if (!entry) {
    // fall back to flat registry
    return styles[key] || '';
  }

  if (typeof entry === 'string') {
    return entry;
  }

  const parts: string[] = [];
  if (entry.base) parts.push(entry.base);

  if (variants && entry.variants) {
    for (const [groupName, value] of Object.entries(variants)) {
      const group = entry.variants[groupName];
      if (group) {
        const cls = group[value];
        if (cls) parts.push(cls);
      }
    }
  } else if (!variants && entry.defaults && entry.variants) {
    // apply defaults when no explicit variants given
    for (const [groupName, defaultValue] of Object.entries(entry.defaults)) {
      const group = entry.variants[groupName];
      if (group && group[defaultValue]) parts.push(group[defaultValue]);
    }
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Apply styles to all elements under the given root.  Looks for
 * `[data-style]` or `[ux-style]` attributes and sets `className` according to
 * the registry.  Existing classes are preserved (merged).  If a key is missing
 * in the registry a warning is emitted via the logger/console.  Accepts
 * Document, ShadowRoot or HTMLElement.
 */
export function applyStyles(root: Document | ShadowRoot | HTMLElement = document): void {
  try {
    type Queryable = Document | Element | ShadowRoot;
    let container: Queryable = root;
    // ShadowRoot does not inherit from Document but has querySelectorAll
    if ('querySelectorAll' in root) {
      container = root as Queryable;
    }

    (container).querySelectorAll('[data-style], [ux-style]').forEach((el) => {
      const key = el.getAttribute('data-style') || el.getAttribute('ux-style') || '';
      const cls = resolveStyle(key);
      if (cls) {
        const el2 = el as HTMLElement;
        // P0-1: merge with existing classes rather than overwriting
        const existing = el2.className.split(/\s+/).filter(Boolean);
        const incoming = cls.split(/\s+/).filter(Boolean);
        const merged = Array.from(new Set([...existing, ...incoming]));
        el2.className = merged.join(' ');
      } else {
        // P3-2: warn on unknown key so developers notice missing style registrations
        console.warn(`[UX3 style-registry] unknown ux-style key: '${key}'`);
      }
    });
  } catch (e) {
    console.warn('[UX3 style-registry] applyStyles failed', e);
  }
}

let patched = false;
// P0-2: separate flag so the DOMContentLoaded listener is only added once
let domListenerAdded = false;

/**
 * Patches ViewComponent.prototype.mountLayout so that styles are applied
 * whenever a view renders, and wires up a DOMContentLoaded listener to
 * process any pre-existing markup.  Safe to call multiple times.
 */
export function initStyleRegistry(): void {
  if (!patched) {
    // Keep a direct reference; .bind() would lock `this` to the prototype, breaking
    // the subsequent orig.call(instance) invocation.
    // capture the original method with explicit `this` signature so eslint
    // doesn't warn about unbound methods
    const orig: (this: ViewComponent & HTMLElement) => void =
      ViewComponent.prototype.mountLayout;

    ViewComponent.prototype.mountLayout = function (this: ViewComponent & HTMLElement) {
      orig.call(this);
      try {
        if (this.shadowRoot) applyStyles(this.shadowRoot);
        applyStyles(this);
      } catch (e) {
        console.warn('[UX3 style-registry] view style injection failed', e);
      }
    };
    patched = true;
  }

  // P0-2: guard the DOMContentLoaded listener with its own flag
  if (!domListenerAdded && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      applyStyles(document.body);
    });
    domListenerAdded = true;
  }
}
