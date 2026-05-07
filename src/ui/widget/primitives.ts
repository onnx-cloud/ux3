/**
 * UX3 built-in primitive components.
 *
 * Components in this file are concrete, production-safe elements that provide
 * semantic roles, keyboard behavior, state events, and slot-based rendering.
 * Richer widgets like ux-button and ux-modal remain sourced from their
 * dedicated implementations and are not overridden.
 */
import { LifecycleComponent } from '../lifecycle-component.js';

type PrimitiveKind = 'region' | 'toggle' | 'value' | 'input' | 'textarea' | 'slider' | 'checkbox' | 'switch' | 'form' | 'image' | 'video' | 'audio' | 'wysiwyg' | 'tabs' | 'accordion' | 'popover' | 'tooltip' | 'drawer' | 'wizard' | 'capture' | 'progress';

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
  { tag: 'ux-drawer', role: 'dialog', kind: 'drawer', stateAttr: 'open' },
  { tag: 'ux-tabs', role: 'tablist', kind: 'tabs' },
  { tag: 'ux-tab-panel', role: 'tabpanel', kind: 'region' },
  { tag: 'ux-accordion', role: 'group', kind: 'accordion', stateAttr: 'open' },
  { tag: 'ux-wizard', role: 'group', kind: 'wizard' },
  { tag: 'ux-tooltip', role: 'tooltip', kind: 'tooltip', stateAttr: 'open' },
  { tag: 'ux-menu', role: 'menu', kind: 'value' },
  { tag: 'ux-menu-item', role: 'menuitem', kind: 'toggle', stateAttr: 'selected' },
  { tag: 'ux-select', role: 'listbox', kind: 'value' },
  { tag: 'ux-command-palette', role: 'dialog', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-search-input', role: 'searchbox', kind: 'input' },
  { tag: 'ux-search-tags', role: 'list', kind: 'value' },
  { tag: 'ux-search-results', role: 'list', kind: 'region' },
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
  { tag: 'ux-progress', role: 'progressbar', kind: 'progress' },
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
  { tag: 'ux-image', role: 'img', kind: 'image' },
  { tag: 'ux-image-panel', role: 'img', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-image-capture', role: 'button', kind: 'capture' },
  { tag: 'ux-video', role: 'group', kind: 'video' },
  { tag: 'ux-video-capture', role: 'button', kind: 'capture' },
  { tag: 'ux-audio', role: 'group', kind: 'audio' },
  { tag: 'ux-audio-capture', role: 'button', kind: 'capture' },
  { tag: 'ux-chart-line', role: 'img', kind: 'region' },
  { tag: 'ux-chart-bar', role: 'img', kind: 'region' },
  { tag: 'ux-chart-donut', role: 'img', kind: 'region' },
  { tag: 'ux-chat-messenger', role: 'log', kind: 'region' },
  { tag: 'ux-chat-thread-list', role: 'list', kind: 'region' },
  { tag: 'ux-chat-messages', role: 'log', kind: 'region' },
  { tag: 'ux-chat-bubble', role: 'article', kind: 'region' },
  { tag: 'ux-chat-composer', role: 'form', kind: 'form' },
  { tag: 'ux-chat-roster', role: 'list', kind: 'region' },
  { tag: 'ux-popover', role: 'dialog', kind: 'popover', stateAttr: 'open' },
  { tag: 'ux-hover-panel', role: 'dialog', kind: 'tooltip', stateAttr: 'open' },
  { tag: 'ux-splash', role: 'status', kind: 'region' },
  { tag: 'ux-splash-screen', role: 'status', kind: 'region' },
  { tag: 'ux-wysiwyg', role: 'textbox', kind: 'wysiwyg' },
  { tag: 'ux-content', role: 'region', kind: 'region' },
  { tag: 'ux-chart-line-legend', role: 'list', kind: 'region' },
  { tag: 'ux-network-status', role: 'status', kind: 'region' },
];

const DEF_BY_TAG = new Map(PRIMITIVES.map((def) => [def.tag, def]));

class UxPrimitiveBase extends LifecycleComponent {
  protected get definition(): PrimitiveDefinition | undefined {
    return DEF_BY_TAG.get(this.localName);
  }

  protected onConnected(): void {
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
  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    if (this.hasAttribute(stateAttr)) {
      this.applyAriaState(true);
    }
    this.addEventListener('click', this.onToggleActivate);
    this.addEventListener('keydown', this.onKeyDown);
  }

  protected onDisconnected(): void {
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

  protected onConnected(): void {
    super.onConnected();
    if (!this.hasAttribute('value')) {
      this.setAttribute('value', '');
    }
    this.addEventListener('keydown', this.onKeyDown);
    this.syncA11yValue(this.getAttribute('value') ?? '');
  }

  protected onDisconnected(): void {
    this.removeEventListener('keydown', this.onKeyDown);
  }

  protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
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

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    emitReadyOnce(this);
  }

  protected onAttributeChanged(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === 'value') {
      // Avoid full re-render on value changes — it destroys the focused input.
      // Only sync value to the input element if it is not currently active.
      if (this.inputEl && this.inputEl !== this.shadowRoot?.activeElement) {
        this.inputEl.value = this.getAttribute('value') ?? '';
      }
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

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.render();
    emitReadyOnce(this);
  }

  protected onAttributeChanged(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === 'value') {
      // Avoid full re-render on value changes — it destroys the focused textarea.
      if (this.textareaEl && this.textareaEl !== this.shadowRoot?.activeElement) {
        this.textareaEl.value = this.getAttribute('value') ?? '';
      }
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
  protected onConnected(): void {
    if (!this.hasAttribute('min')) {
      this.setAttribute('min', '0');
    }
    if (!this.hasAttribute('max')) {
      this.setAttribute('max', '100');
    }
    if (!this.hasAttribute('value')) {
      this.setAttribute('value', this.getAttribute('min') || '0');
    }
    super.onConnected();
  }

  protected syncA11yValue(value: string): void {
    super.syncA11yValue(value);
    this.setAttribute('aria-valuemin', this.getAttribute('min') || '0');
    this.setAttribute('aria-valuemax', this.getAttribute('max') || '100');
  }
}

class UxPrimitiveForm extends UxPrimitiveBase {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('submit', this.onSubmit);
  }

  protected onDisconnected(): void {
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
    // Toggle 'dark' class for Tailwind CSS dark: variant support
    document.documentElement.classList.toggle('dark', theme === 'dark');
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

class UxNetworkStatus extends UxPrimitiveBase {
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

/** Renders an <img> from src/alt attributes */
class UxPrimitiveImage extends UxPrimitiveBase {
  static get observedAttributes(): string[] {
    return ['src', 'alt', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const src = escapeAttr(this.getAttribute('src') ?? '');
    const alt = escapeAttr(this.getAttribute('alt') ?? this.textContent?.trim() ?? '');
    const width = this.getAttribute('width') ? `width="${escapeAttr(this.getAttribute('width')!)}"` : '';
    const height = this.getAttribute('height') ? `height="${escapeAttr(this.getAttribute('height')!)}"` : '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        img { max-width: 100%; height: auto; border-radius: 0.375rem; display: block; }
      </style>
      ${src ? `<img src="${src}" alt="${alt}" ${width} ${height} part="img" />` : `<slot></slot>`}
    `;
  }
}

/** Renders a <video> element from src/controls/muted/loop attributes */
class UxPrimitiveVideo extends UxPrimitiveBase {
  static get observedAttributes(): string[] {
    return ['src', 'controls', 'muted', 'loop', 'autoplay', 'width', 'height'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const src = escapeAttr(this.getAttribute('src') ?? '');
    const controls = this.hasAttribute('controls') ? 'controls' : '';
    const muted = this.hasAttribute('muted') ? 'muted' : '';
    const loop = this.hasAttribute('loop') ? 'loop' : '';
    const autoplay = this.hasAttribute('autoplay') ? 'autoplay' : '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        video { max-width: 100%; border-radius: 0.375rem; display: block; }
      </style>
      ${src
        ? `<video src="${src}" ${controls} ${muted} ${loop} ${autoplay} part="video"></video>`
        : `<slot></slot>`}
    `;
  }
}

/** Renders an <audio> element from src/controls attributes */
class UxPrimitiveAudio extends UxPrimitiveBase {
  static get observedAttributes(): string[] {
    return ['src', 'controls', 'loop', 'autoplay'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected onAttributeChanged(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const src = escapeAttr(this.getAttribute('src') ?? '');
    const controls = this.hasAttribute('controls') ? 'controls' : '';
    const loop = this.hasAttribute('loop') ? 'loop' : '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-width: 18rem; }
        audio { width: 100%; }
      </style>
      ${src
        ? `<audio src="${src}" ${controls} ${loop} part="audio"></audio>`
        : `<slot></slot>`}
    `;
  }
}

/** Basic WYSIWYG / rich-text editor using contenteditable */
class UxPrimitiveWysiwyg extends UxPrimitiveBase {
  protected onConnected(): void {
    super.onConnected();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const initialValue = this.getAttribute('value') || this.innerHTML || '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .toolbar {
          display: flex;
          gap: 0.25rem;
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
          background: var(--ux-color-surface-alt, #f8fafc);
          flex-wrap: wrap;
        }
        button {
          background: none;
          border: 1px solid transparent;
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          cursor: pointer;
          font: inherit;
          font-size: 0.875rem;
          color: var(--ux-color-text, #0f172a);
        }
        button:hover { background: var(--ux-color-surface, #fff); border-color: var(--ux-color-border, #cbd5e1); }
        .editor {
          min-height: 8rem;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--ux-color-border, #cbd5e1);
          border-radius: 0 0 0.375rem 0.375rem;
          background: var(--ux-color-surface, #fff);
          color: var(--ux-color-text, #0f172a);
          font: inherit;
          line-height: 1.6;
          outline: none;
        }
        .editor:focus { outline: 2px solid var(--ux-color-accent, #2563eb); outline-offset: -1px; }
      </style>
      <div class="toolbar" part="toolbar">
        <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><em>I</em></button>
        <button type="button" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <button type="button" data-cmd="insertOrderedList" title="Ordered list">OL</button>
        <button type="button" data-cmd="insertUnorderedList" title="Unordered list">UL</button>
      </div>
      <div class="editor" contenteditable="true" part="editor" role="textbox" aria-multiline="true"></div>
    `;

    const editor = this.shadowRoot.querySelector('.editor') as HTMLDivElement;
    if (!editor) return;

    // Set initial content
    if (initialValue) editor.innerHTML = initialValue;

    const emitChange = () => {
      const html = editor.innerHTML;
      this.setAttribute('value', html);
      this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { value: html } }));
    };

    editor.addEventListener('input', emitChange);

    // Toolbar buttons — focus editor first, then execute command
    const toolbar = this.shadowRoot.querySelector('.toolbar')!;
    toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        editor.focus();
        document.execCommand((btn as HTMLElement).dataset.cmd || '');
        emitChange();
      });
    });

    // Keyboard shortcuts
    editor.addEventListener('keydown', (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      let cmd = '';
      switch (e.key) {
        case 'b': cmd = 'bold'; break;
        case 'i': cmd = 'italic'; break;
        case 'u': cmd = 'underline'; break;
      }
      if (cmd) {
        e.preventDefault();
        document.execCommand(cmd);
        emitChange();
      }
    });
  }
}

