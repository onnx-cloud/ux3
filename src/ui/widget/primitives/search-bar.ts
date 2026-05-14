/**
 * UX3 Search Bar Component (light DOM)
 */
import { UxControl } from './ux-control.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-search-bar-style';
const STYLE_CSS = `    ux-search-bar { display: flex; width: 100%; max-width: 100%; align-items: center; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0 0.75rem; background: white; box-sizing: border-box; }
    ux-search-bar:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
    ux-search-bar .icon { color: #9ca3af; margin-right: 0.75rem; }
    ux-search-bar input { border: none; padding: 0.5rem 0; outline: none; flex: 1; font: inherit; min-width: 0; }
    ux-search-bar .clear { display: none; background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 1rem; }
    ux-search-bar .clear.visible { display: inline; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxSearchBar extends UxControl {
  private input!: HTMLInputElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected onConnected(): void {
    super.onConnected();
    const debounce = parseInt(this.getAttribute('debounce') || '300', 10);

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = '\uD83D\uDD0D';

    this.input = document.createElement('input');
    this.input.type = 'search';
    this.input.setAttribute('placeholder', 'Search...');

    const clear = document.createElement('button');
    clear.className = 'clear';
    clear.textContent = '\u00D7';

    this.appendChild(icon);
    this.appendChild(this.input);
    this.appendChild(clear);

    this.input.addEventListener('input', this._onInput);
    clear.addEventListener('click', this._onClear);
  }

  protected onDisconnected(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    super.onDisconnected();
  }

  private readonly _onInput = (): void => {
    const clear = this.querySelector('button.clear');
    if (clear) clear.classList.toggle('visible', this.input.value.length > 0);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.emit(), parseInt(this.getAttribute('debounce') || '300', 10));
  };

  private readonly _onClear = (): void => {
    this.input.value = '';
    const clear = this.querySelector('button.clear');
    if (clear) clear.classList.remove('visible');
    this.emit();
  };

  private emit(): void {
    this.dispatchEvent(new CustomEvent('ux:search.action', {
      bubbles: true, composed: true,
      detail: { action: 'SEARCH', query: this.input.value },
    }));
  }
}
