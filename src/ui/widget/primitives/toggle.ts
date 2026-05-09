import { UxBase } from './base.js';

const TOGGLE_OPEN_ACTIONS: Record<string, [string, string]> = {
  open: ['OPEN', 'CLOSE'],
  checked: ['CHECK', 'UNCHECK'],
  selected: ['SELECT', 'DESELECT'],
  pressed: ['PRESS', 'RELEASE'],
};

export class UxToggle extends UxBase {
  private control: HTMLElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    if (this.hasAttribute(stateAttr)) {
      this.applyAriaState(true);
    }
    if (this.getAttribute('role') === 'checkbox' || this.getAttribute('role') === 'switch') {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.render();
    }
    this.addEventListener('click', this.onToggleActivate);
    this.addEventListener('keydown', this.onKeyDown);
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onToggleActivate);
    this.removeEventListener('keydown', this.onKeyDown);
    if (this.control) {
      this.control.removeEventListener('click', this.onToggleActivate);
      this.control.removeEventListener('keydown', this.onKeyDown);
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const role = this.getAttribute('role');
    const checked = this.hasAttribute('checked');
    const label = this.textContent?.trim() || '';

    if (role === 'switch') {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; }
          .track { position: relative; width: 2.25rem; height: 1.25rem; border-radius: 9999px; background: var(--_sw-bg, #e2e8f0); transition: background 0.2s; }
          .track.on { background: var(--_sw-on, #3b82f6); }
          .thumb { position: absolute; top: 0.125rem; left: 0.125rem; width: 1rem; height: 1rem; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
          .track.on .thumb { left: 1.125rem; }
          .label { font-size: 0.875rem; color: var(--_sw-label, #334155); user-select: none; }
        </style>
        <div class="track ${checked ? 'on' : ''}" role="switch" aria-checked="${checked}" tabindex="0">
          <div class="thumb"></div>
        </div>
        <span class="label">${label}</span>
      `;
      this.control = this.shadowRoot.querySelector('.track');
    } else {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; }
          .box { width: 1rem; height: 1rem; border: 2px solid var(--_cb-border, #cbd5e1); border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
          .box.on { background: var(--_cb-on, #3b82f6); border-color: var(--_cb-on, #3b82f6); }
          .box.on::after { content: ''; width: 0.375rem; height: 0.5625rem; border: solid #fff; border-width: 0 0.125rem 0.125rem 0; transform: rotate(45deg); margin-top: -0.0625rem; }
          .label { font-size: 0.875rem; color: var(--_cb-label, #334155); user-select: none; }
        </style>
        <div class="box ${checked ? 'on' : ''}" role="checkbox" aria-checked="${checked}" tabindex="0"></div>
        <span class="label">${label}</span>
      `;
      this.control = this.shadowRoot.querySelector('.box');
    }

    if (this.control) {
      this.control.addEventListener('click', (e) => { e.stopPropagation(); this.onToggleActivate(); });
      this.control.addEventListener('keydown', this.onKeyDown as EventListener);
    }
  }

  private readonly onToggleActivate = (): void => {
    const stateAttr = this.getStateAttr();
    const next = !this.hasAttribute(stateAttr);
    this.toggleAttribute(stateAttr, next);
    this.applyAriaState(next);
    this.updateVisual(next);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true, composed: true,
      detail: { [stateAttr]: next },
    }));
    const pair = TOGGLE_OPEN_ACTIONS[stateAttr];
    if (pair) {
      this.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: pair[next ? 0 : 1] },
      }));
    }
  };

  private updateVisual(on: boolean): void {
    if (this.control) {
      this.control.classList.toggle('on', on);
      this.control.setAttribute('aria-checked', String(on));
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggleActivate();
    }
  };

  protected getStateAttr(): string {
    return this.definition?.stateAttr ?? 'open';
  }

  protected applyAriaState(next: boolean): void {
    const role = this.getAttribute('role');
    if (role === 'switch' || role === 'checkbox') {
      this.setAttribute('aria-checked', String(next));
    } else {
      this.setAttribute('aria-expanded', String(next));
    }
  }
}