/** Tablist — <ux-tabs> — Arrow-key navigation and tab selection */
class UxPrimitiveTabs extends UxPrimitiveBase {
  private tabs: HTMLElement[] = [];
  private panels: HTMLElement[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'tablist');
    this.collectChildren();
    this.addEventListener('click', this.onTabClick);
    this.addEventListener('keydown', this.onTabKeyDown);
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onTabClick);
    this.removeEventListener('keydown', this.onTabKeyDown);
    super.onDisconnected();
  }

  private collectChildren() {
    this.tabs = Array.from(this.querySelectorAll('[role="tab"], ux-tab, [ux-role="tab"]'));
    this.panels = Array.from(this.querySelectorAll('[role="tabpanel"], ux-tab-panel'));
    if (this.tabs.length > 0 && !this.tabs.find((t) => t.getAttribute('aria-selected') === 'true')) {
      this.selectTab(0);
    }
  }

  private readonly onTabClick = (e: Event) => {
    const tab = (e.target as HTMLElement).closest('[role="tab"], ux-tab') as HTMLElement;
    if (!tab) return;
    const idx = this.tabs.indexOf(tab);
    if (idx >= 0) this.selectTab(idx);
    this.dispatchEvent(new CustomEvent('ux:change', { bubbles: true, detail: { selectedIndex: idx } }));
  };

  private readonly onTabKeyDown = (e: KeyboardEvent) => {
    const current = this.tabs.findIndex((t) => t.matches(':focus, :focus-within'));
    let next = current;
    if (e.key === 'ArrowRight') next = (current + 1) % this.tabs.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + this.tabs.length) % this.tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = this.tabs.length - 1;
    else return;
    e.preventDefault();
    this.selectTab(next);
    this.tabs[next]?.focus();
  };

  private selectTab(index: number) {
    this.tabs.forEach((t, i) => {
      t.setAttribute('aria-selected', String(i === index));
      t.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    this.panels.forEach((p, i) => {
      p.style.display = i === index ? '' : 'none';
    });
  }
}

/** Accordion — <ux-accordion> — Single-open behavior */
class UxPrimitiveAccordion extends UxPrimitiveToggle {
  protected onConnected(): void {
    super.onConnected();
    this.querySelectorAll('[ux-accordion-item], details').forEach((item) => {
      item.addEventListener('toggle', this.onItemToggle as EventListener);
    });
  }

  private readonly onItemToggle = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.hasAttribute('open')) return;
    // Close all other items
    this.querySelectorAll('[ux-accordion-item][open], details[open]').forEach((item) => {
      if (item !== target) item.removeAttribute('open');
    });
  };
}

