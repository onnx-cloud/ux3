import { Command } from 'commander';
import path from 'path';
import { lintLogicModules } from '../logic-lint.js';
import { Validator } from '../../build/validator.js';

function resolveProjectRoot(project?: string): string {
	return project ? path.resolve(project) : process.cwd();
}

export const checkCommand = new Command()
	.name('check')
	.description('Run project checks')
	.option('--project <dir>', 'project directory', '.')
	.option('--logic', 'lint logic exports referenced by view YAML files')
	.action(async (options: { project?: string; logic?: boolean }) => {
		try {
			const projectDir = resolveProjectRoot(options.project);

			if (options.logic) {
				const unused = lintLogicModules({
					logicDir: path.join(projectDir, 'ux', 'logic'),
					viewsDir: path.join(projectDir, 'ux', 'view'),
				});
				if (unused > 0) {
					process.exit(1);
				}
				return;
			}

			// No check selected, succeed by default.
		} catch (err) {
			console.error('❌ check failed:', err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});

export const lintCommand = new Command()
	.name('lint')
	.description('Run UX3 lint checks and idiom validation')
	.option('--project <dir>', 'project directory', '.')
	.option('--no-strict', 'do not fail on warnings (default: fail on warnings)')
	.action(async (options: { project?: string; strict?: boolean }) => {
		try {
			const projectDir = resolveProjectRoot(options.project);
			const strict = options.strict ?? true;

			console.log(`[ux3 lint] project=${projectDir} strict=${strict}`);
			const validator = new Validator({ projectDir, failOnWarnings: strict });
			const result = await validator.validate();

			if (result.errors.length > 0) {
				console.error('\nLint errors:');
				for (const error of result.errors) {
					const loc = error.line ? `${error.file}:${error.line}` : error.file;
					console.error(`- ${loc} - ${error.message}`);
					if (error.suggestion) {
						console.error(`  suggestion: ${error.suggestion}`);
					}
				}
			}

			if ((result.warnings || []).length > 0) {
				console.warn('\nLint warnings:');
				for (const warning of result.warnings || []) {
					const loc = warning.line ? `${warning.file}:${warning.line}` : warning.file;
					console.warn(`- ${loc} - ${warning.message}`);
					if (warning.suggestion) {
						console.warn(`  suggestion: ${warning.suggestion}`);
					}
				}
			}

			if (!result.valid) {
				process.exit(1);
			}

			console.log('\n✅ Lint passed');
		} catch (err) {
			console.error('❌ lint failed:', err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});

