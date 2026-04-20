import path from 'path';
import { Validator } from '../build/validator.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const projectDirArgIndex = args.indexOf('--projectDir');
  const projectDir = projectDirArgIndex !== -1 ? args[projectDirArgIndex + 1] : process.cwd();
  const strict = args.includes('--strict') || args.includes('-s');

  console.log(`[ux3 validate] projectDir=${projectDir} strict=${strict}`);

  const validator = new Validator({ projectDir, failOnWarnings: strict });
  const result = await validator.validate();

  if (result.errors.length > 0) {
    console.error('Validation errors:');
    for (const e of result.errors) {
      console.error(`- ${e.file}${e.line ? `:${e.line}` : ''} - ${e.message}`);
    }
  }

  if ((result.warnings || []).length > 0) {
    console.warn('Validation warnings:');
    if (result.warnings) {
      for (const w of result.warnings) {
        console.warn(`- ${w.file} - ${w.message}`);
      }
    }
  }

  if (!result.valid) process.exit(1);
  console.log('\nValidation passed');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(2);
});