/** Popover — <ux-popover> — Click outside to dismiss */
class UxPrimitivePopover extends UxPrimitiveToggle {
  private boundClickOutside: ((e: Event) => void) | null = null;

  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    this.boundClickOutside = (e: Event) => {
      if (!this.hasAttribute(stateAttr)) return;
      const target = e.target as HTMLElement;
      if (!this.contains(target)) {
        this.removeAttribute(stateAttr);
        this.applyAriaState(false);
        this.dispatchEvent(new CustomEvent('ux:close', { bubbles: true }));
      }
    };
    document.addEventListener('click', this.boundClickOutside);
  }

  protected onDisconnected(): void {
    if (this.boundClickOutside) {
      document.removeEventListener('click', this.boundClickOutside);
    }
    super.onDisconnected();
  }
}

/** Tooltip / Hover panel — <ux-tooltip>, <ux-hover-panel> — Hover to show */
class UxPrimitiveTooltip extends UxPrimitiveToggle {
  private trigger: HTMLElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    const stateAttr = this.getStateAttr();
    this.trigger = this.querySelector('[ux-tooltip-trigger]') || this.previousElementSibling as HTMLElement;
    if (this.trigger) {
      this.trigger.addEventListener('mouseenter', () => this.setAttribute(stateAttr, ''));
      this.trigger.addEventListener('mouseleave', () => this.removeAttribute(stateAttr));
      this.trigger.addEventListener('focus', () => this.setAttribute(stateAttr, ''));
      this.trigger.addEventListener('blur', () => this.removeAttribute(stateAttr));
    }
  }
}

