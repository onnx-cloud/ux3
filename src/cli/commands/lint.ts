import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { lintLogicModules } from '../logic-lint.js';
import { Validator } from '../../build/validator.js';

function resolveProjectRoot(project?: string): string {
	return project ? path.resolve(project) : process.cwd();
}

function countViewArtifacts(projectDir: string): number {
	const widgetDir = path.join(projectDir, 'ux', 'widget');
	const viewDir = path.join(projectDir, 'ux', 'view');
	const roots = [widgetDir, viewDir].filter((dir) => fs.existsSync(dir));
	if (roots.length === 0) return 0;

	const stack = [...roots];
	let count = 0;
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(fullPath);
				continue;
			}
			if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
				count += 1;
			}
		}
	}

	return count;
}

function countLeafKeys(value: unknown): number {
	if (Array.isArray(value)) {
		return value.reduce<number>((sum, item) => sum + countLeafKeys(item), 0);
	}
	if (value && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + countLeafKeys(item), 0);
	}
	return 1;
}

function countI18nKeys(projectDir: string): number {
	const i18nDir = path.join(projectDir, 'ux', 'i18n');
	if (!fs.existsSync(i18nDir)) return 0;

	const stack = [i18nDir];
	let count = 0;
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(fullPath);
				continue;
			}
			if (!entry.isFile()) continue;
			const text = fs.readFileSync(fullPath, 'utf-8');
			if (entry.name.endsWith('.json')) {
				count += countLeafKeys(JSON.parse(text));
			} else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
				count += countLeafKeys(YAML.parse(text));
			}
		}
	}

	return count;
}

function countRoutes(projectDir: string): number {
	const routesPath = path.join(projectDir, 'ux', 'route', 'routes.yaml');
	if (!fs.existsSync(routesPath)) return 0;

	const routesData = YAML.parse(fs.readFileSync(routesPath, 'utf-8'));
	return Array.isArray(routesData?.routes) ? routesData.routes.length : 0;
}

function formatLintSummary(projectDir: string): string {
	return `✅ lint passed - views: ${countViewArtifacts(projectDir)} - i18n: ${countI18nKeys(projectDir)} - routes: ${countRoutes(projectDir)}`;
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
					viewsDir: path.join(projectDir, 'ux', 'widget'),
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
			const uxDir = path.join(projectDir, 'ux');

			console.log(`[ux3 lint] project=${projectDir} strict=${strict}`);
			if (!fs.existsSync(uxDir)) {
				console.error('\nLint errors:');
				console.error(`- ux - Missing required ux directory at ${uxDir}`);
				process.exit(1);
			}

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

			console.log(`\n${formatLintSummary(projectDir)}`);
		} catch (err) {
			console.error('❌ lint failed:', err instanceof Error ? err.message : String(err));
			process.exit(1);
		}
	});

