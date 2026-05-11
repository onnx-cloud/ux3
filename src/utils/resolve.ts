export function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: any, key) =>
    (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

export function applyResultMap(result: any, map: Record<string, string> | undefined): Record<string, unknown> {
  if (!map || typeof result !== 'object' || result === null) return result ?? {};
  const mapped: Record<string, unknown> = {};
  for (const [contextKey, resultPath] of Object.entries(map)) {
    mapped[contextKey] = resolveDotPath(result as Record<string, unknown>, resultPath);
  }
  return mapped;
}
