#!/usr/bin/env node

import { program } from 'commander';
import { createCommand } from './commands/create.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { checkCommand } from './commands/check.js';
import { compileCommand } from './compile.js';

const version = '0.1.0';

program.version(version).description('UX3 - Lightweight SPA framework CLI');

program.addCommand(createCommand);
program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(checkCommand);
program.addCommand(compileCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
