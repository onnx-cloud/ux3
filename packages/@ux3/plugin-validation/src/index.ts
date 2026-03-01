import type { Plugin } from '../../../src/plugin/registry';

export const ValidationPlugin: Plugin = {
  name: '@ux3/plugin-validation',
  version: '1.0.0',
  install(app) {
    // hook into forms service to add extra rules
    const orig = app.services['ux3.service.forms'];
    if (orig && typeof orig.validate === 'function') {
      const oldValidate = orig.validate.bind(orig);
      orig.validate = (form: HTMLFormElement) => {
        // additional custom logic
        return oldValidate(form);
      };
    }
  }
};

export default ValidationPlugin;