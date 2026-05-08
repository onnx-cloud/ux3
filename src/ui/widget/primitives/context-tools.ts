import { UxBase } from './base.js';
import { escapeText } from './helpers.js';

export class UxLangSwitcher extends UxBase {
  private selectEl: HTMLSelectElement | null = null;
  private readonly rtlLanguages = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi']);

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  protected onDisconnected(): void {
    this.selectEl?.removeEventListener('change', this.onChange);
  }

  private getLocales(): string[] {
    const attrLocales = (this.getAttribute('locales') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (attrLocales.length > 0) {
      return attrLocales;
    }

    const app = (window as any).__ux3App;
    const localeService = app?.locale || app?.services?.locale;
    if (localeService?.supportedLocales?.length) {
      return localeService.supportedLocales;
    }

    const browserPreferred = navigator.languages || [navigator.language || 'en'];
    return Array.from(new Set(browserPreferred));
  }

  private getCurrentLocale(locales: string[]): string {
    const app = (window as any).__ux3App;
    const localeService = app?.locale || app?.services?.locale;
    const serviceLocale = localeService?.locale?.primary || localeService?.locale?.language;
    if (serviceLocale && locales.includes(serviceLocale)) return serviceLocale;

    const explicit = this.getAttribute('value');
    if (explicit && locales.includes(explicit)) return explicit;

    const docLang = document.documentElement.lang;
    if (docLang && locales.includes(docLang)) return docLang;

    return locales[0] || 'en';
  }

  private render(): void {
    const locales = this.getLocales();
    const current = this.getCurrentLocale(locales);

    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: var(--ux-locale-display, inline-flex); align-items: center; gap: var(--ux-locale-gap, 0.375rem); }
        label { font: inherit; color: inherit; }
        select {
          font: inherit;
          color: inherit;
          background: var(--ux-color-surface, #ffffff);
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-radius: var(--ux-radius, 0.375rem);
          padding: var(--ux-locale-select-padding, 0.25rem 0.5rem);
          min-width: var(--ux-locale-select-min-width, 5.5rem);
        }
      </style>
      <label part="label">${escapeText(this.getAttribute('label') || 'Language')}</label>
      <select part="select"></select>
    `;

    const select = this.shadowRoot.querySelector('select') as HTMLSelectElement;
    for (const locale of locales) {
      const option = document.createElement('option');
      option.value = locale;
      option.textContent = locale;
      select.appendChild(option);
    }
    select.value = current;
    this.selectEl = select;
    this.selectEl.addEventListener('change', this.onChange);
  }

  private readonly onChange = (): void => {
    if (!this.selectEl) {
      return;
    }

    const locale = this.selectEl.value;
    this.setAttribute('value', locale);

    const app = (window as any).__ux3App;
    const localeService = app?.locale || app?.services?.locale;

    if (localeService && typeof localeService.setLocale === 'function') {
      localeService.setLocale(locale);
    }

    window.dispatchEvent(new Event('languagechange'));
    this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { locale } }));
    this.dispatchEvent(new CustomEvent('ux:locale-change', { bubbles: true, detail: { locale } }));
  };
}

export class UxThemeToggle extends UxBase {
  private buttonEl: HTMLButtonElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  protected onDisconnected(): void {
    this.buttonEl?.removeEventListener('click', this.onToggle);
    this.buttonEl?.removeEventListener('keydown', this.onKeyDown);
  }

  private getTheme(): 'light' | 'dark' {
    const persisted = this.hasAttribute('persist') && this.getAttribute('persist') !== 'false'
      ? window.localStorage.getItem('ux3.theme')
      : null;
    const attrTheme = this.getAttribute('theme');
    const docTheme = document.documentElement.dataset.theme;

    if (persisted === 'light' || persisted === 'dark') return persisted;
    if (attrTheme === 'light' || attrTheme === 'dark') return attrTheme;
    if (docTheme === 'light' || docTheme === 'dark') return docTheme;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private render(): void {
    const theme = this.getTheme();
    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        button {
          font: inherit;
          color: inherit;
          background: var(--ux-btn-bg, #ffffff);
          border: var(--ux-btn-border, 1px solid #cbd5e1);
          border-radius: var(--ux-btn-radius, 999px);
          padding: var(--ux-btn-padding, 0.25rem 0.625rem);
          cursor: var(--ux-btn-cursor, pointer);
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
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Also set data-color-scheme so tokens.css (from ux/token/*.yaml) responds
    document.documentElement.setAttribute('data-color-scheme', theme);
    this.setAttribute('theme', theme);
    this.toggleAttribute('checked', theme === 'dark');
    if (this.buttonEl) {
      this.buttonEl.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
      this.buttonEl.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  private readonly onToggle = (): void => {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);

    const shouldPersist = this.hasAttribute('persist') && this.getAttribute('persist') !== 'false';
    if (shouldPersist) {
      try {
        window.localStorage.setItem('ux3.theme', next);
      } catch {
        // ignore storage failures
      }
    }

    this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { theme: next } }));
    this.dispatchEvent(new CustomEvent('ux:theme-change', { bubbles: true, detail: { theme: next } }));
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggle();
    }
  };
}

export class UxNetworkStatus extends UxBase {
  private showTooltip = false;
  private tooltipTimer: ReturnType<typeof setTimeout> | null = null;

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    window.addEventListener('online', this.onConnectivityChange);
    window.addEventListener('offline', this.onConnectivityChange);
  }

  protected onDisconnected(): void {
    window.removeEventListener('online', this.onConnectivityChange);
    window.removeEventListener('offline', this.onConnectivityChange);
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
    }
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const hideLabel = this.hasAttribute('hide-label');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: var(--ux-status-gap, 0.375rem); position: relative; cursor: default; }
        .dot {
          width: var(--ux-status-dot-size, 0.625rem);
          height: var(--ux-status-dot-size, 0.625rem);
          border-radius: 50%;
          background: var(--ux-status-color, var(--ux-status-online, #16a34a));
          transition: background var(--ux-status-transition, 0.2s ease);
        }
        :host([online]) .dot {
          background: var(--ux-status-color, var(--ux-status-online, #16a34a));
        }
        :host(:not([online])) .dot {
          background: var(--ux-status-offline, #dc2626);
        }
        .label {
          font: inherit;
          color: inherit;
        }
        ${hideLabel ? '.label { display: none; }' : ''}
        .tooltip {
          display: none;
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--ux-tooltip-bg, #0f172a);
          color: var(--ux-tooltip-color, #e2e8f0);
          border: 1px solid var(--ux-tooltip-border, #334155);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        :host(:hover) .tooltip,
        :host(:focus-within) .tooltip { display: block; }
      </style>
      <span class="dot" aria-hidden="true"></span>
      <span part="label" class="label" aria-live="polite"></span>
      <slot name="tooltip"></slot>
      <span part="tooltip" class="tooltip"><slot name="tooltip-content">${this.getTooltipContent()}</slot></span>
    `;
    this.update();
  }

  private readonly onConnectivityChange = (): void => {
    this.update();
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { online: navigator.onLine },
    }));
  };

  private getLabel(): string {
    const onlineLabel = this.getAttribute('label-online') || 'Online';
    const offlineLabel = this.getAttribute('label-offline') || 'Offline';
    const app = (window as any).__ux3App;
    const i18n = app?.i18n;
    if (navigator.onLine) {
      return i18n ? i18n('network.online') || onlineLabel : onlineLabel;
    }
    return i18n ? i18n('network.offline') || offlineLabel : offlineLabel;
  }

  private getTooltipContent(): string {
    const app = (window as any).__ux3App;
    const i18n = app?.i18n;
    if (navigator.onLine) {
      return i18n ? (i18n('network.tooltip.online') || 'Connected to the internet') : 'Connected to the internet';
    }
    return i18n ? (i18n('network.tooltip.offline') || 'No internet connection') : 'No internet connection';
  }

  private update(): void {
    if (!this.shadowRoot) {
      return;
    }
    const isOnline = navigator.onLine;
    const label = this.getLabel();

    const labelEl = this.shadowRoot.querySelector('.label') as HTMLSpanElement;
    if (labelEl) {
      labelEl.textContent = label;
    }

    const tooltipSpan = this.shadowRoot.querySelector('.tooltip slot[name="tooltip-content"]') as HTMLSlotElement;
    if (tooltipSpan && !this.querySelector('[slot="tooltip-content"]')) {
      const parent = tooltipSpan.parentElement;
      if (parent && !parent.querySelector(':scope > [slot]')) {
        parent.textContent = this.getTooltipContent();
        const newSlot = document.createElement('slot');
        newSlot.name = 'tooltip-content';
        parent.appendChild(newSlot);
      }
    }

    this.toggleAttribute('online', isOnline);
    this.setAttribute('aria-label', label);
  }
}
