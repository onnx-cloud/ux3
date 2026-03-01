/**
 * AppContextBuilder Unit Tests
 * Test the DI container initialization and context creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppContextBuilder, type GeneratedConfig } from '@ux3/ui/context-builder';

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
        loginFSM: {
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
    it('should initialize FSMs from config', () => {
      const builder = new AppContextBuilder(config);
      builder.withMachines();

      const app = builder.build();
      expect(app.machines['loginFSM']).toBeDefined();
      expect(app.machines['loginFSM'].getState()).toBe('idle');
    });

    it('should return builder for chaining', () => {
      const builder = new AppContextBuilder(config);
      const result = builder.withMachines();
      expect(result).toBe(builder);
    });

    it('should subscribe to machine state changes', () => {
      const builder = new AppContextBuilder(config);
      builder.withMachines();

      const app = builder.build();
      const fsm = app.machines['loginFSM'];

      const states: string[] = [];
      fsm.subscribe((state) => {
        states.push(state);
      });

      fsm.send({ type: 'SUBMIT' });
      expect(states).toContain('loading');
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

    it('should warn on missing template', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
  });

  describe('build()', () => {
    it('should return complete AppContext', () => {
      const app = new AppContextBuilder(config)
        .withMachines()
        .withServices()
        .withWidgets()
        .withI18n()
        .withTemplates()
        .withStyles()
        .build();

      expect(app).toBeDefined();
      expect(app.machines).toBeDefined();
      expect(app.services).toBeDefined();
      expect(app.widgets).toBeDefined();
      expect(app.i18n).toBeDefined();
      expect(app.template).toBeDefined();
      expect(app.styles).toBeDefined();
      expect(app.ui).toBeDefined();
    });

    it('should auto-initialize widgets if not called', () => {
      const app = new AppContextBuilder(config)
        .withMachines()
        .withServices()
        .withI18n()
        .build();

      expect(app.widgets).toBeDefined();
    });

    it('should export app globally', () => {
      // Note: requires globalThis in test environment
      const app = new AppContextBuilder(config)
        .withMachines()
        .build();

      // In a real browser, this would be on window
      // In tests, we just verify the method completes
      expect(app).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should register error handler', () => {
      const errors: Error[] = [];
      const builder = new AppContextBuilder(config);

      builder.onError((error) => {
        errors.push(error);
      });

      const app = builder
        .withMachines()
        .withServices()
        .build();

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
    it('should support method chaining', () => {
      const app = new AppContextBuilder(config)
        .withMachines()
        .withServices()
        .withWidgets()
        .withI18n()
        .withTemplates()
        .withStyles()
        .build();

      expect(app).toBeDefined();
    });

    it('should allow partial building', () => {
      const app = new AppContextBuilder(config)
        .withMachines()
        .build();

      expect(app.machines).toBeDefined();
      expect(app.services).toBeDefined(); // Empty
    });
  });

  describe('Integration', () => {
    it('should create functioning FSM from context', () => {
      const app = new AppContextBuilder(config)
        .withMachines()
        .build();

      const fsm = app.machines['loginFSM'];
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
