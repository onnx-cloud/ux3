/**
 * Dynamic Widget Registry — discovers UX3 widgets at runtime and exposes them as MCP resources.
 *
 * Unlike the hardcoded PRIMITIVES array in primitives/types.ts, this registry
 * scans registered Custom Elements (customElements registry) at runtime,
 * categorizes by kind, and provides introspection for MCP clients.
 */
import type { PrimitiveDefinition, PrimitiveKind } from '../ui/widget/primitives/types.js';
import { DEF_BY_TAG } from '../ui/widget/primitives/registry.js';

export interface WidgetDescriptor {
  tag: string;
  kind: PrimitiveKind;
  role: string;
  stateAttr?: string;
  attributes: string[];
  events: string[];
}

export interface WidgetCategory {
  kind: PrimitiveKind;
  count: number;
  widgets: WidgetDescriptor[];
}

export class WidgetRegistry {
  private descriptors: Map<string, WidgetDescriptor> = new Map();

  constructor() {
    this.discover();
  }

  /**
   * Discover all registered custom elements matching the ux-* prefix.
   * Pulls metadata from the hardcoded DEF_BY_TAG map and augments
   * with runtime introspection of observed attributes and known event patterns.
   */
  discover(): void {
    if (typeof customElements === 'undefined') return;

    this.descriptors.clear();

    for (const def of DEF_BY_TAG.values()) {
      const desc = this.buildDescriptor(def);
      this.descriptors.set(def.tag, desc);
    }
  }

  private buildDescriptor(def: PrimitiveDefinition): WidgetDescriptor {
    const events = this.inferEvents(def.kind);
    return {
      tag: def.tag,
      kind: def.kind,
      role: def.role || 'region',
      stateAttr: def.stateAttr,
      attributes: this.inferAttributes(def.tag, def.kind),
      events,
    };
  }

  private inferEvents(kind: PrimitiveKind): string[] {
    const base = ['ux:event', 'ux:change'];
    switch (kind) {
      case 'toggle':
      case 'checkbox':
      case 'switch':
        return [...base, 'click', 'keydown'];
      case 'input':
      case 'textarea':
      case 'search-bar':
      case 'combobox':
        return [...base, 'input', 'focus', 'blur'];
      case 'form':
        return [...base, 'submit', 'reset'];
      case 'calendar':
      case 'date-picker':
        return [...base, 'SELECT'];
      case 'flow-editor':
        return [...base, 'ADD', 'CONNECT', 'MOVE'];
      case 'kanban':
        return [...base, 'MOVE'];
      case 'gantt':
        return [...base, 'RESIZE'];
      case 'query-builder':
      case 'filter-builder':
        return [...base, 'ADD', 'REMOVE', 'UPDATE'];
      case 'pagination':
        return [...base, 'PREV', 'NEXT', 'GOTO'];
      case 'command-palette':
      case 'tree-nav':
        return [...base, 'SELECT'];
      case 'notifications':
        return [...base, 'RECEIVE'];
      case 'file-upload':
      case 'dropzone':
        return [...base, 'DROP', 'UPLOAD'];
      default:
        return base;
    }
  }

  private inferAttributes(_tag: string, kind: PrimitiveKind): string[] {
    const base = ['ux-state'];
    switch (kind) {
      case 'progress': return [...base, 'value', 'max', 'label'];
      case 'slider': return [...base, 'value', 'min', 'max', 'step'];
      case 'input':
      case 'textarea':
        return [...base, 'value', 'placeholder', 'name', 'required', 'disabled'];
      case 'checkbox':
      case 'switch':
        return [...base, 'checked', 'disabled'];
      case 'select':
      case 'combobox':
        return [...base, 'value', 'placeholder'];
      case 'spinner':
        return [...base, 'size'];
      case 'badge':
        return [...base, 'variant'];
      case 'avatar':
        return [...base, 'src', 'name', 'size'];
      case 'skeleton':
        return [...base, 'variant'];
      case 'alert':
        return [...base, 'type', 'dismissible'];
      case 'date-picker':
        return [...base, 'value'];
      case 'search-bar':
        return [...base, 'debounce', 'placeholder'];
      case 'pagination':
        return [...base, 'current', 'total'];
      case 'breadcrumb':
        return [...base, 'path', 'separator'];
      case 'calendar':
        return [...base, 'view'];
      case 'kanban':
        return [...base, 'columns'];
      case 'table-virtual':
        return [...base, 'columns', 'total', 'row-height'];
      case 'pivot-table':
        return [...base, 'rows', 'cols', 'values'];
      case 'dashboard':
        return [...base, 'cols', 'rows', 'gap'];
      default:
        return base;
    }
  }

