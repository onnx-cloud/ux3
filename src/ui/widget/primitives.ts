/**
 * UX3 built-in primitive components.
 *
 * Components in this file are concrete, production-safe elements that provide
 * semantic roles, keyboard behavior, state events, and slot-based rendering.
 * Richer widgets like ux-button and ux-modal remain sourced from their
 * dedicated implementations and are not overridden.
 */

type PrimitiveKind = 'region' | 'toggle' | 'value' | 'input' | 'textarea' | 'slider' | 'checkbox' | 'switch' | 'form' | 'lang-switcher' | 'theme-toggle' | 'network-status';

interface PrimitiveDefinition {
  tag: string;
  role?: string;
  kind: PrimitiveKind;
  stateAttr?: string;
}

const TOGGLE_KIND = new Set<PrimitiveKind>(['toggle', 'checkbox', 'switch']);

const PRIMITIVES: PrimitiveDefinition[] = [
  { tag: 'ux-app-shell', role: 'application', kind: 'region' },
  { tag: 'ux-topbar', role: 'banner', kind: 'region' },
  { tag: 'ux-sidebar', role: 'navigation', kind: 'region' },
  { tag: 'ux-breadcrumb', role: 'navigation', kind: 'region' },
  { tag: 'ux-pagination', role: 'navigation', kind: 'value' },
  { tag: 'ux-icon-button', role: 'button', kind: 'toggle', stateAttr: 'pressed' },
  { tag: 'ux-link', role: 'link', kind: 'region' },
  { tag: 'ux-drawer', role: 'dialog', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-tabs', role: 'tablist', kind: 'value' },
  { tag: 'ux-tab-panel', role: 'tabpanel', kind: 'region' },
  { tag: 'ux-accordion', role: 'group', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-menu', role: 'menu', kind: 'value' },
  { tag: 'ux-menu-item', role: 'menuitem', kind: 'toggle', stateAttr: 'selected' },
  { tag: 'ux-select', role: 'listbox', kind: 'value' },
  { tag: 'ux-command-palette', role: 'dialog', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-tooltip', role: 'tooltip', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-table', role: 'table', kind: 'region' },
  { tag: 'ux-table-virtual', role: 'table', kind: 'region' },
  { tag: 'ux-list', role: 'list', kind: 'region' },
  { tag: 'ux-description-list', role: 'list', kind: 'region' },
  { tag: 'ux-icon', role: 'img', kind: 'region' },
  { tag: 'ux-card', role: 'article', kind: 'region' },
  { tag: 'ux-card-icon', role: 'img', kind: 'region' },
  { tag: 'ux-surface', role: 'region', kind: 'region' },
  { tag: 'ux-divider', role: 'separator', kind: 'region' },
  { tag: 'ux-badge', role: 'status', kind: 'region' },
  { tag: 'ux-avatar', role: 'img', kind: 'region' },
  { tag: 'ux-stack', kind: 'region' },
  { tag: 'ux-inline', kind: 'region' },
  { tag: 'ux-grid', kind: 'region' },
  { tag: 'ux-hero', role: 'region', kind: 'region' },
  { tag: 'ux-article', role: 'article', kind: 'region' },
  { tag: 'ux-alert', role: 'alert', kind: 'region' },
  { tag: 'ux-progress', role: 'progressbar', kind: 'value' },
  { tag: 'ux-spinner', role: 'status', kind: 'region' },
  { tag: 'ux-skeleton', role: 'status', kind: 'region' },
  { tag: 'ux-empty-state', role: 'status', kind: 'region' },
  { tag: 'ux-error-panel', role: 'alert', kind: 'region' },
  { tag: 'ux-form', role: 'form', kind: 'form' },
  { tag: 'ux-input', role: 'textbox', kind: 'input' },
  { tag: 'ux-textarea', role: 'textbox', kind: 'textarea' },
  { tag: 'ux-checkbox', role: 'checkbox', kind: 'checkbox', stateAttr: 'checked' },
  { tag: 'ux-radio-group', role: 'radiogroup', kind: 'value' },
  { tag: 'ux-switch', role: 'switch', kind: 'switch', stateAttr: 'checked' },
  { tag: 'ux-slider', role: 'slider', kind: 'slider' },
  { tag: 'ux-form-errors', role: 'alert', kind: 'region' },
  { tag: 'ux-image', role: 'img', kind: 'region' },
  { tag: 'ux-image-panel', role: 'img', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-image-capture', role: 'group', kind: 'region' },
  { tag: 'ux-video', role: 'group', kind: 'region' },
  { tag: 'ux-video-capture', role: 'group', kind: 'region' },
  { tag: 'ux-audio', role: 'group', kind: 'region' },
  { tag: 'ux-audio-capture', role: 'group', kind: 'region' },
  { tag: 'ux-chart-line', role: 'img', kind: 'region' },
  { tag: 'ux-chart-bar', role: 'img', kind: 'region' },
  { tag: 'ux-chart-donut', role: 'img', kind: 'region' },
  { tag: 'ux-chat-messenger', role: 'log', kind: 'region' },
  { tag: 'ux-chat-thread-list', role: 'list', kind: 'region' },
  { tag: 'ux-chat-bubble', role: 'article', kind: 'region' },
  { tag: 'ux-chat-composer', role: 'form', kind: 'form' },
  { tag: 'ux-popover', role: 'dialog', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-hover-panel', role: 'dialog', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-splash-screen', role: 'status', kind: 'region' },
  { tag: 'ux-wizard', role: 'group', kind: 'value' },
  { tag: 'ux-content', role: 'region', kind: 'region' },
  { tag: 'ux-chart-line-legend', role: 'list', kind: 'region' },
  { tag: 'ux-lang-switcher', role: 'group', kind: 'lang-switcher' },
  { tag: 'ux-theme-toggle', role: 'switch', kind: 'theme-toggle', stateAttr: 'checked' },
  { tag: 'ux-network-status', role: 'status', kind: 'network-status' },
];

const DEF_BY_TAG = new Map(PRIMITIVES.map((def) => [def.tag, def]));

class UxPrimitiveBase extends HTMLElement {
  protected get definition(): PrimitiveDefinition | undefined {
    return DEF_BY_TAG.get(this.localName);
  }

  connectedCallback(): void {
    this.ensureRole();
    this.ensureTabIndex();
    emitReadyOnce(this);
  }

  protected ensureRole(): void {
    const role = this.definition?.role;
    if (role && !this.hasAttribute('role')) {
      this.setAttribute('role', role);
    }
  }

  protected ensureTabIndex(): void {
    const def = this.definition;
    if (!def) {
      return;
    }
    if (TOGGLE_KIND.has(def.kind) || def.kind === 'value' || def.kind === 'slider') {
      if (!this.hasAttribute('tabindex')) {
        this.tabIndex = 0;
      }
    }
  }
}

class UxPrimitiveRegion extends UxPrimitiveBase {}

class UxPrimitiveToggle extends UxPrimitiveBase {
  connectedCallback(): void {
    super.connectedCallback();
    const stateAttr = this.getStateAttr();
    if (this.hasAttribute(stateAttr)) {
      this.applyAriaState(true);
    }
    this.addEventListener('click', this.onToggleActivate);
    this.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onToggleActivate);
    this.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly onToggleActivate = (): void => {
    const stateAttr = this.getStateAttr();
    const next = !this.hasAttribute(stateAttr);
    this.toggleAttribute(stateAttr, next);
    this.applyAriaState(next);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { [stateAttr]: next },
    }));
    this.dispatchEvent(new CustomEvent(next ? 'ux:open' : 'ux:close', { bubbles: true }));
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggleActivate();
    }
  };

  protected getStateAttr(): string {
    return this.definition?.stateAttr ?? 'open';
  }

  protected applyAriaState(next: boolean): void {
    const role = this.getAttribute('role');
    if (role === 'switch' || role === 'checkbox') {
      this.setAttribute('aria-checked', String(next));
    } else {
      this.setAttribute('aria-expanded', String(next));
    }
  }
}

