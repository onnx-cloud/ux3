import { describe, it, expect, beforeEach } from 'vitest';
import { registerWidget, resolveWidgetMetadata, getRegisteredWidgets, clearWidgetRegistry } from '../../../src/ui/widget/widget-registry';
import type { WidgetMetadata } from '../../../src/ui/widget/widget-registry';

describe('Widget Registry', () => {
  beforeEach(() => {
    clearWidgetRegistry();
  });

  describe('registerWidget', () => {
    it('registers a widget metadata entry', () => {
      const meta: WidgetMetadata = {
        tag: 'ux-test-widget',
        role: 'button',
        kind: 'toggle',
        stateAttr: 'pressed',
        family: 'form',
      };

      registerWidget(meta);

      const resolved = resolveWidgetMetadata('ux-test-widget');
      expect(resolved).toBeDefined();
      expect(resolved!.tag).toBe('ux-test-widget');
      expect(resolved!.role).toBe('button');
      expect(resolved!.kind).toBe('toggle');
      expect(resolved!.stateAttr).toBe('pressed');
      expect(resolved!.family).toBe('form');
    });

    it('does not overwrite existing registration', () => {
      const meta1: WidgetMetadata = { tag: 'ux-test-widget', kind: 'toggle' };
      const meta2: WidgetMetadata = { tag: 'ux-test-widget', kind: 'region' };

      registerWidget(meta1);
      registerWidget(meta2);

      const resolved = resolveWidgetMetadata('ux-test-widget');
      expect(resolved!.kind).toBe('toggle');
    });

    it('normalizes tag to lowercase', () => {
      registerWidget({ tag: 'UX-Mixed-Case', kind: 'region' });
      const resolved = resolveWidgetMetadata('ux-mixed-case');
      expect(resolved).toBeDefined();
    });
  });

  describe('resolveWidgetMetadata', () => {
    it('returns undefined for unknown tag', () => {
      const resolved = resolveWidgetMetadata('ux-nonexistent');
      expect(resolved).toBeUndefined();
    });

    it('resolves by HTML element class via primitiveDef', () => {
      const meta: WidgetMetadata = { tag: 'ux-class-widget', role: 'group', kind: 'card' };
      registerWidget(meta);

      class TestEl extends HTMLElement {}
      Object.defineProperty(TestEl, 'primitiveDef', { value: { tag: 'ux-class-widget', role: 'group', kind: 'card' } });

      const resolved = resolveWidgetMetadata(TestEl as any);
      expect(resolved).toBeDefined();
      expect(resolved!.tag).toBe('ux-class-widget');
    });
  });

  describe('getRegisteredWidgets', () => {
    it('returns all registered widgets', () => {
      registerWidget({ tag: 'ux-a', kind: 'region' });
      registerWidget({ tag: 'ux-b', kind: 'toggle' });

      const widgets = getRegisteredWidgets();
      expect(widgets).toHaveLength(2);
    });
  });

  describe('clearWidgetRegistry', () => {
    it('clears all registrations', () => {
      registerWidget({ tag: 'ux-a', kind: 'region' });
      clearWidgetRegistry();
      expect(getRegisteredWidgets()).toHaveLength(0);
    });
  });

  describe('tag deduplication', () => {
    it('handles repeated calls idempotently', () => {
      for (let i = 0; i < 5; i++) {
        registerWidget({ tag: 'ux-idempotent', kind: 'card' });
      }
      expect(getRegisteredWidgets()).toHaveLength(1);
    });
  });
});
