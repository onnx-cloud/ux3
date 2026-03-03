import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  colorPalette,
  typography,
  layout,
  components,
  spacing,
  breakpoints,
  mergeClasses,
  buttonClass,
  cardClass,
  badgeClass,
  alertClass,
  TailwindCssPlugin
} from '../../packages/@ux3/plugin-tailwind-css/src/index';

describe('@ux3/plugin-tailwind-css', () => {
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
  });

  // ========== Plugin Metadata ==========
  describe('Plugin Metadata', () => {
    it('should export correct plugin metadata', () => {
      expect(TailwindCssPlugin.name).toBe('@ux3/plugin-tailwind-css');
      expect(TailwindCssPlugin.version).toBe('0.1.0');
      expect(TailwindCssPlugin.description).toContain('Tailwind CSS');
    });

    it('should have an install method', () => {
      expect(TailwindCssPlugin.install).toBeDefined();
      expect(typeof TailwindCssPlugin.install).toBe('function');
    });
  });

  // ========== Color Palettes ==========
  describe('Color Palettes', () => {
    it('should export complete color palettes', () => {
      expect(colorPalette).toHaveProperty('slate');
      expect(colorPalette).toHaveProperty('blue');
      expect(colorPalette).toHaveProperty('green');
      expect(colorPalette).toHaveProperty('red');
      expect(colorPalette).toHaveProperty('yellow');
    });

    it('should have standard color levels', () => {
      expect(colorPalette.blue).toHaveProperty('50');
      expect(colorPalette.blue).toHaveProperty('500');
      expect(colorPalette.blue).toHaveProperty('600');
      expect(colorPalette.blue).toHaveProperty('900');
    });

    it('should have correct hex values', () => {
      expect(colorPalette.blue[500]).toBe('#3b82f6');
      expect(colorPalette.green[500]).toBe('#22c55e');
      expect(colorPalette.red[500]).toBe('#ef4444');
    });
  });

  // ========== Typography ==========
  describe('Typography Classes', () => {
    it('should export all typography levels', () => {
      expect(typography).toHaveProperty('h1');
      expect(typography).toHaveProperty('h2');
      expect(typography).toHaveProperty('h3');
      expect(typography).toHaveProperty('h4');
      expect(typography).toHaveProperty('h5');
      expect(typography).toHaveProperty('h6');
      expect(typography).toHaveProperty('body');
      expect(typography).toHaveProperty('small');
      expect(typography).toHaveProperty('caption');
    });

    it('should have proper Tailwind classes in typography', () => {
      expect(typography.h1).toContain('text-4xl');
      expect(typography.h1).toContain('font-bold');
      expect(typography.body).toContain('text-base');
      expect(typography.caption).toContain('text-xs');
    });
  });

  // ========== Layout Utilities ==========
  describe('Layout Utilities', () => {
    it('should export common layouts', () => {
      expect(layout).toHaveProperty('container');
      expect(layout).toHaveProperty('flexCenter');
      expect(layout).toHaveProperty('flexBetween');
      expect(layout).toHaveProperty('gridCols2');
      expect(layout).toHaveProperty('gridCols3');
      expect(layout).toHaveProperty('gridCols4');
    });

    it('should define responsive grid systems', () => {
      expect(layout.gridCols2).toContain('grid');
      expect(layout.gridCols2).toContain('md:grid-cols-2');
      expect(layout.gridCols3).toContain('lg:grid-cols-3');
      expect(layout.gridCols4).toContain('lg:grid-cols-4');
    });
  });

  // ========== Component Styles ==========
  describe('Component Styles', () => {
    it('should export button component styles', () => {
      expect(components).toHaveProperty('button');
      expect(components).toHaveProperty('buttonPrimary');
      expect(components).toHaveProperty('buttonSecondary');
      expect(components).toHaveProperty('buttonSmall');
      expect(components).toHaveProperty('buttonLarge');
    });

    it('should export form input styles', () => {
      expect(components).toHaveProperty('input');
      expect(components).toHaveProperty('inputError');
      expect(components.input).toContain('border');
      expect(components.input).toContain('focus:ring-2');
    });

    it('should export card component styles', () => {
      expect(components).toHaveProperty('card');
      expect(components).toHaveProperty('cardPadding');
      expect(components.card).toContain('bg-white');
      expect(components.card).toContain('rounded-lg');
    });

    it('should export badge component variants', () => {
      expect(components).toHaveProperty('badge');
      expect(components).toHaveProperty('badgeBlue');
      expect(components).toHaveProperty('badgeGreen');
      expect(components).toHaveProperty('badgeRed');
      expect(components).toHaveProperty('badgeYellow');
    });

    it('should export alert component variants', () => {
      expect(components).toHaveProperty('alert');
      expect(components).toHaveProperty('alertInfo');
      expect(components).toHaveProperty('alertSuccess');
      expect(components).toHaveProperty('alertWarning');
      expect(components).toHaveProperty('alertError');
    });
  });

  // ========== Spacing & Breakpoints ==========
  describe('Spacing & Breakpoints', () => {
    it('should export spacing scale', () => {
      expect(spacing).toHaveProperty('xs');
      expect(spacing).toHaveProperty('sm');
      expect(spacing).toHaveProperty('md');
      expect(spacing).toHaveProperty('lg');
      expect(spacing).toHaveProperty('xl');
    });

    it('should export responsive breakpoints', () => {
      expect(breakpoints).toHaveProperty('xs');
      expect(breakpoints).toHaveProperty('sm');
      expect(breakpoints).toHaveProperty('md');
      expect(breakpoints).toHaveProperty('lg');
      expect(breakpoints).toHaveProperty('xl');
      expect(breakpoints).toHaveProperty('2xl');
    });

    it('should have correct breakpoint values', () => {
      expect(breakpoints.sm).toBe('640px');
      expect(breakpoints.md).toBe('768px');
      expect(breakpoints.lg).toBe('1024px');
    });
  });

  // ========== Helper Functions ==========
  describe('Helper Functions', () => {
    it('mergeClasses should combine class strings', () => {
      const result = mergeClasses('px-4', 'py-2', 'bg-blue-500');
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('mergeClasses should filter falsy values', () => {
      const result = mergeClasses('px-4', undefined, null, false, 'py-2', '');
      expect(result).toBe('px-4 py-2');
    });

    it('buttonClass should create complete button classes', () => {
      const result = buttonClass('primary', 'medium');
      expect(result).toContain('inline-flex');
      expect(result).toContain('rounded-md');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('px-4 py-2');
    });

    it('buttonClass should support secondary variant', () => {
      const result = buttonClass('secondary', 'medium');
      expect(result).toContain('bg-slate-200');
      expect(result).toContain('text-slate-900');
    });

    it('buttonClass should support size variants', () => {
      const small = buttonClass('primary', 'small');
      const large = buttonClass('primary', 'large');
      expect(small).toContain('px-3 py-1');
      expect(small).toContain('text-sm');
      expect(large).toContain('px-6 py-3');
      expect(large).toContain('text-lg');
    });

    it('buttonClass should merge additional classes', () => {
      const result = buttonClass('primary', 'medium', 'custom-class w-full');
      expect(result).toContain('custom-class');
      expect(result).toContain('w-full');
    });

    it('cardClass should create card classes', () => {
      const result = cardClass(true);
      expect(result).toContain('bg-white');
      expect(result).toContain('rounded-lg');
      expect(result).toContain('p-4 md:p-6');
    });

    it('cardClass should support optional padding', () => {
      const withPadding = cardClass(true);
      const withoutPadding = cardClass(false);
      expect(withPadding).toContain('p-4 md:p-6');
      expect(withoutPadding).not.toContain('p-4 md:p-6');
    });

    it('badgeClass should create badge classes', () => {
      const result = badgeClass('blue');
      expect(result).toContain('inline-flex');
      expect(result).toContain('bg-blue-100');
      expect(result).toContain('text-blue-800');
    });

    it('badgeClass should support multiple colors', () => {
      const red = badgeClass('red');
      const green = badgeClass('green');
      const yellow = badgeClass('yellow');
      expect(red).toContain('bg-red-100');
      expect(green).toContain('bg-green-100');
      expect(yellow).toContain('bg-yellow-100');
    });

    it('alertClass should create alert classes', () => {
      const result = alertClass('success');
      expect(result).toContain('p-4 rounded-md');
      expect(result).toContain('bg-green-50');
      expect(result).toContain('text-green-800');
    });

    it('alertClass should support all alert types', () => {
      const info = alertClass('info');
      const warning = alertClass('warning');
      const error = alertClass('error');
      expect(info).toContain('bg-blue-50');
      expect(warning).toContain('bg-yellow-50');
      expect(error).toContain('bg-red-50');
    });
  });

  // ========== Integration Tests ==========
  describe('Integration & DOM Tests', () => {
    it('should support button styling in DOM', () => {
      const button = document.createElement('button');
      button.className = buttonClass('primary', 'medium');
      document.body.appendChild(button);
      
      expect(button.className).toContain('rounded-md');
      expect(button.className).toContain('bg-blue-500');
    });

    it('should support card styling in DOM', () => {
      const card = document.createElement('div');
      card.className = cardClass(true);
      document.body.appendChild(card);
      
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('p-4 md:p-6');
    });

    it('should support responsive classes', () => {
      const element = document.createElement('div');
      element.className = layout.gridCols3;
      document.body.appendChild(element);
      
      expect(element.className).toContain('grid');
      expect(element.className).toContain('lg:grid-cols-3');
    });
  });

  // ========== Plugin Installation ==========
  describe('Plugin Installation', () => {
    it('should have an async install method', async () => {
      // use any for simplicity; we only care about shape mutated by plugin
      const mockApp: any = {
        config: { plugins: { 'tailwind-css': { cdn: 'https://test.com/tailwind.css' } } },
        registerAsset: vi.fn(),
        utils: {}
      };

      await TailwindCssPlugin.install(mockApp);

      expect(mockApp.utils.tailwind).toBeDefined();
      expect(mockApp.utils.tailwind.mergeClasses).toBeDefined();
      expect(mockApp.utils.tailwind.buttonClass).toBeDefined();
    });

    it('should register utility functions on app context', async () => {
      const mockApp: any = {
        config: { plugins: { 'tailwind-css': {} } },
        registerAsset: vi.fn(),
        utils: {}
      };

      await TailwindCssPlugin.install(mockApp);

      expect(mockApp.utils.tailwind.colors).toBe(colorPalette);
      expect(mockApp.utils.tailwind.typography).toBe(typography);
      expect(mockApp.utils.tailwind.layout).toBe(layout);
      expect(mockApp.utils.tailwind.components).toBe(components);
    });

    it('should skip CDN registration when configured', async () => {
      const mockApp: any = {
        config: { plugins: { 'tailwind-css': { cdn: false } } },
        registerAsset: vi.fn(),
        utils: {}
      };

      await TailwindCssPlugin.install(mockApp);

      expect(mockApp.registerAsset).not.toHaveBeenCalled();
    });
  });
});
