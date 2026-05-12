import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-toggle-style';
const STYLE_CSS = `    ux-toggle { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none; }
    ux-toggle .toggle-track { position: relative; width: 2.25rem; height: 1.25rem; border-radius: 9999px; background: var(--_sw-bg, #e2e8f0); transition: background 0.2s; flex-shrink: 0; }
    ux-toggle .toggle-track.on { background: var(--_sw-on, #3b82f6); }
    ux-toggle .toggle-thumb { position: absolute; top: 0.125rem; left: 0.125rem; width: 1rem; height: 1rem; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    ux-toggle .toggle-track.on .toggle-thumb { left: 1.125rem; }
    ux-toggle .toggle-box { width: 1rem; height: 1rem; border: 2px solid var(--_cb-border, #cbd5e1); border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
    ux-toggle .toggle-box.on { background: var(--_cb-on, #3b82f6); border-color: var(--_cb-on, #3b82f6); }
    ux-toggle .toggle-box.on::after { content: ''; width: 0.375rem; height: 0.5625rem; border: solid #fff; border-width: 0 0.125rem 0.125rem 0; transform: rotate(45deg); margin-top: -0.0625rem; }
    ux-toggle .toggle-label { font-size: 0.875rem; color: var(--_cb-label, #334155); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    ux-toggle[role="switch"] .toggle-label,
    ux-toggle[role="checkbox"] .toggle-label { color: var(--_sw-label, #334155); }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
const TOGGLE_OPEN_ACTIONS: Record<string, [string, string]> = {
  open: ['OPEN', 'CLOSE'],
  checked: ['CHECK', 'UNCHECK'],
  selected: ['SELECT', 'DESELECT'],
  pressed: ['PRESS', 'RELEASE'],
};

export class UxToggle extends UxBase {
  private control: HTMLElement | null = null;
  private _rendered = false;

  protected onConnected(): void {
    super.onConnected();
const stateAttr = this.getStateAttr();
    if (this.hasAttribute(stateAttr)) {
      this.applyAriaState(true);
    }

    if (!this._rendered) {
      this._rendered = true;
      if (this.getAttribute('role') === 'checkbox' || this.getAttribute('role') === 'switch') {
        this.render();
      }
    }

    this.addEventListener('click', this.onToggleActivate);
    this.addEventListener('keydown', this.onKeyDown);
  }

  protected applyData(data: any): void {
    const stateAttr = this.getStateAttr();
    if (typeof data === 'boolean') {
      this.toggleAttribute(stateAttr, data);
    } else if (data && typeof data === 'object') {
      let val: any = data[stateAttr];
      if (val === undefined) val = data.checked ?? data.value;
      if (typeof val === 'boolean' || typeof val === 'string') {
        this.toggleAttribute(stateAttr, val === true || val === 'true' || val === '1');
      } else if (val === undefined && 'label' in data && this.control) {
        const labelEl = this.querySelector('.toggle-label');
        if (labelEl) labelEl.textContent = String(data.label);
      }
    }
    this.applyAriaState(this.hasAttribute(stateAttr));
    this.updateVisual(this.hasAttribute(stateAttr));
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onToggleActivate);
    this.removeEventListener('keydown', this.onKeyDown);
  }

  private render(): void {
    const role = this.getAttribute('role');
    const checked = this.hasAttribute('checked');
    const label = this.textContent?.trim() || '';

    if (role === 'switch') {
      const track = document.createElement('div');
      track.className = `toggle-track${checked ? ' on' : ''}`;
      track.setAttribute('role', 'switch');
      track.setAttribute('aria-checked', String(checked));
      track.tabIndex = 0;
      const thumb = document.createElement('div');
      thumb.className = 'toggle-thumb';
      track.appendChild(thumb);
      this.appendChild(track);
      this.control = track;
    } else {
      const box = document.createElement('div');
      box.className = `toggle-box${checked ? ' on' : ''}`;
      box.setAttribute('role', 'checkbox');
      box.setAttribute('aria-checked', String(checked));
      box.tabIndex = 0;
      this.appendChild(box);
      this.control = box;
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'toggle-label';
    labelEl.textContent = label;
    this.appendChild(labelEl);

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
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true, composed: true,
      detail: { [stateAttr]: next },
    }));
    const pair = TOGGLE_OPEN_ACTIONS[stateAttr];
    if (pair) {
      this.dispatchEvent(new CustomEvent('ux:widget.event', {
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
    return ((this.constructor as typeof UxBase & { primitiveDef?: { stateAttr?: string } }).primitiveDef?.stateAttr) ?? 'open';
  }

  protected applyAriaState(next: boolean): void {
    const role = this.getAttribute('role');
    if (role === 'switch' || role === 'checkbox') {
      this.setAttribute('aria-checked', String(next));
    } else {
      this.setAttribute('aria-expanded', String(next));
    }
  }

  static get observedAttributes(): string[] {
    return ['checked', 'open', 'selected', 'pressed'];
  }
}
