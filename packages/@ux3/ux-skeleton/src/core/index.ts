// Core scaffolding
export { scaffold } from './pipeline.js';
export { buildContext } from './context-builder.js';
export { resolveTemplateDir, getTemplateDirSearchPaths } from './template-resolver.js';
export { interpolate, interpolatePath } from './interpolator.js';
export { emitFiles } from './emitter.js';

// Strategies
export {
  defaultCasingStrategy,
  defaultContextProvider,
  defaultFileFilter,
  defaultPathTransformer,
  readUx3Version,
} from './strategies.js';
