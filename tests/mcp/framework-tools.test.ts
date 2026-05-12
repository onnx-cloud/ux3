/**
 * Tests for UX3 Framework MCP Tools & Resources
 * 
 * Validates:
 * - Tool and resource constants are properly defined
 * - Handler registry maps are complete
 * - Tool/resource dispatchers work correctly
 * - All constants are unique (no duplicates)
 */

import { describe, it, expect } from 'vitest';
import {
  Ux3Tools,
  Ux3Resources,
  ux3ToolHandlers,
  ux3ResourceHandlers,
  callFrameworkTool,
  readFrameworkResource,
  ALL_FRAMEWORK_TOOLS,
  ALL_FRAMEWORK_RESOURCES,
} from '../../src/mcp/framework-tools';

describe('Framework MCP Tools & Resources', () => {
  describe('Ux3Tools constants', () => {
    it('defines all tool names as constants', () => {
      expect(Ux3Tools.WIDGETS_LIST).toBe('ux3.widgets.list');
      expect(Ux3Tools.WIDGETS_INSPECT).toBe('ux3.widgets.inspect');
      expect(Ux3Tools.SERVICES_LIST).toBe('ux3.services.list');
      expect(Ux3Tools.SERVICES_INSPECT).toBe('ux3.services.inspect');
      expect(Ux3Tools.ROUTES_LIST).toBe('ux3.routes.list');
      expect(Ux3Tools.ROUTES_INSPECT).toBe('ux3.routes.inspect');
      expect(Ux3Tools.I18N_KEYS).toBe('ux3.i18n.keys');
      expect(Ux3Tools.PLUGINS_LIST).toBe('ux3.plugins.list');
      expect(Ux3Tools.COMPILE_VIEW).toBe('ux3.compile.view');
      expect(Ux3Tools.VALIDATE_I18N).toBe('ux3.validate.i18n');
    });

    it('tool names are unique (no duplicates)', () => {
      const values = Object.values(Ux3Tools);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it('tool names follow naming convention (ux3.domain.action)', () => {
      Object.values(Ux3Tools).forEach(name => {
        expect(name).toMatch(/^ux3\.\w+\.\w+$/);
      });
    });
  });

  describe('Ux3Resources constants', () => {
    it('defines all resource URIs as constants', () => {
      expect(Ux3Resources.FRAMEWORK_DOCS).toBe('plugin://ux3/docs/framework');
      expect(Ux3Resources.SCHEMA_WIDGET).toBe('plugin://ux3/schema/widget');
      expect(Ux3Resources.SCHEMA_SERVICE).toBe('plugin://ux3/schema/service');
      expect(Ux3Resources.SCHEMA_ROUTE).toBe('plugin://ux3/schema/route');
      expect(Ux3Resources.SCHEMA_I18N).toBe('plugin://ux3/schema/i18n');
      expect(Ux3Resources.SCHEMA_VALIDATION).toBe('plugin://ux3/schema/validation');
    });

    it('resource URIs are unique (no duplicates)', () => {
      const values = Object.values(Ux3Resources);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it('resource URIs follow URI convention (plugin://ux3/...)', () => {
      Object.values(Ux3Resources).forEach(uri => {
        expect(uri).toMatch(/^plugin:\/\/ux3\//);
      });
    });
  });

  describe('Tool Handler Registry', () => {
    it('has handlers for all tools', () => {
      Object.values(Ux3Tools).forEach(toolName => {
        expect(ux3ToolHandlers).toHaveProperty(toolName);
      });
    });

    it('all handlers are functions', () => {
      Object.values(ux3ToolHandlers).forEach(handler => {
        expect(typeof handler).toBe('function');
      });
    });

    it('handlers accept args and optional app', async () => {
      const result = await ux3ToolHandlers[Ux3Tools.WIDGETS_LIST]({});
      expect(result).toBeDefined();
    });

    it('has exactly as many handlers as tools', () => {
      expect(Object.keys(ux3ToolHandlers)).toHaveLength(Object.values(Ux3Tools).length);
    });
  });

  describe('Resource Handler Registry', () => {
    it('has handlers for all resources', () => {
      Object.values(Ux3Resources).forEach(uri => {
        expect(ux3ResourceHandlers).toHaveProperty(uri);
      });
    });

    it('all handlers are functions', () => {
      Object.values(ux3ResourceHandlers).forEach(handler => {
        expect(typeof handler).toBe('function');
      });
    });

    it('handlers return strings', async () => {
      const result = await ux3ResourceHandlers[Ux3Resources.FRAMEWORK_DOCS]();
      expect(typeof result).toBe('string');
    });

    it('has exactly as many handlers as resources', () => {
      expect(Object.keys(ux3ResourceHandlers)).toHaveLength(
        Object.values(Ux3Resources).length
      );
    });
  });

  describe('callFrameworkTool', () => {
    it('dispatches to correct handler', async () => {
      const result = await callFrameworkTool(Ux3Tools.WIDGETS_LIST, {});
      expect(result).toBeDefined();
    });

    it('passes arguments to handler', async () => {
      const args = { testArg: 'testValue' };
      const result = await callFrameworkTool(Ux3Tools.WIDGETS_INSPECT, args);
      expect(result).toBeDefined();
    });

    it('throws for unknown tool', async () => {
      await expect(callFrameworkTool('unknown.tool', {})).rejects.toThrow(
        'Unknown framework tool: unknown.tool'
      );
    });

    it('handles all tools without error', async () => {
      for (const tool of Object.values(Ux3Tools)) {
        const result = await callFrameworkTool(tool, {});
        expect(result).toBeDefined();
      }
    });
  });

  describe('readFrameworkResource', () => {
    it('dispatches to correct handler', async () => {
      const result = await readFrameworkResource(Ux3Resources.FRAMEWORK_DOCS);
      expect(typeof result).toBe('string');
    });

    it('throws for unknown resource', async () => {
      await expect(readFrameworkResource('plugin://unknown/resource')).rejects.toThrow(
        'Unknown framework resource: plugin://unknown/resource'
      );
    });

    it('handles all resources without error', async () => {
      for (const resource of Object.values(Ux3Resources)) {
        const result = await readFrameworkResource(resource);
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('Discovery Collections', () => {
    it('ALL_FRAMEWORK_TOOLS contains all tool names', () => {
      expect(ALL_FRAMEWORK_TOOLS).toEqual(Object.values(Ux3Tools));
      expect(ALL_FRAMEWORK_TOOLS).toHaveLength(Object.keys(Ux3Tools).length);
    });

    it('ALL_FRAMEWORK_RESOURCES contains all resource URIs', () => {
      expect(ALL_FRAMEWORK_RESOURCES).toEqual(Object.values(Ux3Resources));
      expect(ALL_FRAMEWORK_RESOURCES).toHaveLength(Object.keys(Ux3Resources).length);
    });
  });

  describe('Constants vs Registry Consistency', () => {
    it('tool constants match handler registry keys', () => {
      const constantNames = Object.values(Ux3Tools);
      const handlerKeys = Object.keys(ux3ToolHandlers);
      expect(new Set(constantNames)).toEqual(new Set(handlerKeys));
    });

    it('resource constants match handler registry keys', () => {
      const constantURIs = Object.values(Ux3Resources);
      const handlerKeys = Object.keys(ux3ResourceHandlers);
      expect(new Set(constantURIs)).toEqual(new Set(handlerKeys));
    });
  });
});
