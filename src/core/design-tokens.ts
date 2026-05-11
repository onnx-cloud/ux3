/**
 * UX3 Design Token Registry — Single source of truth for all visual primitives.
 *
 * All widget styles, ux-style definitions, and CSS-injected variables reference
 * this registry.  No hardcoded colour / spacing / radius / shadow values in
 * widget source — everything flows through `var(--token)`.
 */

export const tokens = {
  colors: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#64748b',
    secondaryHover: '#475569',
    success: '#10b981',
    successHover: '#059669',
    warning: '#f59e0b',
    warningHover: '#d97706',
    danger: '#ef4444',
    dangerHover: '#dc2626',
    info: '#06b6d4',
    infoHover: '#0891b2',

    surface: {
      default: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      overlay: '#000000',
    },
    text: {
      default: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      muted: '#cbd5e1',
      inverse: '#ffffff',
    },
    border: {
      default: '#cbd5e1',
      light: '#e2e8f0',
      strong: '#94a3b8',
    },
    feedback: {
      successBg: '#d1fae5',
      successText: '#065f46',
      warningBg: '#fef3c7',
      warningText: '#92400e',
      errorBg: '#fee2e2',
      errorText: '#991b1b',
      infoBg: '#cffafe',
      infoText: '#0e7490',
    },
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
  },

  sizes: {
    avatar: { sm: '2rem', md: '2.5rem', lg: '3.5rem' },
    button: {
      sm:  { height: '1.75rem', padding: '0.375rem 0.75rem' },
      md:  { height: '2.25rem', padding: '0.5rem 1rem' },
      lg:  { height: '2.75rem', padding: '0.75rem 1.5rem' },
    },
    badge: {
      default: { height: '1.25rem', padding: '0.125rem 0.625rem' },
      lg:      { height: '1.5rem',  padding: '0.25rem 0.75rem' },
    },
    input: {
      sm: { height: '1.75rem', padding: '0.25rem 0.5rem' },
      md: { height: '2.25rem', padding: '0.5rem 0.75rem' },
      lg: { height: '2.75rem', padding: '0.625rem 1rem' },
    },
    icon: { sm: '1rem', md: '1.25rem', lg: '1.5rem' },
  },

  typography: {
    h1:      { fontSize: '2rem',    fontWeight: '700', lineHeight: '1.2' },
    h2:      { fontSize: '1.5rem',  fontWeight: '700', lineHeight: '1.3' },
    h3:      { fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4' },
    body:    { fontSize: '1rem',    fontWeight: '400', lineHeight: '1.5' },
    small:   { fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.5' },
    caption: { fontSize: '0.75rem', fontWeight: '500', lineHeight: '1.25' },
  },

  borderRadius: {
    none: '0',
    xs:   '0.25rem',
    sm:   '0.375rem',
    md:   '0.5rem',
    lg:   '0.75rem',
    xl:   '1rem',
    full: '9999px',
  },

  shadows: {
    none:  'none',
    sm:    '0 1px 2px 0 rgba(0,0,0,0.05)',
    md:    '0 4px 6px -1px rgba(0,0,0,0.1)',
    lg:    '0 10px 15px -3px rgba(0,0,0,0.1)',
    xl:    '0 20px 25px -5px rgba(0,0,0,0.1)',
    inset: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
  },

  interactions: {
    hover:    { opacity: '0.9', filter: 'brightness(0.95)' },
    active:   { opacity: '0.8', filter: 'brightness(0.9)' },
    focus:    { outline: '2px solid #2563eb', outlineOffset: '2px' },
    disabled: { opacity: '0.5', cursor: 'not-allowed' },
  },

  transitions: {
    fast:   'all 100ms ease',
    normal: 'all 200ms ease',
    slow:   'all 300ms ease',
  },

  zIndex: {
    base:         '0',
    dropdown:     '10',
    sticky:       '20',
    fixed:        '30',
    modalBackdrop:'40',
    modal:        '50',
    popover:      '60',
    tooltip:      '70',
    notification: '80',
  },
} as const;

export type DesignTokens = typeof tokens;

/**
 * Compile the token tree into a flat map of CSS custom property names → values.
 * Nested objects produce dotted keys (e.g. `colors.surface.default` → `--color-surface-default`).
 *
 * Special-cased keys:
 *  - `colors.*`    → `--color-{key}`
 *  - `spacing.*`   → `--spacing-{key}`
 *  - `sizes.*`     → `--size-{key}`  (flattened one level)
 *  - `typography.*`→ `--font-{key}-{prop}`
 *  - `borderRadius.*` → `--radius-{key}`
 *  - `shadows.*`   → `--shadow-{key}`
 *  - `interactions.*` → `--{key}` (hover/active/disabled/focus sub-props)
 *  - `transitions.*`  → `--transition-{key}`
 *  - `zIndex.*`       → `--z-{key}`
 */
export function tokensToCssVars(t: DesignTokens = tokens): string[] {
  const out: string[] = [];

  // --- colors (flat + nested) ----------------------------------------------
  const flatColors: Record<string, string> = {};
  for (const [k, v] of Object.entries(t.colors)) {
    if (typeof v === 'string')           flatColors[k] = v;
    else if (v && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Record<string,string>)) {
        flatColors[`${k}-${sk}`] = sv;
      }
    }
  }
  for (const [k, v] of Object.entries(flatColors)) {
    out.push(`--color-${k}: ${v};`);
  }

  // --- spacing --------------------------------------------------------------
  for (const [k, v] of Object.entries(t.spacing)) {
    out.push(`--spacing-${k}: ${v};`);
  }

  // --- sizes (one level of nesting) -----------------------------------------
  const flattenSizes = (obj: Record<string,unknown>, prefix: string): Record<string,string> => {
    const result: Record<string,string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' || typeof v === 'number') result[`${prefix}-${k}`] = String(v);
      else if (v && typeof v === 'object') Object.assign(result, flattenSizes(v as Record<string,unknown>, `${prefix}-${k}`));
    }
    return result;
  };
  for (const [k, v] of Object.entries(flattenSizes(t.sizes as unknown as Record<string,unknown>, ''))) {
    out.push(`--size${k}: ${v};`);
  }

  // --- typography -----------------------------------------------------------
  for (const [name, props] of Object.entries(t.typography)) {
    for (const [prop, val] of Object.entries(props)) {
      out.push(`--font-${name}-${prop}: ${val};`);
    }
  }

  // --- border-radius --------------------------------------------------------
  for (const [k, v] of Object.entries(t.borderRadius)) {
    out.push(`--radius-${k}: ${v};`);
  }

  // --- shadows --------------------------------------------------------------
  for (const [k, v] of Object.entries(t.shadows)) {
    out.push(`--shadow-${k}: ${v};`);
  }

  // --- interactions ---------------------------------------------------------
  const flatInteractions: Record<string,string> = {};
  for (const [k, v] of Object.entries(t.interactions)) {
    if (typeof v === 'string') flatInteractions[k] = v;
    else if (v && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Record<string,string>)) {
        flatInteractions[`${k}-${sk}`] = sv;
      }
    }
  }
  for (const [k, v] of Object.entries(flatInteractions)) {
    out.push(`--${k}: ${v};`);
  }

  // --- transitions -----------------------------------------------------------
  for (const [k, v] of Object.entries(t.transitions)) {
    out.push(`--transition-${k}: ${v};`);
  }

  // --- z-index ---------------------------------------------------------------
  for (const [k, v] of Object.entries(t.zIndex)) {
    out.push(`--z-${k}: ${v};`);
  }

  return out;
}

/**
 * Build a `:root { ... }` CSS block from the design tokens.
 */
export function designTokensCss(t?: DesignTokens): string {
  const vars = tokensToCssVars(t);
  return `:root {\n${vars.map(l => '  ' + l).join('\n')}\n}`;
}
