import type { PrimitiveKind, PrimitiveDefinition } from './primitives/types.js';

export interface WidgetMetadata {
  tag: string;
  role?: string;
  kind: PrimitiveKind;
  stateAttr?: string;
  family?: string;
  formAssociated?: boolean;
}

const _registry = new Map<string, WidgetMetadata>();
const _byKind = new Map<PrimitiveKind, WidgetMetadata[]>();

export function registerWidget(meta: WidgetMetadata): void {
  const tag = meta.tag.toLowerCase();
  if (_registry.has(tag)) return;
  _registry.set(tag, { ...meta, tag });

  const existing = _byKind.get(meta.kind) || [];
  existing.push(meta);
  _byKind.set(meta.kind, existing);
}

export function resolveWidgetMetadata(tagOrClass: string | typeof HTMLElement): WidgetMetadata | undefined {
  if (typeof tagOrClass === 'string') {
    return _registry.get(tagOrClass.toLowerCase());
  }
  const def = (tagOrClass as any).primitiveDef as WidgetMetadata | undefined;
  if (def) return def;
  const tag = (tagOrClass as any).__uxTag as string;
  if (tag) return _registry.get(tag);
  return undefined;
}

export function getWidgetsByKind(kind: PrimitiveKind): WidgetMetadata[] {
  return _byKind.get(kind) || [];
}

export function getRegisteredWidgets(): WidgetMetadata[] {
  return Array.from(_registry.values());
}

export function clearWidgetRegistry(): void {
  _registry.clear();
  _byKind.clear();
}
