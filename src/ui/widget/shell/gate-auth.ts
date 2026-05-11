/**
 * Auth Gate — <ux-gate-auth>
 *
 * Declarative UI visibility control based on auth claims.  Shows gated content
 * when auth conditions match; renders fallback slot when unauthorized or pending
 * slot while loading.
 *
 * Security note: gates are UI visibility controls only;
 * API-side enforcement remains mandatory.
 */

interface AuthSnapshot {
  authenticated: boolean;
  claims: Record<string, any>;
  loading: boolean;
}

function getAuthSnapshot(): AuthSnapshot {
  // Read from global auth store if attached (plugin-oidc sets __ux3Auth)
  const auth: any = typeof window !== 'undefined' ? (window as any).__ux3Auth : null;
  if (auth && typeof auth.getSnapshot === 'function') {
    return auth.getSnapshot();
  }
  // Default: not authenticated, no claims
  return { authenticated: false, claims: {}, loading: false };
}

/** Normalize claim values for matching */
function normalizeClaim(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) return value.map((v) => normalizeClaim(v));
  return value;
}

function claimsMatch(
  claims: Record<string, any>,
  constraints: Record<string, string>,
  mode: 'all' | 'any'
): boolean {
  const entries = Object.entries(constraints);
  if (entries.length === 0) return true;

  const check = ([key, expected]: [string, string]): boolean => {
    const claimVal = claims[key];
    if (claimVal === undefined || claimVal === null) return false;

    if (Array.isArray(claimVal)) {
      const normalized = claimVal.map((v: any) => String(v).toLowerCase());
      return normalized.includes(expected.toLowerCase());
    }

    return String(claimVal).toLowerCase() === expected.toLowerCase();
  };

  return mode === 'all' ? entries.every(check) : entries.some(check);
}

export class UxGateAuth extends HTMLElement {
  private fallbackSlot: HTMLSlotElement | null = null;
  private pendingSlot: HTMLSlotElement | null = null;
  private contentSlot: HTMLSlotElement | null = null;

  static get observedAttributes(): string[] {
    return ['aud', 'roles', 'scopes', 'iss', 'sub', 'match'];
  }

  connectedCallback() {
    this.setAttribute('role', 'none');
    this.innerHTML = '';

    // Hidden slots for template selection
    this.innerHTML = `
      <slot name="fallback" style="display:none"></slot>
      <slot name="pending" style="display:none"></slot>
      <slot></slot>
    `;

    this.fallbackSlot = this.querySelector('slot[name="fallback"]');
    this.pendingSlot = this.querySelector('slot[name="pending"]');
    this.contentSlot = this.querySelector('slot:not([name])');

    this.evaluateGate();

    // Subscribe to auth changes
    const auth: any = typeof window !== 'undefined' ? (window as any).__ux3Auth : null;
    if (auth && typeof auth.subscribe === 'function') {
      auth.subscribe(() => this.evaluateGate());
    }
  }

  attributeChangedCallback() {
    this.evaluateGate();
  }

  private evaluateGate() {
    const snapshot = getAuthSnapshot();

    // Show pending slot while loading
    if (snapshot.loading) {
      this.showSlot('pending');
      return;
    }

    // Show fallback when not authenticated
    if (!snapshot.authenticated) {
      this.showSlot('fallback');
      return;
    }

    // Build constraints from attributes
    const constraints: Record<string, string> = {};
    const aud = this.getAttribute('aud');
    const roles = this.getAttribute('roles');
    const scopes = this.getAttribute('scopes');
    const iss = this.getAttribute('iss');
    const sub = this.getAttribute('sub');

    if (aud) constraints.aud = aud;
    if (roles) constraints.roles = roles;
    if (scopes) constraints.scopes = scopes;
    if (iss) constraints.iss = iss;
    if (sub) constraints.sub = sub;

    // Also check for custom claims passed as data- attributes
    for (const attr of this.attributes) {
      if (attr.name.startsWith('data-claim-')) {
        const key = attr.name.replace('data-claim-', '');
        constraints[key] = attr.value;
      }
    }

    // No constraints: show content if authenticated
    if (Object.keys(constraints).length === 0) {
      this.showSlot('content');
      return;
    }

    // Normalize and match
    const normalizedClaims: Record<string, any> = {};
    for (const [key, val] of Object.entries(snapshot.claims)) {
      normalizedClaims[key] = normalizeClaim(val);
    }

    const mode = (this.getAttribute('match') || 'all') as 'all' | 'any';
    if (claimsMatch(normalizedClaims, constraints, mode)) {
      this.showSlot('content');
    } else {
      this.showSlot('fallback');
    }
  }

  private showSlot(type: 'content' | 'fallback' | 'pending') {
    if (this.contentSlot) this.contentSlot.style.display = type === 'content' ? '' : 'none';
    if (this.fallbackSlot) this.fallbackSlot.style.display = type === 'fallback' ? '' : 'none';
    if (this.pendingSlot) this.pendingSlot.style.display = type === 'pending' ? '' : 'none';
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-gate-auth')) {
  customElements.define('ux-gate-auth', UxGateAuth);
}
