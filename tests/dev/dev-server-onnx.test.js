import { describe, it, expect } from 'vitest';
import path from 'path';
// verify that the onnx.cloud example builds and serves markdown content pages
describe('DevServer with ONNX.Cloud example', () => {
    it('should render a content page based on markdown', async () => {
        const projectDir = path.resolve('examples/onnx.cloud');
        const { DevServer } = await import('@ux3/dev/dev-server.ts');
        const server = new DevServer(projectDir, 3740, 'localhost');
        await server.start();
        // generate a fresh config so we know what routes exist
        const { ConfigGenerator } = await import('../../src/build/config-generator.ts');
        const cfgGen = new ConfigGenerator({
            configDir: projectDir,
            outputDir: path.join(projectDir, 'generated'),
        });
        const cfg = await cfgGen.generate();
        // pick an entry that isn't root
        const route = (cfg.routes || []).find((r) => r.view === 'content' && r.path !== '/');
        const url = `http://localhost:3740${route ? route.path : '/'}`;
        const resp = await fetch(url);
        const html = await resp.text();
        // make sure the title from frontmatter appears in the output
        const front = cfg.content.items.find((i) => `/${i.slug}` === route.path || i.frontmatter.path === route.path);
        expect(html).toContain(front.frontmatter.title);
        await server.stop();
    });
});
//# sourceMappingURL=dev-server-onnx.test.js.map