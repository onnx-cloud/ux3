import { test } from './decl-fixtures';
import { runScenario } from '../../src/test-tools/decl-runner';
// simple page exercise without any ux3 app present
// TODO: decl-runner uses Node.js APIs (fs, require) that don't work in browser context
// This test should run on the server side instead of in Playwright
// For now, skipping to focus on core e2e functionality
test.skip('runs declarative scenario against DOM', async ({ page }) => {
    // inline html with a button that changes text when clicked
    await page.setContent(`
    <button id="btn">start</button>
    <script>
      document.getElementById('btn').addEventListener('click', () => {
        document.getElementById('btn').textContent = 'done';
      });
    <\/script>
  `);
    await runScenario('tests/decl/dom.yaml', { runner: 'playwright', page });
});
//# sourceMappingURL=decl.spec.js.map