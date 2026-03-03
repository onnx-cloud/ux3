import type { Plugin } from '../../../src/plugin/registry';
import type { AssetDescriptor } from '../../../src/ui/app';

// Helper to safely require StateMachine from the compiled or source context
function tryRequireStateMachine(): any {
  try {
    return require('../../../../src/fsm/state-machine.js').StateMachine;
  } catch {
    try {
      return require('../../../../src/fsm/state-machine').StateMachine;
    } catch {
      // Return generic mock for testing environments
      return class {
        id: string = '';
        current: string = '';
        context: Record<string, any> = {};
        states: Record<string, any> = {};
        
        constructor(config: any) {
          this.id = config.id;
          this.current = config.initial;
          this.context = config.context || {};
          this.states = config.states || {};
        }
        
        send(event: string) {
          const stateConfig = this.states[this.current];
          if (!stateConfig) return;
          
          const nextState = stateConfig.on?.[event];
          if (nextState) {
            stateConfig.exit?.forEach((f: any) => f?.(this.context));
            this.current = nextState;
            this.states[nextState]?.entry?.forEach((f: any) => f?.(this.context));
          }
        }
      };
    }
  }
}

// ============================================================================
// FSM FACTORIES 
// ============================================================================

// Dropdown FSM - toggle visibility of menu items
export function createDropdownFSM(): any {
  const StateMachine = tryRequireStateMachine();
  return new StateMachine({
    id: 'dropdown',
    initial: 'closed',
    context: { open: false },
    states: {
      closed: {
        on: { TOGGLE: 'open', OPEN: 'open' }
      },
      open: {
        on: { TOGGLE: 'closed', CLOSE: 'closed' },
        entry: [(ctx: any) => (ctx.open = true)],
        exit: [(ctx: any) => (ctx.open = false)]
      }
    }
  });
}

// Accordion FSM - expand/collapse sections
export function createAccordionFSM(): any {
  const StateMachine = tryRequireStateMachine();
  return new StateMachine({
    id: 'accordion',
    initial: 'collapsed',
    context: { expanded: false, activeItem: null },
    states: {
      collapsed: {
        on: { EXPAND: 'expanded' }
      },
      expanded: {
        on: { COLLAPSE: 'collapsed', TOGGLE: 'collapsed' },
        entry: [(ctx: any) => (ctx.expanded = true)],
        exit: [(ctx: any) => (ctx.expanded = false)]
      }
    }
  });
}

// Tabs FSM - navigate between tab panels
export function createTabsFSM(): any {
  const StateMachine = tryRequireStateMachine();
  return new StateMachine({
    id: 'tabs',
    initial: 'tab1',
    context: { activeTab: 'tab1' },
    states: {
      tab1: { on: { SELECT_TAB_2: 'tab2', SELECT_TAB_3: 'tab3' } },
      tab2: { on: { SELECT_TAB_1: 'tab1', SELECT_TAB_3: 'tab3' } },
      tab3: { on: { SELECT_TAB_1: 'tab1', SELECT_TAB_2: 'tab2' } }
    }
  });
}

// Modal FSM - show/hide modal dialogs
export function createModalFSM(): any {
  const StateMachine = tryRequireStateMachine();
  return new StateMachine({
    id: 'modal',
    initial: 'hidden',
    context: { visible: false },
    states: {
      hidden: { on: { SHOW: 'visible', OPEN: 'visible' } },
      visible: {
        on: { HIDE: 'hidden', CLOSE: 'hidden', ESCAPE: 'hidden' },
        entry: [(ctx: any) => (ctx.visible = true)],
        exit: [(ctx: any) => (ctx.visible = false)]
      }
    }
  });
}

// Toast FSM - temporary notifications
export function createToastFSM(): any {
  const StateMachine = tryRequireStateMachine();
  return new StateMachine({
    id: 'toast',
    initial: 'hidden',
    context: { visible: false, message: '', type: 'info' },
    states: {
      hidden: { on: { SHOW: 'visible' } },
      visible: {
        on: { HIDE: 'hidden', DISMISS: 'hidden' },
        entry: [(ctx: any) => (ctx.visible = true)],
        exit: [(ctx: any) => (ctx.visible = false)]
      }
    }
  });
}

// Navbar FSM - mobile menu toggle
export function createNavbarFSM(): any {
  const StateMachine = tryRequireStateMachine();
  return new StateMachine({
    id: 'navbar',
    initial: 'closed',
    context: { mobileMenuOpen: false },
    states: {
      closed: { on: { TOGGLE_MENU: 'open', OPEN_MENU: 'open' } },
      open: {
        on: { TOGGLE_MENU: 'closed', CLOSE_MENU: 'closed' },
        entry: [(ctx: any) => (ctx.mobileMenuOpen = true)],
        exit: [(ctx: any) => (ctx.mobileMenuOpen = false)]
      }
    }
  });
}

// ============================================================================
// TEMPLATES
// ============================================================================

const dropdownTemplate = `<div class="relative inline-block" ux-state="dropdown">
  <button ux-on="click:TOGGLE" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Menu</button>
  {{#if context.open}}
    <div class="absolute left-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
      <a href="#" class="block px-4 py-2 hover:bg-gray-100">Option 1</a>
      <a href="#" class="block px-4 py-2 hover:bg-gray-100">Option 2</a>
      <a href="#" class="block px-4 py-2 hover:bg-gray-100">Option 3</a>
    </div>
  {{/if}}
</div>`;

