import type { ScaffoldContext } from '../types.js';

/**
 * Replace [[ TOKEN ]] placeholders with values from context.
 * Leaves {{ }} entirely untouched (UX3 runtime template syntax).
 */
export function interpolate(template: string, ctx: ScaffoldContext): string {
  return template.replace(/\[\[\s*([\w.]+)\s*\]\]/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(ctx, key) ? String(ctx[key]) : `[[${key}]]`;
  });
}

/**
 * Interpolate path with context tokens.
 */
export function interpolatePath(p: string, ctx: ScaffoldContext): string {
  return interpolate(p, ctx);
}
