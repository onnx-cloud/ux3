import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleFontsPlugin } from '../../packages/@ux3/plugin-google-fonts/src/index';

describe('GoogleFontsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (GoogleFontsPlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      utils: {},
    };
  });

  it('has expected metadata', () => {
    expect(GoogleFontsPlugin.name).toBe('@ux3/plugin-google-fonts');
    expect(GoogleFontsPlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers fonts service', () => {
    (GoogleFontsPlugin as any).config = { family: ['Open Sans', 'Roboto'] };
    GoogleFontsPlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('fonts', expect.any(Function));
  });

  it('exposes families on utils.fonts', () => {
    (GoogleFontsPlugin as any).config = { family: ['Open Sans', 'Roboto'] };
    GoogleFontsPlugin.install?.(mockApp);
    expect(mockApp.utils.fonts.families).toEqual(['Open Sans', 'Roboto']);
  });

  it('exposes default font on utils.fonts', () => {
    (GoogleFontsPlugin as any).config = {
      family: ['Open Sans', 'Roboto'],
      default: 'Open Sans',
    };
    GoogleFontsPlugin.install?.(mockApp);
    expect(mockApp.utils.fonts.default).toBe('Open Sans');
  });

  it('falls back to first family when no default set', () => {
    (GoogleFontsPlugin as any).config = { family: ['Lato', 'Merriweather'] };
    GoogleFontsPlugin.install?.(mockApp);
    expect(mockApp.utils.fonts.default).toBe('Lato');
  });

  it('handles a single string family', () => {
    (GoogleFontsPlugin as any).config = { family: 'Inter' };
    GoogleFontsPlugin.install?.(mockApp);
    expect(mockApp.utils.fonts.families).toEqual(['Inter']);
  });

  it('cssFamily produces a valid CSS font-family value', () => {
    (GoogleFontsPlugin as any).config = { family: ['Open Sans'] };
    GoogleFontsPlugin.install?.(mockApp);
    expect(mockApp.utils.fonts.cssFamily('Open Sans')).toContain('Open Sans');
  });

  it('installs without error when no families configured', () => {
    expect(() => GoogleFontsPlugin.install?.(mockApp)).not.toThrow();
  });
});
