import { UxBase } from '../primitives/base.js';
import { escapeText } from '../primitives/helpers.js';
import { UX_CHANGE } from '../../../utils/helpers.js';

export class UxLangSwitcher extends UxBase {
  private selectEl: HTMLSelectElement | null = null;
  private readonly rtlLanguages = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi']);

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    window.addEventListener('languagechange', this.onLanguageChange);
  }

  protected onDisconnected(): void {
    super.onDisconnected();
    this.selectEl?.removeEventListener('change', this.onChange);
    window.removeEventListener('languagechange', this.onLanguageChange);
  }

  private getLocales(): string[] {
    const attrLocales = (this.getAttribute('locales') || '')
      .split(',').map(v => v.trim()).filter(Boolean);
    if (attrLocales.length) return attrLocales;
    const app = (window as any).__ux3App;
    const svc = app?.locale || app?.services?.locale;
    if (svc?.supportedLocales?.length) return svc.supportedLocales;
    return Array.from(new Set(navigator.languages || [navigator.language || 'en']));
  }

  private getCurrentLocale(locales: string[]): string {
    const app = (window as any).__ux3App;
    const svc = app?.locale || app?.services?.locale;
    if (svc) {
      const p = svc.locale?.primary, l = svc.locale?.language;
      if (p && locales.includes(p)) return p;
      if (l && locales.includes(l)) return l;
    }
    const explicit = this.getAttribute('value');
    if (explicit && locales.includes(explicit)) return explicit;
    const docLang = document.documentElement.lang;
    if (docLang && locales.includes(docLang)) return docLang;
    return locales[0] || 'en';
  }

  private render(): void {
    const locales = this.getLocales();
    const current = this.getCurrentLocale(locales);
    const label = this.getAttribute('label') || '';
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: var(--ux-locale-display, inline-flex); align-items: center; gap: var(--ux-locale-gap, 0.375rem); }
        label { font: inherit; color: inherit; }
        select {
          font: inherit; color: var(--color-text, #111827);
          background: var(--color-bg, #fff);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
          min-width: 5.5rem;
        }
      </style>
      ${label ? `<label part="label">${escapeText(label)}</label>` : ''}
      <select part="select"></select>
    `;

    const select = this.shadowRoot.querySelector('select') as HTMLSelectElement;
    for (const l of locales) {
      const o = document.createElement('option');
      o.value = l; o.textContent = l; select.appendChild(o);
    }
    select.value = current;
    if (this.selectEl) this.selectEl.removeEventListener('change', this.onChange);
    this.selectEl = select;
    this.selectEl.addEventListener('change', this.onChange);
  }

  private readonly onLanguageChange = (): void => {
    this.render();
    this.setAttribute('value', this.getCurrentLocale(this.getLocales()));
  };

  private readonly onChange = (): void => {
    if (!this.selectEl) return;
    const locale = this.selectEl.value;
    this.setAttribute('value', locale);
    const app = (window as any).__ux3App;
    const svc = app?.locale || app?.services?.locale;
    if (svc && typeof svc.setLocale === 'function') svc.setLocale(locale);
    window.dispatchEvent(new Event('languagechange'));
    this.dispatchEvent(new CustomEvent('ux:i18n.locale.change', { bubbles: true, detail: { locale } }));
  };
}

export class UxThemeToggle extends UxBase {
  private buttonEl: HTMLButtonElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    this.applyTheme(this.getTheme());
    window.addEventListener('storage', this.onStorageChange);
  }

  protected onDisconnected(): void {
    super.onDisconnected();
    this.buttonEl?.removeEventListener('click', this.onToggle);
    this.buttonEl?.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('storage', this.onStorageChange);
  }

  private getTheme(): 'light' | 'dark' {
    const p = window.localStorage.getItem('ux3.color.scheme');
    if (p === 'light' || p === 'dark') return p;
    const a = this.getAttribute('theme');
    if (a === 'light' || a === 'dark') return a;
    const d = document.documentElement.dataset.theme;
    if (d === 'light' || d === 'dark') return d;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private readonly onStorageChange = (e: StorageEvent): void => {
    if (e.key === 'ux3.color.scheme' && e.newValue && (e.newValue === 'light' || e.newValue === 'dark')) {
      this.applyTheme(e.newValue);
    }
  };

  private render(): void {
    const theme = this.getTheme();
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        button {
          font: inherit; color: var(--color-text, #111827);
          background: var(--color-bg, #fff);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: 999px;
          padding: 0.25rem 0.625rem;
          cursor: pointer;
        }
      </style>
      <button part="button" type="button"></button>
    `;
    const button = this.shadowRoot.querySelector('button') as HTMLButtonElement;
    this.buttonEl = button;
    this.applyTheme(theme);
    this.buttonEl.addEventListener('click', this.onToggle);
    this.buttonEl.addEventListener('keydown', this.onKeyDown);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    const html = document.documentElement;
    html.classList.toggle('dark', theme === 'dark');
    html.setAttribute('data-color-scheme', theme);
    html.dataset.theme = theme;
    html.style.colorScheme = theme;
    this.setAttribute('theme', theme);
    this.toggleAttribute('checked', theme === 'dark');
    if (this.buttonEl) {
      this.buttonEl.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
      this.buttonEl.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  private readonly onToggle = (): void => {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    try { window.localStorage.setItem('ux3.color.scheme', next); } catch {}
    this.dispatchEvent(new CustomEvent('ux:theme.change', { bubbles: true, detail: { theme: next } }));
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onToggle(); }
  };
}

export class UxThemeSwitch extends UxBase {
  private selectEl: HTMLSelectElement | null = null;
  private readonly STORAGE_KEY = 'ux3.theme.variant';

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    this.applyTheme(this.getTheme());
    window.addEventListener('storage', this.onStorageChange);
  }

  protected onDisconnected(): void {
    super.onDisconnected();
    this.selectEl?.removeEventListener('change', this.onChange);
    window.removeEventListener('storage', this.onStorageChange);
  }

  private getThemeOptions(): Array<{ value: string; label: string; url?: string }> {
    const options: Array<{ value: string; label: string; url?: string }> = [];
    const childOptions = Array.from(this.querySelectorAll('option')) as HTMLOptionElement[];
    for (const option of childOptions) {
      const value = option.value?.trim() || option.textContent?.trim() || '';
      if (!value) continue;
      const url = option.getAttribute('data-theme-url')?.trim() || undefined;
      options.push({ value, label: option.textContent?.trim() || value, url });
    }
    if (options.length) return options;

    const raw = (this.getAttribute('themes') || '').split(',').map(v => v.trim()).filter(Boolean);
    for (const item of raw) {
      const parts = item.split('|').map(v => v.trim());
      const value = parts[0] || '';
      if (!value) continue;
      const label = parts[1] || value;
      const url = parts[2] || undefined;
      options.push({ value, label, url });
    }
    return options;
  }

  private getTheme(): string {
    const stored = this.isPersisted() ? this.getStoredTheme() : null;
    if (stored) return stored;

    const attrTheme = this.getAttribute('theme');
    const options = this.getThemeOptions().map((o) => o.value);
    if (attrTheme && options.includes(attrTheme)) return attrTheme;

    const rootTheme = document.documentElement.dataset.themeStyle;
    if (rootTheme && options.includes(rootTheme)) return rootTheme;

    return options[0] || '';
  }

  private getStoredTheme(): string | null {
    try {
      const value = window.localStorage.getItem(this.STORAGE_KEY);
      return value || null;
    } catch {
      return null;
    }
  }

  private readonly onStorageChange = (e: StorageEvent): void => {
    if (e.key === this.STORAGE_KEY && e.newValue) {
      this.applyTheme(e.newValue);
    }
  };

  private render(): void {
    const theme = this.getTheme();
    const options = this.getThemeOptions();
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: 0.5rem; }
        label { font: inherit; color: inherit; }
        select {
          font: inherit; color: var(--color-text, #111827);
          background: var(--color-bg, #fff);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          min-width: 8rem;
          cursor: pointer;
        }
      </style>
      ${this.getAttribute('label') ? `<label part="label">${escapeText(this.getAttribute('label') || '')}</label>` : ''}
      <select part="select"></select>
    `;

    const select = this.shadowRoot.querySelector('select') as HTMLSelectElement;
    this.selectEl = select;
    if (!select) return;

    for (const option of options) {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    }

    select.value = theme;
    select.addEventListener('change', this.onChange);
  }

  private applyTheme(theme: string): void {
    const html = document.documentElement;
    if (theme) {
      html.dataset.themeStyle = theme;
      this.setAttribute('theme', theme);
    } else {
      html.removeAttribute('data-theme-style');
      this.removeAttribute('theme');
    }

    if (this.selectEl) {
      this.selectEl.value = theme;
    }

    const url = this.getThemeUrl(theme);
    this.applyStylesheet(url);
  }

  private getThemeUrl(theme: string): string | undefined {
    const option = this.getThemeOptions().find((opt) => opt.value === theme);
    return option?.url;
  }

  private applyStylesheet(url?: string): void {
    const id = 'ux-theme-variant-stylesheet';
    const existing = document.head.querySelector<HTMLLinkElement>(`link#${id}`);
    if (!url) {
      if (existing) existing.remove();
      return;
    }

    const normalizedHref = (() => {
      try { return new URL(url, document.baseURI).href; } catch { return url; }
    })();

    if (existing) {
      if (existing.href !== normalizedHref) existing.href = normalizedHref;
      return;
    }

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = normalizedHref;
    link.dataset.uxTheme = 'true';
    document.head.appendChild(link);
  }

  private readonly onChange = (): void => {
    if (!this.selectEl) return;

    const next = this.selectEl.value;
    this.applyTheme(next);

    if (this.isPersisted()) {
      try { window.localStorage.setItem(this.STORAGE_KEY, next); } catch {}
    }

    this.dispatchEvent(new CustomEvent('ux:theme.variant.change', {
      bubbles: true,
      detail: { variant: next, url: this.getThemeUrl(next) },
    }));
  };

  private isPersisted(): boolean {
    return this.getAttribute('persist') !== 'false';
  }
}

export class UxNetworkStatus extends UxBase {
  private tooltipTimer: ReturnType<typeof setTimeout> | null = null;

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    window.addEventListener('online', this.onChange);
    window.addEventListener('offline', this.onChange);
  }

  protected onDisconnected(): void {
    super.onDisconnected();
    window.removeEventListener('online', this.onChange);
    window.removeEventListener('offline', this.onChange);
    if (this.tooltipTimer) clearTimeout(this.tooltipTimer);
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const hideLabel = this.hasAttribute('hide-label');
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: var(--ux-status-gap, 0.375rem); position: relative; cursor: default; }
        .dot { width: var(--ux-status-dot-size, 0.625rem); height: var(--ux-status-dot-size, 0.625rem); border-radius: 50%; background: var(--ux-status-color, var(--ux-status-online, #16a34a)); transition: background var(--ux-status-transition, 0.2s ease); }
        :host([online]) .dot { background: var(--ux-status-color, var(--ux-status-online, #16a34a)); }
        :host(:not([online])) .dot { background: var(--ux-status-offline, #dc2626); }
        .label { font: inherit; color: var(--color-text, #111827); }
        ${hideLabel ? '.label { display: none; }' : ''}
        .tooltip { display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: var(--color-text, #111827); color: var(--color-bg, #fff); border: 1px solid var(--color-border, #d1d5db); border-radius: 6px; padding: 6px 10px; font-size: 11px; white-space: nowrap; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        :host(:hover) .tooltip, :host(:focus-within) .tooltip { display: block; }
      </style>
      <span class="dot" aria-hidden="true"></span>
      <span part="label" class="label" aria-live="polite"></span>
      <slot name="tooltip"></slot>
      <span part="tooltip" class="tooltip"><slot name="tooltip-content">${this.getTooltipContent()}</slot></span>
    `;
    this.update();
  }

  private readonly onChange = (): void => {
    this.update();
    this.dispatchEvent(new CustomEvent('ux:app.online.change', { bubbles: true, detail: { online: navigator.onLine } }));
  };

  private getLabel(): string {
    const app = (window as any).__ux3App, i18n = app?.i18n;
    if (navigator.onLine) return i18n ? i18n('network.online') || 'Online' : 'Online';
    return i18n ? i18n('network.offline') || 'Offline' : 'Offline';
  }

  private getTooltipContent(): string {
    const app = (window as any).__ux3App, i18n = app?.i18n;
    if (navigator.onLine) return i18n ? i18n('network.tooltip.online') || 'Connected' : 'Connected';
    return i18n ? i18n('network.tooltip.offline') || 'No internet' : 'No internet';
  }

  private update(): void {
    if (!this.shadowRoot) return;
    const online = navigator.onLine;
    const label = this.getLabel();
    const labelEl = this.shadowRoot.querySelector('.label') as HTMLSpanElement;
    if (labelEl) labelEl.textContent = label;
    const tooltipSlot = this.shadowRoot.querySelector('.tooltip slot[name="tooltip-content"]') as HTMLSlotElement;
    if (tooltipSlot && !this.querySelector('[slot="tooltip-content"]')) {
      const parent = tooltipSlot.parentElement;
      if (parent && !parent.querySelector(':scope > [slot]')) {
        parent.textContent = this.getTooltipContent();
        const ns = document.createElement('slot');
        ns.name = 'tooltip-content'; parent.appendChild(ns);
      }
    }
    this.toggleAttribute('online', online);
    this.setAttribute('aria-label', label);
  }
}
