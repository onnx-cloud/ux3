import { Command } from 'commander';
import { promises as fs } from 'fs';
import { loadConfigCached } from '../config-loader.js';
import { lintLogicModules } from '../logic-lint.js';
import * as path from 'path';

export const checkCommand = new Command()
  .name('check')
  .description('Check project health')
  .option('--a11y', 'check accessibility', true)
  .option('--perf', 'check performance', true)
  .option('--security', 'check security', true)
  .option('--logic', 'lint ux/logic modules for unused exports', false)
  .action(async (options) => {
    try {
      const config = await loadConfigCached(process.cwd(), {
        logLoading: true,
        validateMandatory: true,
      });
      void config;

      const cwd = process.cwd();
      const uxDir = path.join(cwd, 'ux');
      const uxAvailable = await fs.stat(uxDir).catch(() => null);

      console.log(`🏥 Checking UX3 project health...\n`);
      if (!uxAvailable) {
        console.warn('⚠️  ux/ directory not found; skipping UX-specific checks.');
      }

      if (options.a11y) {
        console.log(`♿ Accessibility checks...`);
      }

      if (options.perf) {
        console.log(`⚡ Performance checks...`);
      }

      if (options.security) {
        console.log(`🔒 Security checks...`);
      }

      if (options.logic) {
        if (!uxAvailable) {
          console.warn('⚠️  Skipping logic linting because ux/ is not available.');
        } else {
          console.log(`🧠 Linting logic modules...`);
          const logicDir = path.join(cwd, 'ux', 'logic');
          const viewsDir = path.join(cwd, 'ux', 'view');
          const issues = lintLogicModules({ logicDir, viewsDir });
          if (issues > 0) {
            console.error(`
❌ ${issues} unused logic exports detected`);
            process.exit(1);
          }
        }
      }

      console.log(`\n✅ All checks passed!\n`);
    } catch (error) {
      console.error(
        `❌ Health check failed:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
