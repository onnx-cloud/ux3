export { createCommand } from './commands/create.js';
export { generateCommand } from './commands/generate.js';
export { hintsCommand } from './commands/hints.js';
export { devCommand } from './commands/dev.js';
export { buildCommand } from './commands/build.js';
export { lintCommand } from './commands/lint.js';
export { checkCommand } from './commands/check.js';
export { compileCommand } from './compile.js';
export { configCommand } from './commands/config.js';
export { previewCommand } from './commands/preview.js';

// Template engine (public API for programmatic scaffolding)
export {
  buildContext,
  interpolate,
  loadTemplate,
  emitScaffold,
  resolveTemplateDir,
  type ScaffoldContext,
  type EmitOptions,
} from './template-engine.js';

// Config loading utilities
export {
  loadConfig,
  loadConfigCached,
  clearConfigCache,
  deepMerge,
  getConfigValue,
  setConfigValue,
  type AppConfig,
} from './config-loader.js';
