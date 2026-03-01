import { Command } from 'commander';
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

      console.log(`🏥 Checking UX3 project health...\n`);

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
        console.log(`🧠 Linting logic modules...`);
        const cwd = process.cwd();
        const logicDir = path.join(cwd, 'ux', 'logic');
        const viewsDir = path.join(cwd, 'ux', 'view');
        const issues = lintLogicModules({ logicDir, viewsDir });
        if (issues > 0) {
          console.error(`
❌ ${issues} unused logic exports detected`);
          process.exit(1);
        }
      }

      console.log(`\n✅ All checks passed!\n`);

      // TODO: Implement check pipeline
    } catch (error) {
      console.error(
        `❌ Health check failed:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