/** Drawer — <ux-drawer> — Escape to close */
class UxPrimitiveDrawer extends UxPrimitiveToggle {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this.removeAttribute('open');
        this.applyAriaState(false);
        this.dispatchEvent(new CustomEvent('ux:close', { bubbles: true }));
      }
    });
  }
}

/** Wizard — <ux-wizard> — Step navigation */
class UxPrimitiveWizard extends UxPrimitiveValue {
  private steps: HTMLElement[] = [];
  private currentStep = 0;

  protected onConnected(): void {
    super.onConnected();
    this.steps = Array.from(this.querySelectorAll('[ux-wizard-step]'));
    this.goToStep(Number(this.getAttribute('value')) || 0);

    this.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.matches('[ux-wizard-next]')) { this.next(); }
      else if (target.matches('[ux-wizard-prev]')) { this.prev(); }
    });
  }

  private goToStep(index: number) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.steps.forEach((s, i) => {
      s.style.display = i === index ? '' : 'none';
    });
    this.setAttribute('value', String(index));
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { step: index, total: this.steps.length },
    }));
  }

  next() { this.goToStep(this.currentStep + 1); }
  prev() { this.goToStep(this.currentStep - 1); }
}

/** Media capture — <ux-image-capture>, <ux-video-capture>, <ux-audio-capture> */
class UxPrimitiveCapture extends UxPrimitiveBase {
  private mediaStream: MediaStream | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('tabindex', '0');
    this.addEventListener('click', this.startCapture);
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.startCapture(); }
    });
  }

  private async startCapture() {
    const tag = this.localName;
    try {
      let constraints: MediaStreamConstraints = {};
      if (tag === 'ux-image-capture') {
        constraints = { video: { facingMode: 'user' } };
      } else if (tag === 'ux-video-capture') {
        constraints = { video: true, audio: true };
      } else if (tag === 'ux-audio-capture') {
        constraints = { audio: true };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      this.dispatchEvent(new CustomEvent('ux:capture', {
        bubbles: true,
        detail: { stream, kind: tag.replace('ux-', '').replace('-capture', '') },
      }));
    } catch (e) {
      this.dispatchEvent(new CustomEvent('ux:capture-error', {
        bubbles: true,
        detail: { error: e instanceof Error ? e.message : String(e) },
      }));
    }
  }

  protected onDisconnected(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    super.onDisconnected();
  }
}