class UxPrimitiveValue extends UxPrimitiveBase {
  static get observedAttributes(): string[] {
    return ['value'];
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('value')) {
      this.setAttribute('value', '');
    }
    this.addEventListener('keydown', this.onKeyDown);
    this.syncA11yValue(this.getAttribute('value') ?? '');
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.onKeyDown);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name !== 'value' || oldValue === newValue) {
      return;
    }
    const next = newValue ?? '';
    this.syncA11yValue(next);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { value: next },
    }));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    const current = Number(this.getAttribute('value') || 0);
    if (!Number.isFinite(current)) {
      return;
    }
    const next = event.key === 'ArrowRight' ? current + 1 : current - 1;
    this.setAttribute('value', String(next));
    event.preventDefault();
  };

  protected syncA11yValue(value: string): void {
    const role = this.getAttribute('role');
    if (role === 'slider' || role === 'progressbar') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        this.setAttribute('aria-valuenow', String(numeric));
      }
    }
  }
}

class UxPrimitiveInput extends UxPrimitiveBase {
  private inputEl: HTMLInputElement | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'type', 'disabled'];
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    emitReadyOnce(this);
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) {
      return;
    }
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const value = this.getAttribute('value') ?? '';
    const type = this.getAttribute('type') ?? 'text';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.5rem 0.625rem;
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-radius: 0.375rem;
          background: var(--ux-color-surface, #ffffff);
          color: var(--ux-color-text, #0f172a);
          font: inherit;
        }
        input:focus-visible {
          outline: 2px solid var(--ux-color-accent, #2563eb);
          outline-offset: 1px;
        }
      </style>
      <input part="input" type="${type}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" name="${escapeAttr(name)}" ${disabled} />
    `;

    this.inputEl = this.shadowRoot.querySelector('input');
    this.inputEl?.addEventListener('input', this.onInput);
  }

  private readonly onInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { value },
    }));
  };
}

class UxPrimitiveTextarea extends UxPrimitiveBase {
  private textareaEl: HTMLTextAreaElement | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'placeholder', 'name', 'rows', 'disabled'];
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    emitReadyOnce(this);
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) {
      return;
    }
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const value = this.getAttribute('value') ?? '';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const name = this.getAttribute('name') ?? '';
    const rows = this.getAttribute('rows') ?? '4';
    const disabled = this.hasAttribute('disabled') ? 'disabled' : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: 100%; }
        textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.5rem 0.625rem;
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-radius: 0.375rem;
          background: var(--ux-color-surface, #ffffff);
          color: var(--ux-color-text, #0f172a);
          font: inherit;
          resize: vertical;
        }
        textarea:focus-visible {
          outline: 2px solid var(--ux-color-accent, #2563eb);
          outline-offset: 1px;
        }
      </style>
      <textarea part="textarea" rows="${escapeAttr(rows)}" placeholder="${escapeAttr(placeholder)}" name="${escapeAttr(name)}" ${disabled}>${escapeText(value)}</textarea>
    `;

    this.textareaEl = this.shadowRoot.querySelector('textarea');
    this.textareaEl?.addEventListener('input', this.onInput);
  }

  private readonly onInput = (event: Event): void => {
    const value = (event.target as HTMLTextAreaElement).value;
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { value },
    }));
  };
}

