import { UxValue } from './value.js';

export class UxProgress extends UxValue {
  protected onConnected(): void {
    super.onConnected();
    this.renderProgress();
  }

  protected onAttributeChanged(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'value' || name === 'max') this.renderProgress();
  }

  static get observedAttributes() {
    return ['value', 'max'];
  }

  private renderProgress(): void {
    const rawValue = Number(this.getAttribute('value')) || 0;
    const rawMax = this.hasAttribute('max') ? (Number(this.getAttribute('max')) || 100) : 100;
    const val = Math.min(rawMax, Math.max(0, rawValue));
    const pct = rawMax > 0 ? Math.round((val / rawMax) * 100) : 0;
    const label = this.textContent?.trim() || `${val} / ${rawMax}`;
    this.innerHTML = '';
    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuenow', String(val));
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', String(rawMax));
    this.setAttribute('aria-label', label);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;align-items:center;gap:0.5rem;`;

    const track = document.createElement('div');
    track.style.cssText = `flex:1;height:var(--ux-progress-height,0.5rem);background:var(--ux-progress-track-bg,var(--ux-color-track,#e2e8f0));border-radius:var(--ux-progress-radius,999px);overflow:hidden;`;

    const fill = document.createElement('div');
    fill.style.cssText = `width:${pct}%;height:100%;background:var(--ux-progress-fill-bg,var(--ux-color-accent,#2563eb));border-radius:var(--ux-progress-radius,999px);transition:var(--ux-progress-transition,width 0.3s ease);`;

    track.appendChild(fill);
    wrapper.appendChild(track);

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `font-size:0.75rem;color:inherit;white-space:nowrap;`;
    labelEl.textContent = this.hasAttribute('max') ? `${val} / ${rawMax}` : `${pct}%`;
    wrapper.appendChild(labelEl);

    this.appendChild(wrapper);
  }
}
