#!/usr/bin/env node

import { program } from 'commander';
import { createCommand } from './commands/create.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { checkCommand } from './commands/check.js';
import { lintCommand } from './commands/lint.js';
import { compileCommand } from './compile.js';
import { configCommand } from './commands/config.js';
import { previewCommand } from './commands/preview.js';
import { contentCommand } from './commands/content.js';
import { helpCommand } from './commands/help.js';
import { pluginCommand } from './commands/plugin.js';
import { componentCommand } from './commands/component.js';
import { styleCommand } from './commands/style.js';
import { generateCommand } from './commands/generate.js';
import { syncCommand } from './commands/sync.js';
import { translateCommand } from './commands/translate.js';
import { routesCommand } from './commands/routes.js';
import { fsmCommand } from './commands/fsm.js';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const { version } = _require('../../package.json') as { version: string };

program.version(version).description('UX3 - Lightweight SPA framework CLI');

program.addCommand(createCommand);
program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(lintCommand);
program.addCommand(checkCommand);
program.addCommand(compileCommand);
program.addCommand(configCommand);
program.addCommand(previewCommand);
program.addCommand(contentCommand);
program.addCommand(helpCommand);
program.addCommand(pluginCommand);
program.addCommand(componentCommand);
program.addCommand(styleCommand);
program.addCommand(generateCommand);
program.addCommand(syncCommand);
program.addCommand(translateCommand);
program.addCommand(routesCommand);
program.addCommand(fsmCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
