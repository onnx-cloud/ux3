import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/e2e/**', '**/dist/**', '**/node_modules/**'],
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
