import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      // support plugin packages under /packages (most specific)
      {
        // only resolve packages whose name begins with "plugin-" in the workspace
        find: /^@ux3\/(plugin-[^/]+)\/(.*)$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(plugin-[^/]+)\/(.*)$/);
          if (m) return path.resolve(process.cwd(), `packages/@ux3/${m[1]}/src/${m[2]}`);
          return id;
        },
      },
      {
        // root import for plugin packages (plugin-*)
        find: /^@ux3\/(plugin-[^/]+)$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(plugin-[^/]+)$/);
          if (m) return path.resolve(process.cwd(), `packages/@ux3/${m[1]}/src/index.ts`);
          return id;
        },
      },

      // default to workspace src/
      { find: /^@ux3\//, replacement: path.resolve(process.cwd(), 'src') + '/' },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/e2e/**', '**/dist/**', '**/node_modules/**', '**/iam/**'],
    // store results under test-results/vitest for CI or local inspection
    reporters: [
      'default',
      ['json', { outputFile: 'test-results/vitest/results.json' }],
      ['html', { outputFolder: 'test-results/vitest/html' }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'test-results/vitest/coverage',
    },
  },
});
