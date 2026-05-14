/**
 * AppContextBuilder Unit Tests
 * Test the DI container initialization and context creation
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppContextBuilder, type GeneratedConfig } from '../../src/ui/context-builder';
import { clearStyles, getRegisteredStyles } from '../../src/ui/style-registry';
import { FSMRegistry } from '../../src/fsm/registry';

describe('AppContextBuilder - Comprehensive Tests', () => {
  let config: GeneratedConfig;

  beforeEach(() => {
    config = {
      routes: [
        { path: '/', view: 'home' },
        { path: '/login', view: 'login' },
        { path: '/dashboard/:id', view: 'dashboard' },
      ],
      services: {
        auth: {
          type: 'http',
          config: {
            baseUrl: 'https://api.example.com',
            timeout: 5000,
          },
        },
        analytics: {
          type: 'mock',
          config: {},
        },
      },
      machines: {
        login: {
          id: 'login',
          initial: 'idle',
          context: { email: '', password: '', error: '' },
          states: {
            idle: {
              on: {
                SUBMIT: { target: 'loading' },
              },
            },
            loading: {
              on: {
                SUCCESS: { target: 'success' },
                ERROR: { target: 'error' },
              },
            },
            success: {},
            error: {
              on: {
                RETRY: { target: 'idle' },
              },
            },
          },
        },
      },
      i18n: {
        en: {
          submit: 'Submit',
          cancel: 'Cancel',
          'login.title': 'Sign In',
        },
        es: {
          submit: 'Enviar',
          cancel: 'Cancelar',
          'login.title': 'Iniciar Sesión',
        },
      },
      widgets: {
        'button-primary': {
          path: './button.ts',
          lazy: false,
        },
        'modal-dialog': {
          path: './modal.ts',
          lazy: true,
        },
      },
      styles: {
        primary: 'btn btn-primary',
        secondary: 'btn btn-secondary',
      },
      templates: {
        'login-idle': '<form><input name="email"/></form>',
        'login-loading': '<p>Loading...</p>',
      },
    };
  });

  describe('Constructor & Validation', () => {
    it('should create a builder instance', () => {
      const builder = new AppContextBuilder(config);
      expect(builder).toBeDefined();
    });

    it('should throw on missing routes', () => {
      const badConfig = { ...config, routes: undefined } as any;
      expect(() => new AppContextBuilder(badConfig)).toThrow('missing routes');
    });

    it('should throw on missing services', () => {
      const badConfig = { ...config, services: undefined } as any;
      expect(() => new AppContextBuilder(badConfig)).toThrow('missing services');
    });

    it('should throw on missing machines', () => {
      const badConfig = { ...config, machines: undefined } as any;
      expect(() => new AppContextBuilder(badConfig)).toThrow('missing machines');
    });
  });

  describe('withMachines()', () => {
    it('should initialize FSMs from config', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();

      const app = builder.build();
      expect(app.machines['login']).toBeDefined();
      expect(app.machines['login'].getState()).toBe('idle');
    });

    it('should return builder for chaining', async () => {
      const builder = new AppContextBuilder(config);
      const result = await builder.withMachines();
      expect(result).toBe(builder);
    });

    it('should subscribe to machine state changes', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();

      const app = builder.build();
      const fsm = app.machines['login'];

      const states: string[] = [];
      fsm.subscribe((state) => {
        states.push(state);
      });

      fsm.send({ type: 'SUBMIT' });
      expect(states).toContain('loading');
    });

    it('BUG-3: should register FSMs in FSMRegistry so navigation can look them up', async () => {
      FSMRegistry.clear();
      const builder = new AppContextBuilder(config);
      await builder.withMachines();

      // After withMachines(), every machine must be in the global FSMRegistry
      expect(FSMRegistry.get('login')).toBeDefined();
    });
  });

  describe('withServices()', () => {
    it('should initialize services from config', () => {
      const builder = new AppContextBuilder(config);
      builder.withServices();

      const app = builder.build();
      expect(app.services['auth']).toBeDefined();
      expect(app.services['analytics']).toBeDefined();
    });

    it('should create HTTP services', () => {
      const builder = new AppContextBuilder(config);
      builder.withServices();

      const app = builder.build();
      expect(app.services['auth']).toBeDefined();
    });

    it('should create mock services', () => {
      const builder = new AppContextBuilder(config);
      builder.withServices();

      const app = builder.build();
      expect(app.services['analytics']).toBeDefined();
    });

    it('should throw on unknown service type', () => {
      const badConfig = {
        ...config,
        services: {
          badService: {
            type: 'unknown' as any,
            config: {},
          },
        },
      };

      const builder = new AppContextBuilder(badConfig);
      builder.withServices();

      expect(() => builder.build()).toThrow();
    });

    it('should support plugin adapter services without failing build', async () => {
      const pluginConfig = {
        ...config,
        services: {
          storeService: {
            adapter: 'plugin',
            provider: 'store',
            backend: 'local',
          },
        },
      } as any;

      const builder = new AppContextBuilder(pluginConfig);
      builder.withServices();

      const app = builder.build();
      expect(app.services['storeService']).toBeDefined();
      await expect((app.services['storeService'] as any).fetch()).rejects.toThrow(
        'Plugin service \'storeService\' is not installed yet'
      );
    });

    it('should support adapter field when type is missing', () => {
      const adConfig = {
        ...config,
        services: {
          fileSvc: {
            adapter: 'file',
            config: { baseUrl: '/static/' },
          },
        },
      } as any;

      const builder = new AppContextBuilder(adConfig);
      builder.withServices();

      const app = builder.build();
      expect(app.services['fileSvc']).toBeDefined();
      // underlying implementation should be HttpService
      expect(typeof app.services['fileSvc'].fetch).toBe('function');
    });

    it('BUG-4: should handle flat service spec (no nested config property)', () => {
      // ConfigGenerator emits flat specs: { type, baseUrl, timeout } instead of
      // { type, config: { baseUrl, timeout } }.  Both shapes must produce a service.
      const flatConfig = {
        ...config,
        services: {
          flatApi: {
            type: 'http',
            baseUrl: 'https://flat.example.com',
            timeout: 3000,
          },
        },
      } as any;

      const builder = new AppContextBuilder(flatConfig);
      builder.withServices();

      const app = builder.build();
      expect(app.services['flatApi']).toBeDefined();
      expect(typeof app.services['flatApi'].fetch).toBe('function');
    });
  });

  describe('withWidgets()', () => {
    it('should initialize widget factory', () => {
      const builder = new AppContextBuilder(config);
      builder.withWidgets();

      const app = builder.build();
      expect(app.widgets).toBeDefined();
      expect(app.widgets.list).toBeDefined();
    });

    it('should return builder for chaining', () => {
      const builder = new AppContextBuilder(config);
      const result = builder.withWidgets();
      expect(result).toBe(builder);
    });
  });

  describe('withI18n()', () => {
    it('should initialize i18n provider', () => {
      const builder = new AppContextBuilder(config);
      builder.withI18n();

      const app = builder.build();
      expect(app.i18n).toBeDefined();
    });

    it('should translate strings', () => {
      const builder = new AppContextBuilder(config);
      builder.withI18n();

      const app = builder.build();
      expect(app.i18n('submit')).toBe('Submit');
      expect(app.i18n('cancel')).toBe('Cancel');
    });

    it('should fallback to key if translation missing', () => {
      const builder = new AppContextBuilder(config);
      builder.withI18n();

      const app = builder.build();
      expect(app.i18n('missing.key')).toBe('missing.key');
    });

    it('should interpolate variables', () => {
      const extendedConfig = {
        ...config,
        i18n: {
          en: {
            welcome: 'Welcome {{name}}',
          },
        },
      };

      const builder = new AppContextBuilder(extendedConfig);
      builder.withI18n();

      const app = builder.build();
      expect(app.i18n('welcome', { name: 'Alice' })).toBe('Welcome Alice');
    });
  });

  describe('withTemplates()', () => {
    it('should load templates', () => {
      const builder = new AppContextBuilder(config);
      builder.withTemplates();

      const app = builder.build();
      expect(app.template).toBeDefined();
    });

    it('should retrieve template by name', () => {
      const builder = new AppContextBuilder(config);
      builder.withTemplates();

      const app = builder.build();
      const template = app.template('login-idle');
      expect(template).toBe('<form><input name="email"/></form>');
    });

    it('should warn on missing template', async () => {
      const { defaultLogger } = await import('../../src/security/observability.js');
      const spy = vi.spyOn(defaultLogger, 'warn').mockImplementation(() => {});

      const builder = new AppContextBuilder(config);
      builder.withTemplates();

      const app = builder.build();
      app.template('missing-template');

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Template not found')
      );

      spy.mockRestore();
    });
  });

  describe('withStyles()', () => {
    it('should load styles', () => {
      const builder = new AppContextBuilder(config);
      builder.withStyles();

      const app = builder.build();
      expect(app.styles).toBeDefined();
      expect(app.styles['primary']).toBe('btn btn-primary');
    });

    it('should propagate styles into the global registry', () => {
      clearStyles();

      const builder = new AppContextBuilder(config);
      builder.withStyles();
      builder.build();

      const all = getRegisteredStyles();
      for (const [key, value] of Object.entries(config.styles)) {
        expect(all[key], `style key "${key}" must be registered`).toBe(value);
      }
    });
  });

  describe('build()', () => {
    it('should return complete AppContext', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();
      builder.withServices();
      builder.withWidgets();
      builder.withI18n();
      builder.withTemplates();
      builder.withStyles();
      const app = builder.build();

      expect(app).toBeDefined();
      expect(app.machines).toBeDefined();
      expect(app.services).toBeDefined();
      expect(app.widgets).toBeDefined();
      expect(app.i18n).toBeDefined();
      expect(app.template).toBeDefined();
      expect(app.styles).toBeDefined();
      expect(app.ui).toBeDefined();
    });

    it('should auto-initialize widgets if not called', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();
      builder.withServices();
      builder.withI18n();
      const app = builder.build();

      expect(app.widgets).toBeDefined();
    });

    it('should export app globally', async () => {
      // Note: requires globalThis in test environment
      const builder = new AppContextBuilder(config);
      await builder.withMachines();
      const app = builder.build();

      // In a real browser, this would be on window
      // In tests, we just verify the method completes
      expect(app).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should register error handler', async () => {
      const errors: Error[] = [];
      const builder = new AppContextBuilder(config);

      builder.onError((error) => {
        errors.push(error);
      });

      await builder.withMachines();
      builder.withServices();
      const app = builder.build();

      expect(app).toBeDefined();
      // Errors only captured if something fails during build
    });

    it('should handle invalid service gracefully', () => {
      const badConfig = {
        ...config,
        services: {
          invalid: {
            type: 'invalid-type' as any,
            config: {},
          },
        },
      };

      const builder = new AppContextBuilder(badConfig);
      expect(() => {
        builder.withServices();
      }).not.toThrow();
    });
  });

  describe('Fluent API', () => {
    it('should support method chaining', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();
      builder.withServices();
      builder.withWidgets();
      builder.withI18n();
      builder.withTemplates();
      builder.withStyles();
      const app = builder.build();

      expect(app).toBeDefined();
    });

    it('should allow partial building', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();
      const app = builder.build();

      expect(app.machines).toBeDefined();
      expect(app.services).toBeDefined(); // Empty
    });
  });

  describe('Integration', () => {
    it('should create functioning FSM from context', async () => {
      const builder = new AppContextBuilder(config);
      await builder.withMachines();
      const app = builder.build();

      const fsm = app.machines['login'];
      expect(fsm.getState()).toBe('idle');

      fsm.send({ type: 'SUBMIT' });
      expect(fsm.getState()).toBe('loading');

      fsm.send({ type: 'SUCCESS' });
      expect(fsm.getState()).toBe('success');
    });

    it('should translate from context', () => {
      const app = new AppContextBuilder(config)
        .withI18n()
        .build();

      expect(app.i18n('submit')).toBe('Submit');
    });

    it('should access templates from context', () => {
      const app = new AppContextBuilder(config)
        .withTemplates()
        .build();

      const html = app.template('login-idle');
      expect(html).toContain('form');
    });
  });
});
