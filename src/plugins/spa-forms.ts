import type { Plugin } from "../plugin/registry";
import { AppLifecyclePhase } from "../core/lifecycle";

export class FormsService {
  validate(form: HTMLFormElement): boolean {
    if (!form) return false;
    return form.checkValidity();
  }
  extract(form: HTMLFormElement): Record<string, any> {
    try {
      return Object.fromEntries(new FormData(form) as any);
    } catch (e) {
      return {};
    }
  }
}

// simple directives are just helper functions used by framework later
export function FormSubmitDirective(el: HTMLElement, fsm: any) {
  el.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const payload = (new FormsService()).extract(evt.target as HTMLFormElement);
    fsm.send('SUBMIT', payload);
  });
}

export function FormValidateDirective(el: HTMLElement) {
  el.addEventListener('input', () => {
    const form = el.closest('form');
    if (form) {
      if (!form.checkValidity()) {
        el.classList.add('invalid');
      } else {
        el.classList.remove('invalid');
      }
    }
  });
}

export const SpaForms: Plugin = {
  name: 'spa-forms',
  version: '1.0.0',
  install(app) {
    app.services['ux3.service.forms'] = new FormsService();
  },
  services: {
  },
  directives: {
    'ux-form-submit': FormSubmitDirective,
    'ux-form-validate': FormValidateDirective
  }
};
