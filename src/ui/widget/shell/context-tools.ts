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
    this.dispatchEvent(new CustomEvent(UX_CHANGE, { bubbles: true, detail: { locale } }));
    this.dispatchEvent(new CustomEvent('ux:locale-change', { bubbles: true, detail: { locale } }));
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
    this.dispatchEvent(new CustomEvent(UX_CHANGE, { bubbles: true, detail: { theme: next } }));
    this.dispatchEvent(new CustomEvent('ux:theme-change', { bubbles: true, detail: { theme: next } }));
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onToggle(); }
  };
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
    this.dispatchEvent(new CustomEvent(UX_CHANGE, { bubbles: true, detail: { online: navigator.onLine } }));
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
