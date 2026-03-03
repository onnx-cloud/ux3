import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDropdownFSM,
  createAccordionFSM,
  createTabsFSM,
  createModalFSM,
  createToastFSM,
  createNavbarFSM,
  colorUtilities,
  sizeUtilities,
  spacingUtilities,
  mergeClasses,
  getButtonClass,
  TailwindPlusPlugin
} from '../../packages/@ux3/plugin-tailwind-plus/src/index';

describe('TailwindPlusPlugin', () => {
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
  });

  // ========== Plugin Metadata ==========
  describe('Plugin Metadata', () => {
    it('should export the correct plugin name and version', () => {
      expect(TailwindPlusPlugin.name).toBe('@ux3/plugin-tailwind-plus');
      expect(TailwindPlusPlugin.version).toBe('0.1.0');
      expect(TailwindPlusPlugin.description).toContain('Tailwind CSS');
    });
  });

  // ========== FSM Factories ==========
  describe('FSM Factories', () => {
    it('should export FSM-driven dropdown component factory', () => {
      const fsm = createDropdownFSM();
      expect(fsm).toBeDefined();
      expect(fsm.id).toBe('dropdown');
      expect(fsm.current).toContain('closed');
      expect(fsm.context).toHaveProperty('open', false);
    });

    it('should export accordion FSM factory', () => {
      const fsm = createAccordionFSM();
      expect(fsm).toBeDefined();
      expect(fsm.id).toBe('accordion');
      expect(fsm.current).toContain('collapsed');
      expect(fsm.context).toHaveProperty('expanded', false);
    });

    it('should export tabs FSM factory', () => {
      const fsm = createTabsFSM();
      expect(fsm).toBeDefined();
      expect(fsm.id).toBe('tabs');
      expect(fsm.context).toHaveProperty('activeTab');
    });

    it('should export modal FSM factory', () => {
      const fsm = createModalFSM();
      expect(fsm).toBeDefined();
      expect(fsm.id).toBe('modal');
      expect(fsm.current).toContain('hidden');
      expect(fsm.context).toHaveProperty('visible', false);
    });

    it('should export toast FSM factory', () => {
      const fsm = createToastFSM();
      expect(fsm).toBeDefined();
      expect(fsm.id).toBe('toast');
      expect(fsm.context).toHaveProperty('visible', false);
    });

    it('should export navbar FSM factory', () => {
      const fsm = createNavbarFSM();
      expect(fsm).toBeDefined();
      expect(fsm.id).toBe('navbar');
      expect(fsm.context).toHaveProperty('mobileMenuOpen', false);
    });
  });

  // ========== Utility Classes ==========
  describe('Utility Classes', () => {
    it('should export color utilities', () => {
      expect(colorUtilities).toHaveProperty('primary');
      expect(colorUtilities).toHaveProperty('secondary');
      expect(colorUtilities).toHaveProperty('success');
      expect(colorUtilities).toHaveProperty('danger');
      expect(colorUtilities.primary).toContain('bg-blue-500');
      expect(colorUtilities.success).toContain('bg-green-500');
    });

    it('should export size utilities', () => {
      expect(sizeUtilities).toHaveProperty('xs');
      expect(sizeUtilities).toHaveProperty('sm');
      expect(sizeUtilities).toHaveProperty('md');
      expect(sizeUtilities).toHaveProperty('lg');
      expect(sizeUtilities.md).toContain('px-4');
    });

    it('should export spacing utilities', () => {
      expect(spacingUtilities).toHaveProperty('compact');
      expect(spacingUtilities).toHaveProperty('comfortable');
      expect(spacingUtilities).toHaveProperty('spacious');
      expect(spacingUtilities.compact).toContain('gap-1');
    });
  });

  // ========== Helper Functions ==========
  describe('Helper Functions', () => {
    it('should merge multiple class strings correctly', () => {
      const result = mergeClasses('px-4 py-2', 'bg-blue-500', 'hover:bg-blue-600');
      expect(result).toBe('px-4 py-2 bg-blue-500 hover:bg-blue-600');
    });

    it('should filter out falsy values in mergeClasses', () => {
      const result = mergeClasses('px-4', undefined, null, false, 'py-2');
      expect(result).toBe('px-4 py-2');
    });

    it('should create complete button classes with getButtonClass', () => {
      const result = getButtonClass('primary', 'md', 'custom-class');
      expect(result).toContain('rounded');
      expect(result).toContain('font-semibold');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('px-4 py-2');
      expect(result).toContain('custom-class');
    });
  });

  it('should support Tailwind utility classes', () => {
    const element = document.createElement('div');
    element.className = 'flex items-center justify-between p-4 bg-blue-500';
    document.body.appendChild(element);
    
    expect(element.classList.contains('flex')).toBe(true);
    expect(element.classList.contains('items-center')).toBe(true);
    expect(element.classList.contains('bg-blue-500')).toBe(true);
  });

  it('should handle responsive breakpoints', () => {
    const element = document.createElement('div');
    element.className = 'md:flex lg:grid xl:pb-8';
    document.body.appendChild(element);
    
    expect(element.classList.contains('md:flex')).toBe(true);
    expect(element.classList.contains('lg:grid')).toBe(true);
    expect(element.classList.contains('xl:pb-8')).toBe(true);
  });

  it('should support hover and state pseudoclasses', () => {
    const button = document.createElement('button');
    button.className = 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700';
    document.body.appendChild(button);
    
    expect(button.classList.contains('hover:bg-blue-600')).toBe(true);
    expect(button.classList.contains('active:bg-blue-700')).toBe(true);
  });

  it('should support dark mode classes', () => {
    const element = document.createElement('div');
    element.className = 'bg-white dark:bg-slate-900';
    document.body.appendChild(element);
    
    expect(element.classList.contains('dark:bg-slate-900')).toBe(true);
  });

  // ========== FSM Transitions ==========
  describe('FSM Transitions', () => {
    it('dropdown FSM should transition between states on TOGGLE', () => {
      const fsm = createDropdownFSM();
      const initialState = fsm.current;
      expect(initialState).toContain('closed');
      
      fsm.send('TOGGLE');
      const afterToggle = fsm.current;
      expect(afterToggle).toContain('open');
      
      fsm.send('TOGGLE');
      const afterClose = fsm.current;
      expect(afterClose).toContain('closed');
    });

    it('accordion FSM should expand and collapse', () => {
      const fsm = createAccordionFSM();
      expect(fsm.current).toContain('collapsed');
      
      fsm.send('EXPAND');
      expect(fsm.current).toContain('expanded');
      expect(fsm.context.expanded).toBe(true);
      
      fsm.send('COLLAPSE');
      expect(fsm.current).toContain('collapsed');
    });

    it('modal FSM should show and hide', () => {
      const fsm = createModalFSM();
      expect(fsm.current).toContain('hidden');
      
      fsm.send('SHOW');
      expect(fsm.current).toContain('visible');
      expect(fsm.context.visible).toBe(true);
      
      fsm.send('HIDE');
      expect(fsm.current).toContain('hidden');
    });

    it('tabs FSM should navigate between tabs', () => {
      const fsm = createTabsFSM();
      expect(fsm.current).toContain('tab1');
      
      fsm.send('SELECT_TAB_2');
      expect(fsm.current).toContain('tab2');
      
      fsm.send('SELECT_TAB_3');
      expect(fsm.current).toContain('tab3');
      
      fsm.send('SELECT_TAB_1');
      expect(fsm.current).toContain('tab1');
    });

    it('navbar FSM should handle menu toggle', () => {
      const fsm = createNavbarFSM();
      expect(fsm.current).toContain('closed');
      
      fsm.send('TOGGLE_MENU');
      expect(fsm.current).toContain('open');
      expect(fsm.context.mobileMenuOpen).toBe(true);
      
      fsm.send('TOGGLE_MENU');
      expect(fsm.current).toContain('closed');
    });
  });
});
