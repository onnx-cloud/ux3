import type { Plugin } from '../../../src/plugin/registry';
import type { AssetDescriptor } from '../../../src/ui/app';
import { StateMachine } from '../../../src/fsm/state-machine.js';
import { FSMRegistry } from '../../../src/fsm/registry.js';

// simple UI widget demonstrating FSM-driven dropdown
export function createDropdownFSM(): StateMachine<{ open: boolean }> {
  return new StateMachine({
    id: 'dropdown',
    initial: 'closed',
    context: { open: false },
    states: {
      closed: {
        on: { TOGGLE: 'open' }
      },
      open: {
        on: { TOGGLE: 'closed', CLOSE: 'closed' },
        entry: [(ctx) => (ctx.open = true)],
        exit: [(ctx) => (ctx.open = false)]
      }
    }
  });
}

// simple view template for the dropdown
const dropdownTemplate = `<div class="p-2 border" ux-state="dropdown">
  <button ux-on="click:TOGGLE" class="px-4 py-2 bg-blue-500 text-white rounded">Toggle</button>
  {{#if context.open}}
    <div class="mt-2">The dropdown is open!</div>
  {{/if}}
</div>`;

// second example: modal dialog FSM & view
type ModalCtx = { visible: boolean };
export function createModalFSM(): StateMachine<ModalCtx> {
  return new StateMachine({
    id: 'modal',
    initial: 'hidden',
    context: { visible: false },
    states: {
      hidden: { on: { SHOW: 'visible' } },
      visible: {
        on: { HIDE: 'hidden' },
        entry: [(ctx) => (ctx.visible = true)],
        exit: [(ctx) => (ctx.visible = false)]
      }
    }
  });
}

const modalTemplate = `<div ux-state="modal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
  {{#if context.visible}}
    <div class="bg-white p-4 rounded shadow">
      <p>This is a modal. <button ux-on="click:HIDE" class="text-red-500">Close</button></p>
    </div>
  {{/if}}
</div>`;

export const TailwindPlusPlugin: Plugin = {
  name: '@ux3/plugin-tailwind-plus',
  version: '0.1.0',
  install(app) {
    // runtime stylesheet registration
    const cssPath = app.config.plugins?.['tailwind-plus']?.css;
    if (cssPath) {
      app.registerAsset({ type: 'style', href: cssPath });
    }

    // provide convenience util
    app.utils = app.utils || {};
    app.utils.useStyle = () => {
      return (base: string, extra?: string) => `${base} ${extra || ''}`;
    };

    // register FSM, view, and route programmatically
    const fsm = createDropdownFSM();
    FSMRegistry.register('dropdown', fsm);

    app.registerView('dropdown-demo', dropdownTemplate);
    app.registerRoute('/dropdown', 'dropdown-demo');

    // modal example
    const modalFsm = createModalFSM();
    FSMRegistry.register('modal', modalFsm);
    app.registerView('modal-demo', modalTemplate);
    app.registerRoute('/modal', 'modal-demo');

    // also register a widget for convenience
    app.registerComponent('dropdown-button', () => import('./widget/dropdown-button.js'));
  }
};

export default TailwindPlusPlugin;
