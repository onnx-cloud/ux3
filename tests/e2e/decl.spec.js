import { test } from './decl-fixtures';
import { runScenario } from '../../src/test-tools/decl-runner';
// simple page exercise without any ux3 app present
test('runs declarative scenario against DOM', async ({ page }) => {
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