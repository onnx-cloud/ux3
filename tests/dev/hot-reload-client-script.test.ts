import { describe, expect, it } from 'vitest';
import { getHotReloadClientScript } from '../../src/build/hot-reload-client.ts';

describe('hot reload client overlay assets', () => {
  it('uses file-backed overlay markup and CSS injection, not inline cssText', () => {
    const script = getHotReloadClientScript('http://localhost:1337');

    expect(script).toContain('HOT_RELOAD_OVERLAY_HTML');
    expect(script).toContain('HOT_RELOAD_OVERLAY_CSS');
    expect(script).toContain('ux3-hot-reload-overlay-style');
    expect(script).toContain('data-ux3-hot-reload-message');

    expect(script).not.toContain('overlay.style.cssText');
    expect(script).not.toContain('style="max-width: 600px;');
  });
});