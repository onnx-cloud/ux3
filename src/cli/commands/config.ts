import { Command } from 'commander';
import {
  loadConfigCached,
  getConfigValue,
} from '../config-loader.js';

/**
 * `ux3 config` command - inspect project configuration
 */
export const configCommand = new Command()
  .name('config')
  .description('Inspect project configuration')
  .option('--get <path>', 'dot‑notation path to a specific value')
  .action(async (options) => {
    try {
      const config = await loadConfigCached(process.cwd(), {
        logLoading: false,
        validateMandatory: false,
      });

      if (options.get) {
        const value = getConfigValue(config, options.get);
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (err: any) {
      console.error(
        `❌ Failed to load config:`,
        err instanceof Error ? err.message : String(err)
      );
      process.exit(1);
    }
  });