const accordionTemplate = `<div class="border rounded" ux-state="accordion">
  <div class="border-b">
    <button ux-on="click:EXPAND" class="w-full px-4 py-3 text-left hover:bg-gray-100 font-semibold">Section 1</button>
    {{#if context.expanded}}
      <div class="px-4 py-3 bg-gray-50">Content for section 1</div>
    {{/if}}
  </div>
  <div class="border-b">
    <button ux-on="click:EXPAND" class="w-full px-4 py-3 text-left hover:bg-gray-100 font-semibold">Section 2</button>
  </div>
</div>`;

const tabsTemplate = `<div ux-state="tabs">
  <div class="border-b flex">
    <button ux-on="click:SELECT_TAB_1" class="px-4 py-2 {{#if context.activeTab === 'tab1'}}border-b-2 border-blue-500{{/if}}">Tab 1</button>
    <button ux-on="click:SELECT_TAB_2" class="px-4 py-2 {{#if context.activeTab === 'tab2'}}border-b-2 border-blue-500{{/if}}">Tab 2</button>
    <button ux-on="click:SELECT_TAB_3" class="px-4 py-2 {{#if context.activeTab === 'tab3'}}border-b-2 border-blue-500{{/if}}">Tab 3</button>
  </div>
  <div class="p-4">
    {{#if context.activeTab === 'tab1'}}<p>Content for Tab 1</p>{{/if}}
    {{#if context.activeTab === 'tab2'}}<p>Content for Tab 2</p>{{/if}}
    {{#if context.activeTab === 'tab3'}}<p>Content for Tab 3</p>{{/if}}
  </div>
</div>`;

const modalTemplate = `<div ux-state="modal" {{#if context.visible}}class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"{{else}}class="hidden"{{/if}}>
  {{#if context.visible}}
    <div class="bg-white p-6 rounded-lg shadow-xl max-w-md">
      <h2 class="text-xl font-bold mb-4">Modal Title</h2>
      <p class="mb-6">This is a modal dialog using Tailwind CSS.</p>
      <button ux-on="click:CLOSE" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Close</button>
    </div>
  {{/if}}
</div>`;

const toastTemplate = `<div ux-state="toast" {{#if context.visible}}class="fixed bottom-4 right-4 px-6 py-3 bg-green-500 text-white rounded shadow-lg z-50"{{else}}class="hidden"{{/if}}>
  {{#if context.visible}}
    <div class="flex justify-between items-center">
      <span>{{context.message}}</span>
      <button ux-on="click:DISMISS" class="ml-4 text-white hover:text-gray-200">×</button>
    </div>
  {{/if}}
</div>`;

// ============================================================================
// UTILITY CLASSES & HELPERS
// ============================================================================

export const colorUtilities = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
  success: 'bg-green-500 hover:bg-green-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  info: 'bg-cyan-500 hover:bg-cyan-600 text-white'
};

export const sizeUtilities = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl'
};

export const spacingUtilities = {
  compact: 'gap-1',
  comfortable: 'gap-2',
  spacious: 'gap-4',
  relaxed: 'gap-6'
};

export function mergeClasses(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter((cls): cls is string => typeof cls === 'string' && cls.length > 0).join(' ');
}

export function getButtonClass(
  color: keyof typeof colorUtilities,
  size: keyof typeof sizeUtilities,
  extra?: string
): string {
  return mergeClasses(
    'rounded font-semibold transition-colors',
    colorUtilities[color],
    sizeUtilities[size],
    extra
  );
}

// ============================================================================
// PLUGIN REGISTRATION
// ============================================================================

export const TailwindPlusPlugin: Plugin = {
  name: '@ux3/plugin-tailwind-plus',
  version: '0.1.0',
  description: 'Tailwind CSS integration with FSM-driven UI components',
  async install(app) {
    // Register stylesheet if configured
    const cssPath = app.config.plugins?.['tailwind-plus']?.css;
    if (cssPath) {
      app.registerAsset?.({ type: 'style', href: cssPath });
    }

    // Register utility helper
    app.utils = app.utils || {};
    app.utils.tailwind = {
      mergeClasses,
      getButtonClass,
      colorUtilities,
      sizeUtilities,
      spacingUtilities
    };

    // Import StateMachine (async to work with bundled contexts)
    let StateMachine: any;
    try {
      ({ StateMachine } = await import('../../../../src/fsm/state-machine.js'));
    } catch {
      try {
        ({ StateMachine } = await import('../../../../src/fsm/state-machine'));
      } catch {
        // Use the fallback mock
        StateMachine = tryRequireStateMachine();
      }
    }

    // Register all component FSMs  
    const components = [
      { name: 'dropdown', factory: createDropdownFSM, template: dropdownTemplate },
      { name: 'accordion', factory: createAccordionFSM, template: accordionTemplate },
      { name: 'tabs', factory: createTabsFSM, template: tabsTemplate },
      { name: 'modal', factory: createModalFSM, template: modalTemplate },
      { name: 'toast', factory: createToastFSM, template: toastTemplate },
      { name: 'navbar', factory: createNavbarFSM, template: '' }
    ];

    components.forEach(({ name, factory, template }) => {
      const fsm = factory();
      app.registerMachine?.(name, fsm);
      if (template) {
        app.registerView?.(`${name}-demo`, template);
        app.registerRoute?.(`/${name}`, `${name}-demo`);
      }
    });
  }
};

export default TailwindPlusPlugin;