/** Progress bar — <ux-progress> — visual progress rendering */
class UxPrimitiveProgress extends UxPrimitiveValue {
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
    track.style.cssText = 'width:100%;height:0.5rem;background:var(--ux-color-border,#e2e8f0);border-radius:999px;overflow:hidden;';

    const fill = document.createElement('div');
    fill.style.cssText = `width:${val}%;height:100%;background:var(--ux-color-accent,#2563eb);border-radius:999px;transition:width 0.3s ease;`;

    track.appendChild(fill);
    this.appendChild(track);
  }
}

function resolveClass(kind: PrimitiveKind): typeof HTMLElement {
  switch (kind) {
    case 'toggle':
      return UxPrimitiveToggle;
    case 'checkbox':
    case 'switch':
      return UxPrimitiveToggle;
    case 'tabs':
      return UxPrimitiveTabs;
    case 'accordion':
      return UxPrimitiveAccordion;
    case 'popover':
      return UxPrimitivePopover;
    case 'tooltip':
      return UxPrimitiveTooltip;
    case 'drawer':
      return UxPrimitiveDrawer;
    case 'wizard':
      return UxPrimitiveWizard;
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
    case 'image':
      return UxPrimitiveImage;
    case 'video':
      return UxPrimitiveVideo;
    case 'audio':
      return UxPrimitiveAudio;
    case 'wysiwyg':
      return UxPrimitiveWysiwyg;
    case 'capture':
      return UxPrimitiveCapture;
    case 'progress':
      return UxPrimitiveProgress;
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
