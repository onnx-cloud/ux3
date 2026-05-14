export { createCommand } from './commands/create.js';
export { componentCommand } from './commands/component.js';
export { generateCommand } from './commands/generate.js';
export { syncCommand } from './commands/sync.js';
export { devCommand } from './commands/dev.js';
export { selfCommand } from './commands/self.js';
export { buildCommand } from './commands/build.js';
export { lintCommand } from './commands/lint.js';
export { checkCommand } from './commands/check.js';
export { compileCommand } from './compile.ts';
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
