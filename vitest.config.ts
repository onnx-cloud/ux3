import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.mts', '.tsx', '.js', '.mjs', '.cjs'],
    alias: [
      // support plugin packages under /packages (most specific)
      {
        // only resolve packages whose name begins with "plugin-" in the workspace
        find: /^@ux3\/(plugin-[^/]+)\/(.*)\.js$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(plugin-[^/]+)\/(.*)\.js$/);
          if (m) return path.resolve(__dirname, `packages/@ux3/${m[1]}/src/${m[2]}.ts`);
          return id;
        },
      },
      {
        find: /^@ux3\/(plugin-[^/]+)\/(.*)$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(plugin-[^/]+)\/(.*)$/);
          if (m) return path.resolve(__dirname, `packages/@ux3/${m[1]}/src/${m[2]}.ts`);
          return id;
        },
      },
      {
        // root import for plugin packages (plugin-*) with .js extension
        find: /^@ux3\/(plugin-[^/]+)\.js$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(plugin-[^/]+)\.js$/);
          if (m) return path.resolve(__dirname, `packages/@ux3/${m[1]}/src/index.ts`);
          return id;
        },
      },
      {
        // root import for plugin packages (plugin-*)
        find: /^@ux3\/(plugin-[^/]+)$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(plugin-[^/]+)$/);
          if (m) return path.resolve(__dirname, `packages/@ux3/${m[1]}/src/index.ts`);
          return id;
        },
      },

      // Handle @ux3/ imports with .js extensions
      {
        find: /^@ux3\/(.*)\.js$/,
        replacement: (id: string) => {
          const m = id.match(/^@ux3\/(.*)\.js$/);
          if (m) return path.resolve(__dirname, `src/${m[1]}.ts`);
          return id;
        },
      },

      // default to workspace src/ (without .js extension)
      { find: /^@ux3\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/e2e/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/iam/**',
    ],
    // store results under test-results/vitest for CI or local inspection
    reporters: [
      'default',
      ['json', { outputFile: 'test-results/vitest/results.json' }],
      ['html', { outputFolder: 'html' }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'test-results/vitest/coverage',
    },
  },
});
