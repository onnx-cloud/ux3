import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/dev/dashboard.ts';

describe('renderDashboard', () => {
  it('renders the dashboard from plugin-owned template and i18n assets', async () => {
    const projectDir = '/tmp/demo-app';
    const html = await renderDashboard(
      projectDir,
      {
        config: {
          widgets: {
            alpha: { path: 'ux/widget/alpha.yaml' },
            beta: { path: 'ux/widget/beta.yaml' },
          },
          services: {
            demo: {},
          },
          routes: [{ path: '/', view: 'alpha' }],
          i18n: {},
        },
        stats: {
          buildTime: Date.UTC(2026, 4, 6, 12, 0, 0),
        },
      },
      {}
    );

    expect(html).toContain('UX3 Dev Server - demo-app');
    expect(html).toContain('Project Status');
    expect(html).toContain('Available Views');
    expect(html).toContain('href="/view/alpha"');
    expect(html).toContain('href="/view/beta"');
  });
});