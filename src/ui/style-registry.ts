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
let tailwindRefreshScheduled = false;

function requestTailwindRefresh(): void {
  if (typeof window === 'undefined' || tailwindRefreshScheduled) {
    return;
  }

  const win = window as unknown as {
    tailwind?: { refresh?: () => void };
  };

  if (!win.tailwind || typeof win.tailwind.refresh !== 'function') {
    return;
  }

  tailwindRefreshScheduled = true;
  const run = () => {
    try {
      win.tailwind?.refresh?.();
    } catch {
      // no-op: style application must not fail due to optional tailwind runtime hooks
    } finally {
      tailwindRefreshScheduled = false;
    }
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => run());
  } else {
    setTimeout(run, 0);
  }
}

// exported for read/write in tests or helpers
export function getRegisteredStyles(): StyleMap {
  return styles;
}

const _warnedStyleKeys = new Set<string>();
function warnOnce(key: string): void {
  if (_warnedStyleKeys.has(key)) return;
  _warnedStyleKeys.add(key);
  console.warn(`[Ux3] unknown ux-style key: '${key}'`);
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
      const rawKey = el.getAttribute('data-style') || el.getAttribute('ux-style') || '';
      const keys = rawKey.split(',').map(k => k.trim()).filter(Boolean);
      const clsParts: string[] = [];
      for (const key of keys) {
        const resolved = resolveStyle(key);
        if (resolved) {
          clsParts.push(resolved);
        } else {
          warnOnce(key);
        }
      }
      const cls = clsParts.join(' ');
      if (cls) {
        const el2 = el as HTMLElement;
        const existing = el2.className.split(/\s+/).filter(Boolean);
        const incoming = cls.split(/\s+/).filter(Boolean);
        const merged = Array.from(new Set([...existing, ...incoming]));
        el2.className = merged.join(' ');
      }
    });

    // Tailwind CDN runtime may need an explicit refresh after classes are
    // injected dynamically from ux-style mappings.
    requestTailwindRefresh();
  } catch (e) {
    console.warn('[Ux3] applyStyles failed', e);
  }
}

let patched = false;
// P0-2: separate flag so the DOMContentLoaded listener is only added once
let domListenerAdded = false;
let mutationObserverAdded = false;
let styleSweepScheduled = false;

function applyStylesToOpenShadowRoots(): void {
  if (typeof document === 'undefined') {
    return;
  }

  for (const node of Array.from(document.querySelectorAll('*'))) {
    const host = node as HTMLElement & { shadowRoot?: ShadowRoot | null };
    if (host.shadowRoot) {
      applyStyles(host.shadowRoot);
    }
  }
}

function sweepDocumentStyles(): void {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }

  applyStyles(document.body);
  applyStylesToOpenShadowRoots();
}

function scheduleStyleSweep(): void {
  if (styleSweepScheduled) {
    return;
  }

  styleSweepScheduled = true;
  const run = () => {
    try {
      sweepDocumentStyles();
    } finally {
      styleSweepScheduled = false;
    }
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => run());
  } else {
    setTimeout(run, 0);
  }
}

/**
 * Patches ViewComponent.prototype.mountLayout so that styles are applied
 * whenever a view renders, and wires up a DOMContentLoaded listener to
 * process any pre-existing markup.  Safe to call multiple times.
 */
export function initStyleRegistry(): void {
  if (!patched) {
    const orig: (this: ViewComponent & HTMLElement) => void = (ViewComponent.prototype as any).mountLayout;
    (ViewComponent.prototype as any).mountLayout = function (this: ViewComponent & HTMLElement) {
      orig.call(this);
      try {
        applyStyles(this);
      } catch (e) {
        console.warn('[Ux3] view style injection failed', e);
      }
    };
    patched = true;
  }

  // P0-2: guard the DOMContentLoaded listener with its own flag
  if (!domListenerAdded && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      sweepDocumentStyles();
    });
    domListenerAdded = true;
  }

  if (!mutationObserverAdded && typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const observer = new MutationObserver(() => {
      scheduleStyleSweep();
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['ux-style', 'data-style', 'class'],
      });
      mutationObserverAdded = true;
    }
  }

  // Hydration often runs after DOMContentLoaded has already fired, so apply
  // styles immediately as well to ensure server-rendered markup gets class
  // injection on first hydrate.
  if (typeof document !== 'undefined' && document.body) {
    sweepDocumentStyles();
  }
}

// ── Light-DOM style injection (centralised, one-shot) ──────────────────────

const _lightStyleInjected = new Set<string>();

/**
 * Register a light-DOM `<style>` block for a widget.
 * Injects into `document.head` exactly once — safe to call at module load.
 * Centralised light-DOM style injection — used by all primitive widgets.
 */
export function registerLightStyle(id: string, css: string): void {
  if (_lightStyleInjected.has(id)) return;
  if (typeof document === 'undefined' || !document.head) return;
  if (document.getElementById(id)) {
    _lightStyleInjected.add(id);
    return;
  }
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
  _lightStyleInjected.add(id);
}
