/**
 * Style Registry
 *
 * Provides a centralized runtime mapping of `ux-style`/`data-style` keys to
 * CSS class strings.  Widgets and server-rendered markup reference styles by
 * name, and the registry is responsible for injecting the corresponding
 * class list when the page is hydrated or when views mount.
 *
 * The IAM example in `examples/iam/app.ts` originally implemented this logic
 * inline; the code below extracts the core behaviour into the library so that
 * every project can enable styling with a single import + registration call.
 *
 * Usage:
 *
 *   import { registerStyles, initStyleRegistry } from '@ux3/ui/style-registry';
 *
 *   registerStyles({ widget: 'p-4 bg-white', actions: 'flex gap-2' });
 *   initStyleRegistry();
 *
 * Styles are automatically applied to the document body on
 * `DOMContentLoaded` and to every `ViewComponent` layout when it mounts.
 * Additional helpers are exported for manual application or clearing during
 * tests.
 */

import { ViewComponent } from './view-component.js';

export type StyleMap = Record<string, string>;

// internal registry store
const styles: StyleMap = {};

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
 * Clear the registry (useful for tests).
 */
export function clearStyles(): void {
  for (const k of Object.keys(styles)) {
    delete styles[k];
  }
}

/**
 * Apply styles to all elements under the given root.  Looks for
 * `[data-style]` or `[ux-style]` attributes and sets `className` according to
 * the registry.  If a key is missing in the registry the element is left
 * untouched (the build step should_warn earlier).  Accepts Document,
 * ShadowRoot or HTMLElement.
 */
export function applyStyles(root: Document | ShadowRoot | HTMLElement = document): void {
  try {
    let container: Element | Document = root as any;
    // ShadowRoot does not inherit from Document but has querySelectorAll
    if ((root as ShadowRoot).querySelectorAll) {
      container = root as any;
    }

    container.querySelectorAll('[data-style], [ux-style]').forEach((el) => {
      const key = el.getAttribute('data-style') || el.getAttribute('ux-style') || '';
      const cls = styles[key];
      if (cls) {
        (el as HTMLElement).className = cls;
      }
    });
  } catch (e) {
    console.warn('[UX3 style-registry] applyStyles failed', e);
  }
}

let patched = false;

/**
 * Patches ViewComponent.prototype.mountLayout so that styles are applied
 * whenever a view renders, and wires up a DOMContentLoaded listener to
 * process any pre-existing markup.  Safe to call multiple times.
 */
export function initStyleRegistry(): void {
  if (!patched) {
    const orig = ViewComponent.prototype['mountLayout'];
    ViewComponent.prototype['mountLayout'] = function (this: any) {
      orig.call(this);
      try {
        if (this.shadowRoot) applyStyles(this.shadowRoot);
        applyStyles(this as HTMLElement);
      } catch (e) {
        console.warn('[UX3 style-registry] view style injection failed', e);
      }
    };
    patched = true;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      applyStyles(document.body);
    });
  }
}
