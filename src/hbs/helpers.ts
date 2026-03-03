/**
 * HBS Built-in Helpers
 */

/**
 * Built-in helper functions
 * These intentionally accept `any` because they work with dynamic template context data
 */
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
export const builtInHelpers = {
  // Logic helpers
  eq: (a: unknown, b: unknown) => a === b,
  ne: (a: unknown, b: unknown) => a !== b,
  gt: (a: unknown, b: unknown) => (a as any) > (b as any),
  lt: (a: unknown, b: unknown) => (a as any) < (b as any),
  gte: (a: unknown, b: unknown) => (a as any) >= (b as any),
  lte: (a: unknown, b: unknown) => (a as any) <= (b as any),
  and: (a: unknown, b: unknown) => a && b,
  or: (a: unknown, b: unknown) => a || b,
  not: (a: unknown) => !a,

  // Array helpers
  length: (arr: unknown) => {
    if (Array.isArray(arr)) return arr.length;
    if (typeof arr === 'string') return arr.length;
    if (typeof arr === 'object' && arr !== null) return Object.keys(arr as Record<string, unknown>).length;
    return 0;
  },

  join: (arr: unknown, separator = ', ') => {
    if (!Array.isArray(arr)) return String(arr);
    return arr.map((item: unknown) => String(item)).join(String(separator));
  },

  first: (arr: unknown) => {
    if (Array.isArray(arr)) return arr[0];
    return undefined;
  },

  last: (arr: unknown) => {
    if (Array.isArray(arr)) return arr[(arr as unknown[]).length - 1];
    return undefined;
  },

  slice: (arr: unknown, start: number, end?: number) => {
    if (Array.isArray(arr)) return arr.slice(start, end);
    return arr;
  },

  // String helpers
  uppercase: (str: unknown) => String(str || '').toUpperCase(),
  lowercase: (str: unknown) => String(str || '').toLowerCase(),
  capitalize: (str: unknown) => {
    const s = String(str || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  trim: (str: unknown) => String(str || '').trim(),

  truncate: (str: unknown, length: number, suffix = '...') => {
    const s = String(str || '');
    if (s.length <= length) return s;
    return s.slice(0, length) + String(suffix);
  },

  reverse: (str: unknown) => {
    if (Array.isArray(str)) {
      const arr = str.slice() as unknown[];
      return arr.reverse();
    }
    return String(str || '').split('').reverse().join('');
  },

  // Type helpers
  type: (val: unknown) => {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  },

  truthy: (val: unknown) => {
    if (typeof val === 'boolean') return val;
    if (val == null) return false;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val as Record<string, unknown>).length > 0;
    return Boolean(val);
  },

  falsy: (val: unknown) => !builtInHelpers.truthy(val),

  empty: (val: unknown) => {
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'string') return val.length === 0;
    if (typeof val === 'object' && val !== null) return Object.keys(val as Record<string, unknown>).length === 0;
    return !builtInHelpers.truthy(val);
  },

  // Number helpers
  round: (num: number, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },

  floor: (num: number) => Math.floor(num),
  ceil: (num: number) => Math.ceil(num),
  abs: (num: number) => Math.abs(num),

  // Date helpers (basic)
  now: () => Date.now(),
  toDate: (str: string) => new Date(str).toISOString(),

  // HTML/string safety
  escapeHtml: (html: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(html || '').replace(/[&<>"']/g, char => map[char]);
  },

  // Default filter (for missing helpers)
  default: (val: unknown, defaultVal: unknown) => (val !== undefined && val !== null ? val : defaultVal),

  // Include/partial-like behavior
  get: (obj: unknown, path: string) => {
    if (!path) return obj;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const key of parts) {
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  },
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
};
