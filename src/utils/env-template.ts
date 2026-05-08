function resolveEnvTemplate(value: string): string {
  if (!value.startsWith('{{') || !value.endsWith('}}')) {
    return value;
  }
  const inner = value.slice(2, -2).trim();
  const fallbackMatch = inner.match(/^env\.(\w+)\s*\|\|\s*['"]([^'"]*)['"]$/);
  if (fallbackMatch) {
    const envKey = fallbackMatch[1];
    const defaultValue = fallbackMatch[2];
    return process.env[envKey] || defaultValue;
  }
  const envMatch = inner.match(/^env\.(\w+)$/);
  if (envMatch) {
    const envKey = envMatch[1];
    return process.env[envKey] || '';
  }
  return value;
}

export function resolveConfigTemplates(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return resolveEnvTemplate(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveConfigTemplates);
  }
  if (obj && typeof obj === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      resolved[key] = resolveConfigTemplates(value);
    }
    return resolved;
  }
  return obj;
}
