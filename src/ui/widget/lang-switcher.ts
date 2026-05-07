/**
 * Locale Switcher — <ux-lang-switcher>
 *
 * Renders as a native <select> and drives the locale runtime service. 
 * Reads initial state from the locale service and emits changes via
 * the context's locale service.
 */
interface LocaleOption {
  value: string;
  label: string;
}

const LOCALE_LABELS: Record<string, string> = {
  'en-US': 'English',
  'en': 'English',
  'es-ES': 'Español',
  'es': 'Español',
  'fr-FR': 'Français',
  'fr': 'Français',
  'de-DE': 'Deutsch',
  'de': 'Deutsch',
  'ar-SA': 'العربية',
  'ar': 'العربية',
  'ja-JP': '日本語',
  'ja': '日本語',
  'zh-CN': '中文',
  'zh': '中文',
};

export class UxLangSwitcher extends HTMLElement {
  private selectEl: HTMLSelectElement | null = null;

  private getLocaleOptions(): LocaleOption[] {
    const attr = this.getAttribute('locales');
    if (attr) {
      const codes = attr.split(',').map(s => s.trim()).filter(Boolean);
      if (codes.length > 0) {
        return codes.map(code => ({
          value: code,
          label: LOCALE_LABELS[code] || code,
        }));
      }
    }
    return [
      { value: 'en-US', label: 'English' },
      { value: 'es-ES', label: 'Español' },
      { value: 'fr-FR', label: 'Français' },
      { value: 'de-DE', label: 'Deutsch' },
      { value: 'ar-SA', label: 'العربية' },
      { value: 'ja-JP', label: '日本語' },
      { value: 'zh-CN', label: '中文' },
    ];
  }

  connectedCallback() {
    this.setAttribute('role', 'group');
    this.innerHTML = '';

    // Read current locale from document or navigator
    let current = document.documentElement.lang || 'en';
    if (!current || current === 'en') current = 'en-US';

    const select = document.createElement('select');
    select.style.cssText = 'padding:4px 8px;border-radius:4px;cursor:pointer;font:inherit;';
    for (const opt of this.getLocaleOptions()) {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.value === current || opt.value.startsWith(current)) {
        el.selected = true;
      }
      select.appendChild(el);
    }

    select.addEventListener('change', () => {
      const tag = select.value;
      this.applyLocale(tag);
    });

    this.appendChild(select);
    this.selectEl = select;

    // Sync with locale service if available on the app context
    this.syncFromService();
  }

  private async applyLocale(tag: string) {
    document.documentElement.lang = tag;
    document.documentElement.dir = /ar|fa|he|ur/i.test(tag) ? 'rtl' : 'ltr';

    // If locale service is available via app context, use it
    try {
      const ctx = await this.getAppContext();
      if (ctx?.services?.locale && typeof (ctx.services.locale as any).setLocale === 'function') {
        (ctx.services.locale as any).setLocale(tag);
      }
    } catch {
      // No app context available; just set document attributes
    }

    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { locale: tag },
    }));
  }

  private async getAppContext(): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).__ux3App) {
      return (window as any).__ux3App;
    }
    // Try reading from cookie / storage / navigator as fallback
    return null;
  }

  private async syncFromService() {
    try {
      const ctx = await this.getAppContext();
      if (ctx?.services?.locale) {
        const locale = ctx.services.locale.locale;
        if (locale?.primary && this.selectEl) {
          this.selectEl.value = locale.primary;
        }
        (ctx.services.locale as any).onChange?.((info: any) => {
          if (this.selectEl && info?.primary) {
            this.selectEl.value = info.primary;
          }
        });
      }
    } catch {
      // No app context
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-lang-switcher')) {
  customElements.define('ux-lang-switcher', UxLangSwitcher);
}
