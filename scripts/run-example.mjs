#!/usr/bin/env node

/**
 * UX3 Example Runner
 * 
 * Usage:
 *   npm run example              # List available examples
 *   npm run example <name>       # Run specific example
 *   npm run example todo         # Run todo example
 *   npm run example iam          # Run iam example
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const examplesDir = join(__dirname, '../examples');

/**
 * Get list of available examples
 * @returns {string[]} Example names
 */
function getExamples() {
  try {
    const items = readdirSync(examplesDir);
    return items.filter(item => {
      const fullPath = join(examplesDir, item);
      const stat = statSync(fullPath);
      return stat.isDirectory() && !item.startsWith('.');
    });
  } catch (error) {
    console.error('Error reading examples directory:', error.message);
    return [];
  }
}

/**
 * Display available examples
 */
function listExamples() {
  const examples = getExamples();
  
  console.log('\n📦 UX3 Examples\n');
  console.log('Available examples:');
  examples.forEach(example => {
    console.log(`  npm run example ${example}`);
  });
  console.log('\n');
}

/**
 * Run a specific example
 * @param {string} exampleName - Name of the example to run
 */
function runExample(exampleName) {
  const examples = getExamples();
  
  if (!examples.includes(exampleName)) {
    console.error(`❌ Example "${exampleName}" not found\n`);
    listExamples();
    process.exit(1);
  }
  
  const exampleDir = join(examplesDir, exampleName);
  const packageJsonPath = join(exampleDir, 'package.json');

  // Helper: check whether a CLI command exists
  function hasCommand(cmd) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return true;
    } catch (err) {
      return false;
    }
  }

  // Helper: run local built CLI (build root if needed)
  function runLocalCliDev() {
    const rootDir = join(__dirname, '..');
    const distCli = join(rootDir, 'dist', 'cli', 'cli.js');
    try {
      statSync(distCli);
    } catch (err) {
      console.log('🔧 Building local CLI (root) to run example...');
      execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    }
    // Run the CLI directly
    execSync(`node ${distCli} dev`, { cwd: exampleDir, stdio: 'inherit' });
  }
  
  try {
    // Check if package.json exists
    statSync(packageJsonPath);
    
    console.log(`\n🚀 Starting ${exampleName} example...\n`);
    
    // Install dependencies and start dev server, prefer pnpm (workspace support)
    const usePnpm = (() => {
      try {
        execSync('pnpm -v', { stdio: 'ignore' });
        return true;
      } catch (err) {
        return false;
      }
    })();

    if (usePnpm) {
      console.log('⚙️  Using pnpm for workspace install and scripts');
      try {
        execSync('pnpm install', { cwd: exampleDir, stdio: 'inherit' });
      } catch (err) {
        console.warn('⚠️  pnpm install failed, continuing...');
      }

      try {
        if (hasCommand('ux3')) {
          execSync('pnpm run dev', { cwd: exampleDir, stdio: 'inherit' });
        } else {
          console.log('⚠️  ux3 CLI not found; falling back to local build of CLI');
          runLocalCliDev();
        }
      } catch (err) {
        console.log(`\n✅ ${exampleName} example stopped\n`);
      }
    } else {
      console.log('⚠️  pnpm not found, falling back to npm (workspace packages may fail)');
      try {
        execSync('npm install', { cwd: exampleDir, stdio: 'inherit' });
      } catch (error) {
        console.warn(`⚠️  npm install failed, but continuing...`);
      }

      try {
        if (hasCommand('ux3')) {
          execSync('npm run dev', { cwd: exampleDir, stdio: 'inherit' });
        } else {
          console.log('⚠️  ux3 CLI not found; falling back to local build of CLI');
          runLocalCliDev();
        }
      } catch (error) {
        console.log(`\n✅ ${exampleName} example stopped\n`);
      }
    }
  } catch (error) {
    console.error(`❌ Error running example: ${error.message}`);
    process.exit(1);
  }
}

// Main entry point
const arg = process.argv[2];

if (!arg) {
  listExamples();
} else {
  runExample(arg);
}
