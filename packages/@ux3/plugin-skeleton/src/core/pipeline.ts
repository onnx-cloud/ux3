import type { ScaffoldConfig, ScaffoldResult, StrategyMap } from '../types.js';
import { buildContext } from './context-builder.js';
import { resolveTemplateDir } from './template-resolver.js';
import { emitFiles } from './emitter.js';
import {
  defaultCasingStrategy,
  defaultContextProvider,
  defaultFileFilter,
  defaultPathTransformer,
} from './strategies.js';

/**
 * Main scaffolding pipeline: orchestrates all steps.
 */
export async function scaffold(config: ScaffoldConfig): Promise<ScaffoldResult> {
  // Resolve strategies with defaults
  const strategies: StrategyMap = {
    casing: config.strategies?.casing ?? defaultCasingStrategy,
    contextProvider: config.strategies?.contextProvider ?? defaultContextProvider,
    fileFilter: config.strategies?.fileFilter ?? defaultFileFilter,
    pathTransformer: config.strategies?.pathTransformer ?? defaultPathTransformer,
  };

  // Build context
  const ctx = await buildContext(config.name, strategies.casing, strategies.contextProvider);

  // Resolve template directory
  const templateDir = resolveTemplateDir(config.section, config.projectRoot);

  // Emit files
  const result = await emitFiles(templateDir, ctx, config.targetDir, {
    dryRun: config.dryRun,
    force: config.force,
    fileFilter: strategies.fileFilter,
    pathTransformer: strategies.pathTransformer,
  });

  return result;
}