class UxPrimitiveSlider extends UxPrimitiveValue {
  connectedCallback(): void {
    if (!this.hasAttribute('min')) {
      this.setAttribute('min', '0');
    }
    if (!this.hasAttribute('max')) {
      this.setAttribute('max', '100');
    }
    if (!this.hasAttribute('value')) {
      this.setAttribute('value', this.getAttribute('min') || '0');
    }
    super.connectedCallback();
  }

  protected syncA11yValue(value: string): void {
    super.syncA11yValue(value);
    this.setAttribute('aria-valuemin', this.getAttribute('min') || '0');
    this.setAttribute('aria-valuemax', this.getAttribute('max') || '100');
  }
}

class UxPrimitiveForm extends UxPrimitiveBase {
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('submit', this.onSubmit);
  }

  disconnectedCallback(): void {
    this.removeEventListener('submit', this.onSubmit);
  }

  private readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('ux:submit', {
      bubbles: true,
      detail: collectFieldValues(this),
    }));
  };
}

class UxLangSwitcher extends UxPrimitiveBase {
  private selectEl: HTMLSelectElement | null = null;
  private readonly rtlLanguages = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi']);

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  disconnectedCallback(): void {
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

    const appLocales = Object.keys(((window as any).__ux3App?.config?.i18n || {}) as Record<string, unknown>);
    if (appLocales.length > 0) {
      return appLocales;
    }

    const browserPreferred = ((window as any).__ux3App?.browser?.locale?.preferred || navigator.languages || [navigator.language || 'en']) as string[];
    return Array.from(new Set(browserPreferred));
  }

  private getCurrentLocale(locales: string[]): string {
    const persisted = this.hasAttribute('persist') && this.getAttribute('persist') !== 'false'
      ? window.localStorage.getItem('ux3.locale')
      : null;
    const explicit = this.getAttribute('value');
    const docLang = document.documentElement.lang;
    const browserPrimary = (window as any).__ux3App?.browser?.locale?.primary;
    const fallback = locales[0] || 'en';

    const candidate = persisted || explicit || docLang || browserPrimary || fallback;
    return locales.includes(candidate) ? candidate : fallback;
  }

