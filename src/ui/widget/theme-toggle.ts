/**
 * Theme Toggle — <ux-theme-toggle>
 *
 * Reads initial state from data-color-scheme attribute and toggles between
 * light/dark via the color-scheme module.
 */
import { getColorScheme, setColorScheme, toggleColorScheme, type ColorScheme } from '../color-scheme.js';

export class UxThemeToggle extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'switch');
    this.setAttribute('tabindex', '0');
    this.syncAriaState();
    this.addEventListener('click', this.onToggle);
    this.addEventListener('keydown', this.onKeyDown);

    document.addEventListener('ux3:color-scheme-change', this.onSchemeChange);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onToggle);
    this.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('ux3:color-scheme-change', this.onSchemeChange);
  }

  private syncAriaState() {
    const scheme = getColorScheme();
    const isDark = scheme === 'dark';
    this.setAttribute('aria-checked', String(isDark));
    // Use data attribute for CSS selectors
    this.setAttribute('data-theme', scheme);
  }

  private readonly onToggle = () => {
    toggleColorScheme();
    this.syncAriaState();
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggle();
    }
  };

  private readonly onSchemeChange = (e: Event) => {
    const detail = (e as CustomEvent<{ scheme: ColorScheme }>).detail;
    if (detail?.scheme) {
      this.setAttribute('data-theme', detail.scheme);
      this.setAttribute('aria-checked', String(detail.scheme === 'dark'));
    }
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-theme-toggle')) {
  customElements.define('ux-theme-toggle', UxThemeToggle);
}
