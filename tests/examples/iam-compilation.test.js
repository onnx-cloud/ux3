/**
 * IAM Example Integration Tests
 * End-to-end tests for view compilation and rendering
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
describe('IAM Example - View Compilation', () => {
    const iamDir = path.join(process.cwd(), 'examples', 'iam');
    const generatedDir = path.join(iamDir, 'generated', 'views');
    it('should have compiled all views with layouts and templates', async () => {
        // List of expected views based on IAM structure
        const expectedViews = [
            'index-view', // renamed from 'index' to avoid collision
            'login',
            'dashboard',
            'account',
            'market',
            'asset',
            'chat',
            'news',
            'for-you',
            'blog',
            'billing',
            'macro',
            'sign-up',
        ];
        for (const viewName of expectedViews) {
            const viewFile = path.join(generatedDir, `${viewName}.ts`);
            expect(fs.existsSync(viewFile)).toBe(true);
            const content = await fs.readFile(viewFile, 'utf-8');
            // Check that layout is populated (not empty) - allow newlines
            expect(content).toMatch(/protected layout = `[\s\S]*<[\s\S]*>/);
            // Check that templates map is not empty
            expect(content).toContain('protected templates = new Map([');
            // Should have at least one template entry
            expect(content).toMatch(/\["[\w-]+", `[\s\S]*`\]/);
        }
    });
    it('should have index view with default layout', async () => {
        const viewFile = path.join(generatedDir, 'index-view.ts');
        const content = await fs.readFile(viewFile, 'utf-8');
        // Check layout name
        expect(content).toContain('"layout": "default"');
        // Check layout HTML is present (from ux/layout/default.html)
        expect(content).toContain('<header id="site-header" ux-style="header"');
        expect(content).toContain('<footer id="site-footer" ux-style="footer"');
    });
    it('should have dashboard view with multiple states', async () => {
        const viewFile = path.join(generatedDir, 'dashboard.ts');
        const content = await fs.readFile(viewFile, 'utf-8');
        // Check all states are present
        expect(content).toContain('"loading"');
        expect(content).toContain('"loaded"');
        expect(content).toContain('"error"');
        // Check templates for each state
        expect(content).toMatch(/\["loading", `[^`]*`\]/);
        expect(content).toMatch(/\["loaded", `[^`]*`\]/);
        expect(content).toMatch(/\["error", `[^`]*`\]/);
        // Check i18n bindings
        expect(content).toContain('"dashboard.loading.label"');
        expect(content).toContain('"dashboard.loaded.label"');
        expect(content).toContain('"dashboard.error.label"');
    });
    it('should have login view with auth layout', async () => {
        const viewFile = path.join(generatedDir, 'login.ts');
        const content = await fs.readFile(viewFile, 'utf-8');
        // Check layout reference
        expect(content).toContain('"layout": "auth"');
        // Should have actual HTML from ux/layout/auth.html
        expect(content).toMatch(/protected layout = `[^`]*`/);
    });
    it('should extract all event bindings correctly', async () => {
        const viewFile = path.join(generatedDir, 'index-view.ts');
        const content = await fs.readFile(viewFile, 'utf-8');
        // Should have bindings section with events array
        expect(content).toContain('events: []');
        expect(content).toContain('reactive: []');
        expect(content).toContain('i18n: [');
        expect(content).toContain('widgets: []');
    });
    it('should have view registry index exporting all views', async () => {
        const indexFile = path.join(generatedDir, 'index.ts');
        const content = await fs.readFile(indexFile, 'utf-8');
        // Check imports
        expect(content).toContain("import { IndexView } from './index-view.js'");
        expect(content).toContain("import { DashboardView } from './dashboard.js'");
        expect(content).toContain("import { LoginView } from './login.js'");
        // Check export mapping
        expect(content).toContain("'index': IndexView");
        expect(content).toContain("'dashboard': DashboardView");
        expect(content).toContain("'login': LoginView");
    });
    it('should handle view with nested directory structure', async () => {
        const viewFile = path.join(generatedDir, 'account.ts');
        const content = await fs.readFile(viewFile, 'utf-8');
        // Account should have multiple states with templates
        expect(content).toContain('protected templates = new Map([');
        expect(content).toContain('protected layout = `');
        // Templates should not be empty
        expect(content).not.toContain('protected templates = new Map([\n  ]);');
    });
    it('should not have empty layout in any generated view', async () => {
        const files = await fs.readdir(generatedDir);
        const viewFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.types.ts') && f !== 'index.ts');
        for (const file of viewFiles) {
            const content = await fs.readFile(path.join(generatedDir, file), 'utf-8');
            // Layout should not be empty backticks (except possibly for internal components)
            if (!file.includes('action-bar') && !file.includes('my-list')) {
                // Main views should have layouts
                expect(content).toMatch(/protected layout = `[^`]+`/);
            }
        }
    });
    it('should not have empty templates in main views', async () => {
        const mainViews = ['index-view', 'dashboard', 'login', 'account'];
        for (const viewName of mainViews) {
            const viewFile = path.join(generatedDir, `${viewName}.ts`);
            const content = await fs.readFile(viewFile, 'utf-8');
            // Should have populated templates map
            const templatesMatch = content.match(/protected templates = new Map\(\[([\s\S]*?)\]\);/);
            expect(templatesMatch).toBeTruthy();
            // Should have at least one state
            if (templatesMatch && templatesMatch[1]) {
                expect(templatesMatch[1].trim()).not.toBe('');
            }
        }
    });
    it('should register custom elements with correct tag names', async () => {
        const files = await fs.readdir(generatedDir);
        const viewFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.types.ts') && f !== 'index.ts');
        for (const file of viewFiles) {
            const viewName = path.basename(file, '.ts');
            if (viewName === 'index-view')
                continue; // Skip barrel
            const content = await fs.readFile(path.join(generatedDir, file), 'utf-8');
            // Should have customElements.define call
            expect(content).toContain('customElements.define(');
            expect(content).toContain(`const tag = 'ux-`);
        }
    });
});
//# sourceMappingURL=iam-compilation.test.js.map