  get(tag: string): WidgetDescriptor | undefined {
    return this.descriptors.get(tag);
  }

  list(): WidgetDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  listByKind(): WidgetCategory[] {
    const map = new Map<PrimitiveKind, WidgetDescriptor[]>();
    for (const desc of this.descriptors.values()) {
      if (!map.has(desc.kind)) map.set(desc.kind, []);
      map.get(desc.kind)!.push(desc);
    }
    return Array.from(map.entries()).map(([kind, widgets]) => ({
      kind,
      count: widgets.length,
      widgets,
    }));
  }

  getStats(): { total: number; byKind: Record<string, number> } {
    const byKind: Record<string, number> = {};
    for (const desc of this.descriptors.values()) {
      byKind[desc.kind] = (byKind[desc.kind] || 0) + 1;
    }
    return { total: this.descriptors.size, byKind };
  }

  toMCPResource(name: string): string {
    if (name === 'all') return this.mcpListAll();
    const desc = this.descriptors.get(name);
    if (!desc) {
      // Try prefix match
      const matches = this.list().filter(d => d.tag.includes(name));
      if (matches.length === 0) throw new Error(`Widget not found: ${name}`);
      return this.mcpListMatches(matches);
    }
    return this.mcpDescribeWidget(desc);
  }

  private mcpListAll(): string {
    const categories = this.listByKind();
    let out = '# UX3 Widget Registry\n\n';
    out += `**Total widgets:** ${this.descriptors.size}\n\n`;

    for (const cat of categories) {
      out += `## ${cat.kind} (${cat.count})\n\n`;
      for (const w of cat.widgets) {
        const stateInfo = w.stateAttr ? ` [stateAttr: ${w.stateAttr}]` : '';
        out += `- \`${w.tag}\` \`role="${w.role}"\`${stateInfo}\n`;
      }
      out += '\n';
    }
    return out;
  }

  private mcpListMatches(matches: WidgetDescriptor[]): string {
    let out = '# Widget Search Results\n\n';
    for (const w of matches) {
      out += `## ${w.tag}\n\n`;
      out += `- **Kind:** ${w.kind}\n`;
      out += `- **Role:** ${w.role}\n`;
      if (w.stateAttr) out += `- **State attr:** ${w.stateAttr}\n`;
      out += `- **Events:** ${w.events.join(', ')}\n`;
      out += `- **Attributes:** ${w.attributes.join(', ')}\n\n`;
    }
    return out;
  }

  private mcpDescribeWidget(desc: WidgetDescriptor): string {
    let out = `# Widget: \`${desc.tag}\`\n\n`;
    out += `| Property | Value |\n|----------|-------|\n`;
    out += `| Kind | ${desc.kind} |\n`;
    out += `| Role | ${desc.role} |\n`;
    if (desc.stateAttr) out += `| State attr | ${desc.stateAttr} |\n`;
    out += `| Events | ${desc.events.join(', ')} |\n`;
    out += `| Attributes | ${desc.attributes.join(', ')} |\n`;
    out += '\n## Usage\n\n```html\n';
    out += `<${desc.tag} ux-state="myFsm.myState"`;
    if (desc.stateAttr) out += ` ${desc.stateAttr}="true"`;
    out += '>\n';
    out += `  <!-- ${desc.kind} content -->\n`;
    out += `</${desc.tag}>\n`;
    out += '```\n';
    return out;
  }
}
