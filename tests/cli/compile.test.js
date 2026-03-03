// @vitest-environment node
import fs from 'fs-extra';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeTemplate } from '../..//src/build/view-compiler.ts';
import { runCompiler, loadConfig } from '../../src/cli/compile.ts';
// simple tests for view compiler utilities and compile CLI
describe('View compiler helpers', () => {
    it('analyzeTemplate picks up fields and events', () => {
        const html = `<div>{{this.foo}}</div><button ux-event="CLICK"></button>`;
        const result = analyzeTemplate(html);
        expect(result.fields.some(f => f.name === 'foo')).toBe(true);
        expect(result.events.includes('CLICK')).toBe(true);
    });
});
describe('compile CLI', () => {
    const tmp = path.join(process.cwd(), 'tests/tmp/compile');
    beforeEach(async () => {
        await fs.remove(tmp);
        await fs.ensureDir(tmp);
    });
    afterEach(async () => {
        await fs.remove(tmp);
    });
    it('runCompiler generates output from a simple view', async () => {
        // prepare a minimal ux/view structure
        const viewsDir = path.join(tmp, 'ux', 'view');
        await fs.ensureDir(viewsDir);
        const yaml = `name: myview\nstates:\n  idle: idle.html\n`;
        await fs.writeFile(path.join(viewsDir, 'myview.yaml'), yaml);
        // create corresponding template
        await fs.writeFile(path.join(viewsDir, 'idle.html'), `<div>idle</div>`);
        const outDir = path.join(tmp, 'generated');
        await runCompiler({ views: viewsDir, output: outDir });
        expect(await fs.pathExists(path.join(outDir, 'myview.ts'))).toBe(true);
    });
    it('loadConfig reads YAML compile config', async () => {
        const cfgPath = path.join(tmp, 'ux3.config.yaml');
        const cfgText = `compile:\n  views: ./foo\n  output: ./out\n`;
        await fs.writeFile(cfgPath, cfgText);
        const cfg = await loadConfig(cfgPath);
        expect(cfg.views).toBe('./foo');
        expect(cfg.output).toBe('./out');
    });
});
//# sourceMappingURL=compile.test.js.map