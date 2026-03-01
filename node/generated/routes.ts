/* Auto-generated route matchers */

export function matchRoute(pattern: string, path: string): Record<string,string> | null {
  const regex = new RegExp('^' + pattern.replace(/{([^}]+)}/g, function(_,p) { return '(?<' + p + '>[^/]+)'; }) + '$');
  const m = path.match(regex);
  return m && (m as any).groups ? (m as any).groups : null;
}

export default matchRoute;

