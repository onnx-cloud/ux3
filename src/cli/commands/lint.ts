import { Command } from 'commander';
import path from 'path';
import { lintLogicModules } from '../logic-lint.js';

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
	.description('Validate basic project structure')
	.option('--project <dir>', 'project directory', '.')
	.action(async (options: { project?: string }) => {
		try {
			const projectDir = resolveProjectRoot(options.project);
			const uxDir = path.join(projectDir, 'ux');
			if (!(await import('fs')).existsSync(uxDir)) {
				console.error(`❌ ux directory not found: ${uxDir}`);
				process.exit(1);
			}
		} catch (err) {
			console.error('❌ lint failed:', err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});

