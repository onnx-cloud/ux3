/**
 * @ux3/ui – public barrel export
 *
 * Re-exports the primary UI primitives so that the bare specifier `@ux3/ui`
 * works for both TypeScript (via tsconfig paths) and esbuild (via the
 * ux3-resolver plugin in bundler.ts).
 */
export { ViewComponent, type TemplateBindings } from './view-component.js';
export type { AppContext, AppContextLoader, AssetDescriptor } from './app.js';
export type { BrowserContext, BrowserContextOptions, Reliability } from './browser-context.js';
export { captureBrowserContext, observeBrowserContext } from './browser-context.js';
export { createBootstrap } from './bootstrap.js';
export { AppContextBuilder, createAppContext, hydrate, type GeneratedConfig, type HydrationOptions } from './context-builder.js';
export { registerStyles, applyStyles, initStyleRegistry, clearStyles, getRegisteredStyles } from './style-registry.js';
