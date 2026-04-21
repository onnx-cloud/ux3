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
import { styleCommand } from './commands/style.js';
import { generateCommand } from './commands/generate.js';
import { hintsCommand } from './commands/hints.js';

const version = '0.1.0';

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
program.addCommand(styleCommand);
program.addCommand(generateCommand);
program.addCommand(hintsCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
