import * as fs from 'fs';
import * as path from 'path';
import { lintLogicModules, gatherReferencedNames, parseExports } from '../../src/cli/logic-lint.js';
describe('Logic Lint Utility', () => {
    const tmpDir = path.join(__dirname, '..', 'tmp', 'logic-lint');
    beforeEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.mkdirSync(tmpDir, { recursive: true });
    });
    it('parses exports correctly', () => {
        const file = path.join(tmpDir, 'foo.ts');
        fs.writeFileSync(file, `export function a(){}\nexport const b = 1;\nexport {c as d};\n`);
        const exports = parseExports(file);
        expect(exports.has('a')).toBe(true);
        expect(exports.has('b')).toBe(true);
        expect(exports.has('d')).toBe(true); // alias should be picked up
    });
    it('gathers referenced names from YAML views', () => {
        const views = path.join(tmpDir, 'view');
        fs.mkdirSync(views, { recursive: true });
        const yaml = `initial: s\nstates:\n  s:\n    on:\n      X: {guard: g1, actions: [a1]}\n    entry: e1\n    exit: e2\n`;
        fs.writeFileSync(path.join(views, 'v.yaml'), yaml);
        const refs = gatherReferencedNames(views);
        expect(refs.has('g1')).toBe(true);
        expect(refs.has('a1')).toBe(true);
        expect(refs.has('e1')).toBe(true);
        expect(refs.has('e2')).toBe(true);
    });
    it('detects unused logic exports', () => {
        const logic = path.join(tmpDir, 'logic');
        const views = path.join(tmpDir, 'view');
        fs.mkdirSync(logic, { recursive: true });
        fs.mkdirSync(views, { recursive: true });
        fs.writeFileSync(path.join(logic, 'v.ts'), `export function used(){}\nexport function unused(){}\n`);
        fs.writeFileSync(path.join(views, 'v.yaml'), `initial: s\nstates:\n  s:\n    on:\n      X: {guard: used}\n`);
        const count = lintLogicModules({ logicDir: logic, viewsDir: views });
        expect(count).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=logic-lint.test.js.map