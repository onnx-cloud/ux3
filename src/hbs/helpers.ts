/**
 * HBS Built-in Helpers
 */

/**
 * Built-in helper functions
 */
export const builtInHelpers = {
  // Logic helpers
  eq: (a: any, b: any) => a === b,
  ne: (a: any, b: any) => a !== b,
  gt: (a: any, b: any) => a > b,
  lt: (a: any, b: any) => a < b,
  gte: (a: any, b: any) => a >= b,
  lte: (a: any, b: any) => a <= b,
  and: (a: any, b: any) => a && b,
  or: (a: any, b: any) => a || b,
  not: (a: any) => !a,

  // Array helpers
  length: (arr: any) => {
    if (Array.isArray(arr)) return arr.length;
    if (typeof arr === 'string') return arr.length;
    if (typeof arr === 'object' && arr !== null) return Object.keys(arr).length;
    return 0;
  },

  join: (arr: any, separator = ', ') => {
    if (!Array.isArray(arr)) return String(arr);
    return arr.map(item => String(item)).join(String(separator));
  },

  first: (arr: any) => {
    if (Array.isArray(arr)) return arr[0];
    return undefined;
  },

  last: (arr: any) => {
    if (Array.isArray(arr)) return arr[arr.length - 1];
    return undefined;
  },

  slice: (arr: any, start: number, end?: number) => {
    if (Array.isArray(arr)) return arr.slice(start, end);
    return arr;
  },

  // String helpers
  uppercase: (str: any) => String(str || '').toUpperCase(),
  lowercase: (str: any) => String(str || '').toLowerCase(),
  capitalize: (str: any) => {
    const s = String(str || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  trim: (str: any) => String(str || '').trim(),

  truncate: (str: any, length: number, suffix = '...') => {
    const s = String(str || '');
    if (s.length <= length) return s;
    return s.slice(0, length) + String(suffix);
  },

  reverse: (str: any) => {
    if (Array.isArray(str)) return [...str].reverse();
    return String(str || '').split('').reverse().join('');
  },

  // Type helpers
  type: (val: any) => {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  },

  truthy: (val: any) => {
    if (typeof val === 'boolean') return val;
    if (val == null) return false;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return Boolean(val);
  },

  falsy: (val: any) => !builtInHelpers.truthy(val),

  empty: (val: any) => {
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'string') return val.length === 0;
    if (typeof val === 'object' && val !== null) return Object.keys(val).length === 0;
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
  default: (val: any, defaultVal: any) => (val !== undefined && val !== null ? val : defaultVal),

  // Include/partial-like behavior
  get: (obj: any, path: string) => {
    if (!path) return obj;
    return path.split('.').reduce((v: any, key: string) => v?.[key], obj);
  },
};
