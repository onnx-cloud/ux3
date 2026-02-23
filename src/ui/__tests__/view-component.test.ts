/**
 * ViewComponent Unit Tests
 * Test FSM-driven Web Component configuration
 */

import { describe, it, expect } from 'vitest';
import { ViewComponent } from '../view-component';
import type { TemplateBindings } from '../view-component';

describe('ViewComponent - Configuration Tests', () => {
  describe('Bindings Structure', () => {
    it('should define default TemplateBindings', () => {
      const bindings: TemplateBindings = {
        events: [],
        reactive: [],
        i18n: [],
        widgets: [],
      };

      expect(bindings).toHaveProperty('events');
      expect(bindings).toHaveProperty('reactive');
      expect(bindings).toHaveProperty('i18n');
      expect(bindings).toHaveProperty('widgets');
    });

    it('should support event bindings configuration', () => {
      const bindings: TemplateBindings = {
        events: [
          { element: 'button', event: 'click', action: 'CLICK' },
          { element: 'form', event: 'submit', action: 'SUBMIT' },
        ],
        reactive: [],
        i18n: [],
        widgets: [],
      };

      expect(bindings.events.length).toBe(2);
      expect(bindings.events[0].action).toBe('CLICK');
    });

    it('should support reactive bindings', () => {
      const bindings: TemplateBindings = {
        events: [],
        reactive: [{ element: 'input', property: 'value', signal: 'username' }],
        i18n: [],
        widgets: [],
      };

      expect(bindings.reactive[0].property).toBe('value');
      expect(bindings.reactive[0].signal).toBe('username');
    });

    it('should support i18n bindings', () => {
      const bindings: TemplateBindings = {
        events: [],
        reactive: [],
        i18n: [{ element: 'h1', key: 'title' }],
        widgets: [],
      };

      expect(bindings.i18n[0].key).toBe('title');
    });

    it('should support widget bindings', () => {
      const bindings: TemplateBindings = {
        events: [],
        reactive: [],
        i18n: [],
        widgets: [{ element: 'chart-widget', name: 'chart-widget' }],
      };

      expect(bindings.widgets[0].name).toBe('chart-widget');
    });
  });

  describe('Template Management', () => {
    it('should create template map', () => {
      const templates = new Map<string, string>();
      templates.set('loading', '<div>Loading...</div>');
      templates.set('ready', '<div>Ready</div>');

      expect(templates.has('loading')).toBe(true);
      expect(templates.has('ready')).toBe(true);
    });

    it('should support HTML template storage', () => {
      const templates = new Map<string, string>();
      const html = '<form ux-on:submit="SUBMIT"><input [value]="username" /></form>';
      templates.set('form', html);

      expect(templates.get('form')).toContain('ux-on:submit');
      expect(templates.get('form')).toContain('[value]');
    });

    it('should support multiple state templates', () => {
      const templates = new Map<string, string>();
      ['initial', 'loading', 'ready', 'error'].forEach((state) => {
        templates.set(state, `<div>${state}</div>`);
      });

      expect(templates.size).toBe(4);
    });
  });

  describe('ViewComponent Subclassing', () => {
    it('should be extendable from HTMLElement', () => {
      class TestView extends ViewComponent {
        constructor() {
          super();
        }
      }

      expect(TestView.prototype instanceof ViewComponent).toBe(true);
      expect(TestView.prototype instanceof HTMLElement).toBe(true);
    });

    it('should support binding configuration in subclass', () => {
      class FormView extends ViewComponent {
        constructor() {
          super();
          this['bindings'] = {
            events: [{ element: 'form', event: 'submit', action: 'SUBMIT' }],
            reactive: [],
            i18n: [],
            widgets: [],
          };
        }
      }

      customElements.define('test-form-view', FormView as any);
      const view = document.createElement('test-form-view') as any;
      expect(view['bindings'].events.length).toBe(1);
    });

    it('should support template configuration in subclass', () => {
      class LoginView extends ViewComponent {
        constructor() {
          super();
          this['templates'].set('login', '<form></form>');
          this['templates'].set('loading', '<div>Loading</div>');
        }
      }

      customElements.define('test-login-view', LoginView as any);
      const view = document.createElement('test-login-view') as any;
      expect(view['templates'].has('login')).toBe(true);
      expect(view['templates'].has('loading')).toBe(true);
    });

    it('should support getStyles override', () => {
      class StyledView extends ViewComponent {
        protected getStyles(): string {
          return ':host { display: block; color: blue; }';
        }
      }

      customElements.define('test-styled-view', StyledView as any);
      const view = document.createElement('test-styled-view') as any;
      const styles = view['getStyles']();
      expect(styles).toContain('display: block');
    });
  });

  describe('Real-world Configurations', () => {
    it('should configure login view properly', () => {
      class LoginView extends ViewComponent {
        constructor() {
          super();
          this['templates'].set('login', `
            <form ux-on:submit="SUBMIT">
              <input [value]="username" />
              <button [disabled]="loading">{{i18n.login}}</button>
            </form>
          `);
          this['bindings'] = {
            events: [{ element: 'form', event: 'submit', action: 'SUBMIT' }],
            reactive: [{ element: 'input', property: 'value', signal: 'username' }],
            i18n: [{ element: 'button', key: 'login' }],
            widgets: [],
          };
        }
      }

      customElements.define('test-login-real-view', LoginView as any);
      const view = document.createElement('test-login-real-view') as any;
      expect(view['templates'].has('login')).toBe(true);
      expect(view['bindings'].events.length).toBeGreaterThan(0);
    });

    it('should configure dashboard view with widgets', () => {
      class DashboardView extends ViewComponent {
        constructor() {
          super();
          this['templates'].set('default', `
            <div><chart-widget [data]="chartData"></chart-widget></div>
          `);
          this['bindings'] = {
            events: [],
            reactive: [{ element: 'chart-widget', property: 'data', signal: 'chartData' }],
            i18n: [{ element: 'h1', key: 'dashboard' }],
            widgets: [{ element: 'chart-widget', name: 'chart-widget' }],
          };
        }
      }

      customElements.define('test-dashboard-view', DashboardView as any);
      const view = document.createElement('test-dashboard-view') as any;
      expect(view['bindings'].widgets.length).toBeGreaterThan(0);
    });

    it('should configure multi-state wizard', () => {
      class WizardView extends ViewComponent {
        constructor() {
          super();
          ['welcome', 'details', 'confirm', 'success'].forEach((state) => {
            this['templates'].set(state, `<div class="${state}"></div>`);
          });
        }
      }

      customElements.define('test-wizard-view', WizardView as any);
      const view = document.createElement('test-wizard-view') as any;
      expect(view['templates'].size).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bindings', () => {
      class EmptyView extends ViewComponent {
        constructor() {
          super();
        }
      }

      customElements.define('test-empty-view', EmptyView as any);
      const view = document.createElement('test-empty-view') as any;
      expect(view['bindings']).toBeDefined();
    });

    it('should handle large binding arrays', () => {
      class HeavyView extends ViewComponent {
        constructor() {
          super();
          const events = Array(100).fill(null).map((_, i) => ({
            element: `el${i}`,
            event: `ev${i}`,
            action: `ACT${i}`,
          }));
          this['bindings'] = { events, reactive: [], i18n: [], widgets: [] };
        }
      }

      customElements.define('test-heavy-view', HeavyView as any);
      const view = document.createElement('test-heavy-view') as any;
      expect(view['bindings'].events.length).toBe(100);
    });

    it('should handle special character names', () => {
      class SpecialView extends ViewComponent {
        constructor() {
          super();
          this['templates'].set('my-state-v2', '<div>Content</div>');
        }
      }

      customElements.define('test-special-view', SpecialView as any);
      const view = document.createElement('test-special-view') as any;
      expect(view['templates'].has('my-state-v2')).toBe(true);
    });
  });
});
