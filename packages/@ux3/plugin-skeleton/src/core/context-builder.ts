import type { ScaffoldContext, CasingStrategy, ContextProvider } from '../types.js';
import { defaultCasingStrategy, readUx3Version, defaultContextProvider } from './strategies.js';

/**
 * Build a ScaffoldContext from a raw name and optional extra tokens.
 */
export async function buildContext(
  raw: string,
  casing: CasingStrategy = defaultCasingStrategy,
  provider: ContextProvider = defaultContextProvider,
  extra?: Record<string, string>
): Promise<ScaffoldContext> {
  const now = new Date();
  const casings = casing(raw);
  const base: ScaffoldContext = {
    ...casings,
    year: String(now.getFullYear()),
    date: now.toISOString().slice(0, 10),
    ux3Version: readUx3Version(),
    ...extra,
  };

  return provider(base);
}
