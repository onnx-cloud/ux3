/**
 * Auth Gate Wrappers — Convenience components extending <ux-gate-auth> semantics.
 *
 * Each wrapper composes <ux-gate-auth> with preset constraints for common patterns.
 */
import './gate-auth.js';

// ── ux-gate-anon ───────────────────────────────────────────────────────────
export class UxGateAnon extends HTMLElement {
  connectedCallback() {
    const gate = document.createElement('ux-gate-auth');
    gate.setAttribute('aud', '__anon__');
    gate.innerHTML = this.innerHTML;
    gate.querySelectorAll('slot').forEach((s) => s.remove());
    const fallback = document.createElement('div');
    fallback.slot = 'fallback';
    fallback.append(...Array.from(this.children));
    gate.appendChild(fallback);
    // Invert: show content when NOT authenticated
    const content = document.createElement('slot');
    gate.appendChild(content);
    this.innerHTML = '';
    this.appendChild(gate);
    this.style.display = 'contents';
  }
}

// ── ux-gate-role ───────────────────────────────────────────────────────────
export class UxGateRole extends HTMLElement {
  connectedCallback() {
    const roles = this.getAttribute('roles') || '';
    const gate = document.createElement('ux-gate-auth');
    gate.setAttribute('roles', roles);
    gate.innerHTML = this.innerHTML;
    this.innerHTML = '';
    this.appendChild(gate);
    this.style.display = 'contents';
  }
}

// ── ux-gate-scope ──────────────────────────────────────────────────────────
export class UxGateScope extends HTMLElement {
  connectedCallback() {
    const scopes = this.getAttribute('scopes') || '';
    const gate = document.createElement('ux-gate-auth');
    gate.setAttribute('scopes', scopes);
    gate.innerHTML = this.innerHTML;
    this.innerHTML = '';
    this.appendChild(gate);
    this.style.display = 'contents';
  }
}

// ── ux-gate-feature ────────────────────────────────────────────────────────
export class UxGateFeature extends HTMLElement {
  connectedCallback() {
    const feature = this.getAttribute('feature') || '';
    const gate = document.createElement('ux-gate-auth');
    gate.setAttribute('data-claim-feature', feature);
    gate.innerHTML = this.innerHTML;
    this.innerHTML = '';
    this.appendChild(gate);
    this.style.display = 'contents';
  }
}
