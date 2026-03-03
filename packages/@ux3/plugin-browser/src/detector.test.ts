import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectBrowser,
  detectOS,
  detectDevice,
  detectLocale,
  detectPreferences,
  detectConnectivity,
  gatherBrowserState,
} from '../src/detector';

describe('Browser Detection', () => {
  describe('detectBrowser', () => {
    it('should detect Chrome', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
      const browser = detectBrowser(ua);
      expect(browser.name).toBe('chrome');
      expect(browser.version).toBe('120.0.0.0');
    });

    it('should detect Firefox', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
      const browser = detectBrowser(ua);
      expect(browser.name).toBe('firefox');
      expect(browser.version).toBe('121.0');
    });

    it('should detect Safari', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
      const browser = detectBrowser(ua);
      expect(browser.name).toBe('safari');
      expect(browser.version).toBe('17.1');
    });

    it('should detect Edge', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const browser = detectBrowser(ua);
      expect(browser.name).toBe('edge');
      expect(browser.version).toBe('120.0.0.0');
    });

    it('should detect Opera', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
      const browser = detectBrowser(ua);
      expect(browser.name).toBe('opera');
    });
  });

  describe('detectOS', () => {
    it('should detect Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const os = detectOS(ua);
      expect(os.type).toBe('windows');
      expect(os.version).toBe('10.0');
    });

    it('should detect macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
      const os = detectOS(ua);
      expect(os.type).toBe('macos');
      expect(os.version).toBe('10.15.7');
    });

    it('should detect Linux', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
      const os = detectOS(ua);
      expect(os.type).toBe('linux');
    });

    it('should detect iOS', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
      const os = detectOS(ua);
      expect(os.type).toBe('ios');
      expect(os.version).toBe('17.2');
    });

    it('should detect Android', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36';
      const os = detectOS(ua);
      expect(os.type).toBe('android');
      expect(os.version).toBe('13');
    });
  });

  describe('detectDevice', () => {
    it('should classify mobile device', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15';
      const device = detectDevice(ua);
      expect(device.type).toBe('mobile');
      expect(device.isTouchable).toBe(true);
    });

    it('should classify tablet device', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15';
      const device = detectDevice(ua);
      expect(device.type).toBe('tablet');
    });

    it('should classify desktop device', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const device = detectDevice(ua);
      expect(device.type).toBe('desktop');
    });
  });

  describe('detectLocale', () => {
    it('should parse locale string', () => {
      const locale = detectLocale('en-US');
      expect(locale.language).toBe('en');
      expect(locale.locale).toBe('en-US');
    });

    it('should handle simple language code', () => {
      const locale = detectLocale('fr');
      expect(locale.language).toBe('fr');
      expect(locale.locale).toBe('fr');
    });

    it('should include timezone offset', () => {
      const locale = detectLocale('en-US');
      expect(typeof locale.timezoneOffset).toBe('number');
    });
  });

  describe('detectPreferences', () => {
    it('should return preferences object', () => {
      const prefs = detectPreferences();
      expect(prefs).toHaveProperty('isDarkMode');
      expect(prefs).toHaveProperty('prefersReducedMotion');
      expect(prefs).toHaveProperty('prefersHighContrast');
    });
  });

  describe('detectConnectivity', () => {
    it('should return connectivity info', () => {
      const conn = detectConnectivity();
      expect(conn).toHaveProperty('isOnline');
    });
  });

  describe('gatherBrowserState', () => {
    it('should gather complete browser state', () => {
      const state = gatherBrowserState();

      expect(state).toHaveProperty('browser');
      expect(state).toHaveProperty('os');
      expect(state).toHaveProperty('device');
      expect(state).toHaveProperty('locale');
      expect(state).toHaveProperty('preferences');
      expect(state).toHaveProperty('connectivity');

      // Verify browser section
      expect(state.browser).toHaveProperty('name');
      expect(state.browser).toHaveProperty('version');
      expect(state.browser).toHaveProperty('userAgent');

      // Verify device section
      expect(state.device).toHaveProperty('type');
      expect(['mobile', 'tablet', 'desktop']).toContain(state.device.type);
      expect(state.device).toHaveProperty('isTouchable');
      expect(state.device).toHaveProperty('pixelRatio');

      // Verify locale section
      expect(state.locale).toHaveProperty('language');
      expect(state.locale).toHaveProperty('locale');
      expect(state.locale).toHaveProperty('timezoneOffset');

      // Verify preferences
      expect(typeof state.preferences.prefersReducedMotion).toBe('boolean');

      // Verify connectivity
      expect(typeof state.connectivity.isOnline).toBe('boolean');
    });

    it('should be consistent across multiple calls', () => {
      const state1 = gatherBrowserState();
      const state2 = gatherBrowserState();

      // Device detection should be the same
      expect(state1.device.type).toBe(state2.device.type);
      expect(state1.browser.name).toBe(state2.browser.name);
      expect(state1.locale.language).toBe(state2.locale.language);
    });
  });
});
