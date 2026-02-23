/* Auto-generated route matchers */

export function matchRoute(pattern: string, path: string): Record<string,string> | null {
  const regex = new RegExp('^' + pattern.replace(/{([^}]+)}/g, function(_,p) { return '(?<' + p + '>[^/]+)'; }) + '$');
  const m = path.match(regex);
  return m && (m as any).groups ? (m as any).groups : null;
}

export default matchRoute;

export function matchRoute_0(path: string) { return matchRoute('/', path); }
export function matchRoute_1(path: string) { return matchRoute('/home', path); }
export function matchRoute_2(path: string) { return matchRoute('/login', path); }
export function matchRoute_3(path: string) { return matchRoute('/dashboard', path); }
export function matchRoute_4(path: string) { return matchRoute('/dashboard/:section', path); }
export function matchRoute_5(path: string) { return matchRoute('/market', path); }
export function matchRoute_6(path: string) { return matchRoute('/market/:exchange', path); }
export function matchRoute_7(path: string) { return matchRoute('/asset/:symbol', path); }
export function matchRoute_8(path: string) { return matchRoute('/for-you', path); }
export function matchRoute_9(path: string) { return matchRoute('/chat', path); }
export function matchRoute_10(path: string) { return matchRoute('/chat/:conversation', path); }
export function matchRoute_11(path: string) { return matchRoute('/blog', path); }
export function matchRoute_12(path: string) { return matchRoute('/blog/:slug', path); }
export function matchRoute_13(path: string) { return matchRoute('/news', path); }
export function matchRoute_14(path: string) { return matchRoute('/account', path); }
export function matchRoute_15(path: string) { return matchRoute('/billing', path); }
export function matchRoute_16(path: string) { return matchRoute('/macro', path); }
export function matchRoute_17(path: string) { return matchRoute('/sign-up', path); }