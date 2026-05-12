// Export all scaffolding APIs
export { scaffold } from './core/pipeline.js';
export { buildContext } from './core/context-builder.js';
export { resolveTemplateDir, getTemplateDirSearchPaths } from './core/template-resolver.js';
export { interpolate, interpolatePath } from './core/interpolator.js';
export { emitFiles } from './core/emitter.js';

// Export strategies
export {
  defaultCasingStrategy,
  defaultContextProvider,
  defaultFileFilter,
  defaultPathTransformer,
  readUx3Version,
} from './core/strategies.js';

// Export types
export type { ScaffoldContext, ScaffoldConfig, ScaffoldEvent, ScaffoldResult } from './types.js';
export type { CasingStrategy, ContextProvider, FileFilter, PathTransformer } from './types.js';
