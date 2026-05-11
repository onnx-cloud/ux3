import { UxValue } from './value.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-progress-style';
const STYLE_CSS = `
  ux-progress { display: inline-block; width: 100%; max-width: var(--ux-progress-max-w, 24rem); }
  ux-progress .ux-pg-wrap { display: flex; align-items: center; gap: 0.5rem; width: 100%; height: 1.5rem; }
  ux-progress .ux-pg-track { flex: 1; height: var(--ux-progress-height, 0.5rem); background: var(--ux-progress-track-bg, var(--ux-color-track, #e2e8f0)); border-radius: var(--ux-progress-radius, 999px); overflow: hidden; }
  ux-progress .ux-pg-fill { height: 100%; background: var(--ux-progress-fill-bg, var(--ux-color-accent, #2563eb)); border-radius: var(--ux-progress-radius, 999px); transition: var(--ux-progress-transition, width 0.3s ease); }
  ux-progress .ux-pg-label { font-size: 0.75rem; color: inherit; white-space: nowrap; flex-shrink: 0; }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxProgress extends UxValue {
  private _built = false;

  protected onConnected(): void {
    super.onConnected();
    this.renderProgress();
  }

  protected onAttributeChanged(name: string, _ov: string | null, _nv: string | null): void {
    if (name === 'value' || name === 'max') this.renderProgress();
  }

  static get observedAttributes() {
    return ['value', 'max'];
  }

  protected applyData(data: any): void {
    if (typeof data === 'number') {
      this.setAttribute('value', String(data));
      this.renderProgress();
    } else if (data && typeof data === 'object') {
      if ('value' in data) this.setAttribute('value', String(data.value));
      if ('max' in data) this.setAttribute('max', String(data.max));
      this.renderProgress();
    }
  }

  private renderProgress(): void {
    const rawValue = Number(this.getAttribute('value')) || 0;
    const rawMax = this.hasAttribute('max') ? (Number(this.getAttribute('max')) || 100) : 100;
    const val = Math.min(rawMax, Math.max(0, rawValue));
    const pct = rawMax > 0 ? Math.round((val / rawMax) * 100) : 0;
    const label = this.textContent?.trim() || `${val} / ${rawMax}`;

    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuenow', String(val));
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', String(rawMax));
    this.setAttribute('aria-label', label);

    if (!this._built) {
      this._built = true;
      this.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'ux-pg-wrap';
      const track = document.createElement('div');
      track.className = 'ux-pg-track';
      const fill = document.createElement('div');
      fill.className = 'ux-pg-fill';
      track.appendChild(fill);
      wrapper.appendChild(track);
      const labelEl = document.createElement('span');
      labelEl.className = 'ux-pg-label';
      wrapper.appendChild(labelEl);
      this.appendChild(wrapper);
    }

    const fill = this.querySelector('.ux-pg-fill') as HTMLElement;
    if (fill) fill.style.width = `${pct}%`;
    const labelEl = this.querySelector('.ux-pg-label') as HTMLElement;
    if (labelEl) labelEl.textContent = this.hasAttribute('max') ? `${val} / ${rawMax}` : `${pct}%`;
  }
}