  private render(): void {
    const locales = this.getLocales();
    const current = this.getCurrentLocale(locales);

    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: 0.375rem; }
        label { font: inherit; color: inherit; }
        select {
          font: inherit;
          color: inherit;
          background: var(--ux-color-surface, #ffffff);
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
          min-width: 5.5rem;
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
    const lang = locale.split('-')[0]?.toLowerCase() || 'en';

    this.setAttribute('value', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = this.rtlLanguages.has(lang) ? 'rtl' : 'ltr';

    const shouldPersist = this.hasAttribute('persist') && this.getAttribute('persist') !== 'false';
    if (shouldPersist) {
      try {
        window.localStorage.setItem('ux3.locale', locale);
      } catch {
        // ignore storage failures
      }
    }

    const app = (window as any).__ux3App;
    if (app?.browser?.locale) {
      app.browser.locale.primary = locale;
      app.browser.locale.language = lang;
      app.browser.locale.region = locale.split('-')[1]?.toUpperCase();
      app.browser.locale.direction = this.rtlLanguages.has(lang) ? 'rtl' : 'ltr';
      if (app.ui?.browser?.locale) {
        app.ui.browser.locale = app.browser.locale;
      }
    }

    window.dispatchEvent(new Event('languagechange'));
    this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { locale } }));
    this.dispatchEvent(new CustomEvent('ux:locale-change', { bubbles: true, detail: { locale } }));
  };
}

class UxThemeToggle extends UxPrimitiveBase {
  private buttonEl: HTMLButtonElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  disconnectedCallback(): void {
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
          background: var(--ux-color-surface, #ffffff);
          border: 1px solid var(--ux-color-border, #cbd5e1);
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
    document.documentElement.dataset.theme = theme;
    this.setAttribute('theme', theme);
    this.toggleAttribute('checked', theme === 'dark');
    if (this.buttonEl) {
      this.buttonEl.textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
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

class UxNetworkStatus extends UxPrimitiveBase {
  connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    window.addEventListener('online', this.onConnectivityChange);
    window.addEventListener('offline', this.onConnectivityChange);
  }

  disconnectedCallback(): void {
    window.removeEventListener('online', this.onConnectivityChange);
    window.removeEventListener('offline', this.onConnectivityChange);
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: 0.375rem; }
        .dot {
          width: 0.625rem;
          height: 0.625rem;
          border-radius: 50%;
          background: var(--status-color, #16a34a);
        }
      </style>
      <span class="dot" aria-hidden="true"></span>
      <span part="label" aria-live="polite"></span>
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

  private update(): void {
    if (!this.shadowRoot) {
      return;
    }
    const label = this.shadowRoot.querySelector('span[part="label"]') as HTMLSpanElement;
    const dot = this.shadowRoot.querySelector('.dot') as HTMLSpanElement;
    const isOnline = navigator.onLine;

    label.textContent = isOnline ? 'Online' : 'Offline';
    dot.style.background = isOnline ? '#16a34a' : '#dc2626';
    this.toggleAttribute('online', isOnline);
    this.setAttribute('aria-label', isOnline ? 'Online' : 'Offline');
  }
}

function collectFieldValues(host: HTMLElement): Record<string, string> {
  const values: Record<string, string> = {};
  const elements = host.querySelectorAll('ux-input, ux-textarea, ux-select, ux-slider');
  elements.forEach((element) => {
    const name = element.getAttribute('name');
    if (!name) {
      return;
    }
    values[name] = element.getAttribute('value') ?? '';
  });
  return values;
}

function emitReadyOnce(el: HTMLElement): void {
  if (el.dataset.uxReady === '1') {
    return;
  }
  el.dataset.uxReady = '1';
  queueMicrotask(() => {
    el.dispatchEvent(new CustomEvent('ux:ready', { bubbles: true }));
  });
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function resolveClass(kind: PrimitiveKind): typeof HTMLElement {
  switch (kind) {
    case 'toggle':
    case 'checkbox':
    case 'switch':
      return UxPrimitiveToggle;
    case 'value':
      return UxPrimitiveValue;
    case 'input':
      return UxPrimitiveInput;
    case 'textarea':
      return UxPrimitiveTextarea;
    case 'slider':
      return UxPrimitiveSlider;
    case 'form':
      return UxPrimitiveForm;
    case 'lang-switcher':
      return UxLangSwitcher;
    case 'theme-toggle':
      return UxThemeToggle;
    case 'network-status':
      return UxNetworkStatus;
    default:
      return UxPrimitiveRegion;
  }
}

export function registerBuiltInPrimitives(): void {
  for (const definition of PRIMITIVES) {
    if (!customElements.get(definition.tag)) {
      const BaseClass = resolveClass(definition.kind);
      const ElementClass = class extends BaseClass {};
      customElements.define(definition.tag, ElementClass);
    }
  }
}

registerBuiltInPrimitives();
