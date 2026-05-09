import { Command } from 'commander';
import fsSync from 'fs';
import path from 'path';

function findUxDir(cwd = process.cwd()): string | null {
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    const ux = path.join(dir, 'ux');
    if (fsSync.existsSync(ux) && fsSync.statSync(ux).isDirectory()) return ux;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadYaml(filePath: string): any {
  try {
    const yaml = require('js-yaml');
    return yaml.load(fsSync.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export const fsmCommand = new Command('fsm')
  .description('Inspect FSM state machines')
  .option('--list', 'List all FSMs and their current states')
  .option('--snapshot', 'Full FSM state dump')
  .action(async (options) => {
    const uxDir = findUxDir();
    if (!uxDir) {
      console.error('No ux directory found. Run from a UX3 project root.');
      process.exit(1);
    }

    const widgetsDir = path.join(uxDir, 'widget');
    if (!fsSync.existsSync(widgetsDir)) {
      console.log('No widget directory found.');
      return;
    }

    const files = fsSync.readdirSync(widgetsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    if (files.length === 0) {
      console.log('No FSM configs found.');
      return;
    }

    const fsms: Array<{ name: string; initial: string; states: string[] }> = [];

    for (const file of files) {
      const config = loadYaml(path.join(widgetsDir, file));
      if (!config?.states) continue;
      const name = config.name || file.replace(/\.ya?ml$/, '');
      const states = Object.keys(config.states);
      fsms.push({
        name,
        initial: config.initial || states[0] || '?',
        states,
      });
    }

    if (options.snapshot) {
      for (const fsm of fsms) {
        console.log(`\n=== ${fsm.name} ===`);
        console.log(`  initial: ${fsm.initial}`);
        console.log(`  states:`);
        for (const state of fsm.states) {
          console.log(`    - ${state}`);
        }
        const fsmConfig = loadYaml(path.join(widgetsDir, `${fsm.name}.yaml`));
        if (fsmConfig?.states) {
          for (const [stateName, stateCfg] of Object.entries(fsmConfig.states) as [string, any][]) {
            if (stateCfg.on) {
              const events = Object.keys(stateCfg.on);
              if (events.length) {
                console.log(`      ${stateName} -> events: ${events.join(', ')}`);
              }
            }
          }
        }
      }
      return;
    }

    // Default --list
    console.log('FSM'.padEnd(20) + 'INITIAL'.padEnd(15) + 'STATES');
    console.log('-'.repeat(55));
    for (const fsm of fsms) {
      console.log(fsm.name.padEnd(20) + fsm.initial.padEnd(15) + fsm.states.join(', '));
    }
  });
