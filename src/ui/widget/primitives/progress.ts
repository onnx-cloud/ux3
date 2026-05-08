import { UxValue } from './value.js';

export class UxProgress extends UxValue {
  protected onConnected(): void {
    super.onConnected();
    this.renderProgress();
  }

  protected onAttributeChanged(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'value') this.renderProgress();
  }

  private renderProgress(): void {
    const val = Math.min(100, Math.max(0, Number(this.getAttribute('value')) || 0));
    const label = this.textContent?.trim() || `${val}%`;
    this.innerHTML = '';
    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuenow', String(val));
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', '100');
    this.setAttribute('aria-label', label);

    const track = document.createElement('div');
    track.style.cssText = `width:100%;height:var(--ux-progress-height,0.5rem);background:var(--ux-progress-track-bg,var(--ux-color-track,#e2e8f0));border-radius:var(--ux-progress-radius,999px);overflow:hidden;`;

    const fill = document.createElement('div');
    fill.style.cssText = `width:${val}%;height:100%;background:var(--ux-progress-fill-bg,var(--ux-color-accent,#2563eb));border-radius:var(--ux-progress-radius,999px);transition:var(--ux-progress-transition,width 0.3s ease);`;

    track.appendChild(fill);
    this.appendChild(track);
  }
}
