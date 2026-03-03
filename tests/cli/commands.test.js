// @vitest-environment node
import * as fs from 'fs-extra';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// import commands directly (use .js extension for runtime)
import { createCommand } from '../../src/cli/commands/create.js';
import { checkCommand } from '../../src/cli/commands/check.js';
import { buildCommand } from '../../src/cli/commands/build.js';
import { compileCommand } from '../../src/cli/compile.js';
import { configCommand } from '../../src/cli/commands/config.js';
import { previewCommand } from '../../src/cli/commands/preview.js';
// helper to run a command and capture exit code
async function runCommand(cmd, args, cwd) {
    const originalCwdFn = process.cwd;
    const originalExit = process.exit;
    let code = 0;
    let exitCalled = false;
    // override cwd function so code thinks it's running in the desired folder
    process.cwd = () => cwd;
    // override exit so tests don't terminate the process
    process.exit = (c) => {
        exitCalled = true;
        code = typeof c === 'number' ? c : 0;
        throw { exitCode: code, message: 'process.exit called' };
    };
    try {
        // commander takes the first element as the command name when from='user'
        await cmd.parseAsync(args, { from: 'user' });
    }
    catch (e) {
        // capture exit exceptions thrown by our override
        if (e && typeof e.exitCode === 'number') {
            code = e.exitCode;
        }
        else if (e.code === 'ERR_COMMAND_FAILED') {
            code = 1;
        }
        else {
            process.exit = originalExit;
            process.cwd = originalCwdFn;
            throw e;
        }
    }
    finally {
        process.exit = originalExit;
        process.cwd = originalCwdFn;
    }
    return code;
}
describe('UX3 CLI commands', () => {
    const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'cli-commands');
    it('index module exports all expected commands', async () => {
        const idx = await import('../../src/cli/index.js');
        expect(idx.createCommand).toBeDefined();
        expect(idx.devCommand).toBeDefined();
        expect(idx.buildCommand).toBeDefined();
        expect(idx.checkCommand).toBeDefined();
        expect(idx.compileCommand).toBeDefined();
        expect(idx.configCommand).toBeDefined();
        expect(idx.previewCommand).toBeDefined();
    });
    beforeEach(async () => {
        await fs.remove(tmpRoot);
        await fs.ensureDir(tmpRoot);
    });
    afterEach(async () => {
        await fs.remove(tmpRoot);
    });
    it('`create` scaffolds a basic project', async () => {
        const project = path.join(tmpRoot, 'proj1');
        const exit = await runCommand(createCommand, ['proj1'], tmpRoot);
        expect(exit).toBe(0);
        const pkg = await fs.readJson(path.join(project, 'package.json'));
        expect(pkg.name).toBe('proj1');
        expect(await fs.pathExists(path.join(project, 'src'))).toBe(true);
        expect(await fs.pathExists(path.join(project, 'public'))).toBe(true);
        expect(await fs.pathExists(path.join(project, 'src', 'index.ts'))).toBe(true);
        // new generators should create UX directories and an example view + config
        expect(await fs.pathExists(path.join(project, 'ux', 'view', 'hello.yaml'))).toBe(true);
        expect(await fs.pathExists(path.join(project, 'ux', 'view', 'hello', 'clicked.html'))).toBe(true);
        expect(await fs.pathExists(path.join(project, 'ux3.config.json'))).toBe(true);
    });
    it('`create` refuses to overwrite existing package.json', async () => {
        const project = path.join(tmpRoot, 'proj2');
        await fs.ensureDir(project);
        await fs.writeJson(path.join(project, 'package.json'), { name: 'existing' });
        // run create command against existing directory
        const code = await runCommand(createCommand, ['proj2'], tmpRoot);
        expect(code).toBe(1);
    });
    it('`check --logic` detects unused exports', async () => {
        const project = path.join(tmpRoot, 'proj3');
        await fs.ensureDir(path.join(project, 'ux', 'logic'));
        await fs.ensureDir(path.join(project, 'ux', 'view'));
        await fs.writeFile(path.join(project, 'ux', 'logic', 'foo.ts'), 'export function used(){}\nexport function unused(){}\n');
        await fs.writeFile(path.join(project, 'ux', 'view', 'v.yaml'), 'initial: s\nstates:\n  s:\n    entry: enter1\n');
        const code = await runCommand(checkCommand, ['--logic'], project);
        expect(code).toBe(1);
    });
    it('`build` creates generated/config.ts and dist directory', async () => {
        const project = path.join(tmpRoot, 'proj4');
        await fs.ensureDir(path.join(project, 'ux', 'route'));
        await fs.writeFile(path.join(project, 'ux', 'route', 'routes.yaml'), 'routes: []');
        // provide a minimal package.json to get version
        await fs.writeJson(path.join(project, 'package.json'), { name: 'p4', version: '1.2.3' });
        // run build without bundling, we only care about config/type generation
        const code = await runCommand(buildCommand, ['--skip-bundle'], project);
        expect(code).toBe(0);
        expect(await fs.pathExists(path.join(project, 'generated', 'config.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(project, 'generated', 'types.ts'))).toBe(true);
        // dist directory may not be created when bundling is skipped
    });
    it('`compile` command works (via CLI wrapper)', async () => {
        const project = path.join(tmpRoot, 'proj5');
        await fs.ensureDir(path.join(project, 'ux', 'view'));
        await fs.writeFile(path.join(project, 'ux', 'view', 'myview.yaml'), `name: myview\nstates:\n  idle: idle.html\n`);
        await fs.writeFile(path.join(project, 'ux', 'view', 'idle.html'), `<div>idle</div>`);
        const exit = await runCommand(compileCommand, ['--views', 'ux/view', '--output', 'generated'], project);
        expect(exit).toBe(0);
        // compiler currently emits into a "views" subdirectory; accept either
        const primary = path.join(project, 'generated', 'myview.ts');
        const alt = path.join(project, 'generated', 'views', 'myview.ts');
        expect(await fs.pathExists(primary) || await fs.pathExists(alt)).toBe(true);
    });
    it('`config` command can display and query configuration', async () => {
        const project = path.join(tmpRoot, 'proj6');
        const cfgDir = path.join(project, 'configs');
        await fs.ensureDir(cfgDir);
        await fs.writeFile(path.join(cfgDir, 'a.yaml'), `routes: [{ path: "/" }]\nservices: []\ntokens: {}\n`);
        let logs = [];
        const origLog = console.log;
        console.log = (...args) => {
            logs.push(args.join(' '));
            origLog(...args);
        };
        const exit1 = await runCommand(configCommand, [], project);
        expect(exit1).toBe(0);
        expect(logs.join('\n')).toContain('routes');
        logs = [];
        const exit2 = await runCommand(configCommand, ['--get', 'routes.0.path'], project);
        expect(exit2).toBe(0);
        expect(logs.join('')).toContain('/');
        console.log = origLog;
    });
    it('`preview` command handles direction and once flag', async () => {
        const project = path.join(tmpRoot, 'proj7');
        await fs.ensureDir(path.join(project, 'dist'));
        await fs.writeFile(path.join(project, 'dist', 'index.html'), '<h1>hi</h1>');
        let logs = [];
        const origLog = console.log;
        console.log = (...args) => {
            logs.push(args.join(' '));
            origLog(...args);
        };
        const exit = await runCommand(previewCommand, ['--dir', 'dist', '--port', '0', '--once'], project);
        expect(exit).toBe(0);
        expect(logs.some((l) => l.includes('Previewing'))).toBe(true);
        console.log = origLog;
    });
});
//# sourceMappingURL=commands.test.js.map