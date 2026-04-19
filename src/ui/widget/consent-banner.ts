/**
 * UX3 Consent Banner Component
 *
 * GDPR/CCPA-compliant consent banner with persistent storage and i18n
 *
 * Usage:
 * Floating variant:
 * <ux-consent-banner variant="floating" position="bottom-right" persistent-key="consent">
 *   <div slot="title">We use cookies</div>
 *   <div slot="message">We use cookies to improve your experience.</div>
 *   <template slot="categories">
 *     <div class="category">
 *       <label><input type="checkbox" name="analytics" /> Analytics</label>
 *     </div>
 *     <div class="category">
 *       <label><input type="checkbox" name="marketing" /> Marketing</label>
 *     </div>
 *   </template>
 * </ux-consent-banner>
 *
 * Banner variant (full-width at top):
 * <ux-consent-banner variant="banner">
 *   <div slot="title">Cookie Consent</div>
 *   <div slot="message">We respect your privacy...</div>
 * </ux-consent-banner>
 */

export interface ConsentState {
  timestamp: number;
  preferences: Record<string, boolean>;
  accepted: boolean;
}

export class UxConsentBanner extends HTMLElement {
  private consentState: ConsentState | null = null;
  private persistentKey: string = 'consent';

  connectedCallback() {
    this.persistentKey = this.getAttribute('persistent-key') || 'consent';
    this.loadConsentState();
    
    if (!this.isConsentGiven()) {
      this.render();
      this.setupEventListeners();
    } else {
      this.remove();
    }
  }

  private isConsentGiven(): boolean {
    const stored = this.getStoredConsent();
    return stored?.accepted ?? false;
  }

  private getStoredConsent(): ConsentState | null {
    try {
      const storage = this.getAttribute('storage') === 'session' ? sessionStorage : localStorage;
      const data = storage.getItem(this.persistentKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private loadConsentState() {
    this.consentState = this.getStoredConsent();
  }

  private saveConsentState(preferences: Record<string, boolean>, accepted = true) {
    this.consentState = {
      timestamp: Date.now(),
      preferences,
      accepted
    };

    try {
      const storage = this.getAttribute('storage') === 'session' ? sessionStorage : localStorage;
      storage.setItem(this.persistentKey, JSON.stringify(this.consentState));
    } catch (err) {
      console.warn('Failed to save consent state:', err);
    }
  }

  private render() {
    const variant = this.getAttribute('variant') || 'banner';
    
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = this.getStyles(variant);
    this.shadowRoot.appendChild(style);

    const container = document.createElement('div');
    container.className = `consent-banner consent-${variant}`;
    container.innerHTML = `
      <div class="consent-content">
        <div class="consent-header">
          <h3 class="consent-title">
            <slot name="title">We value your privacy</slot>
          </h3>
          <button class="consent-close" aria-label="Dismiss" title="Dismiss">✕</button>
        </div>
        
        <div class="consent-message">
          <slot name="message">
            We use cookies and similar technologies to provide essential functionality and analyze site usage.
          </slot>
        </div>

        <div class="consent-categories">
          <slot name="categories"></slot>
        </div>

        <div class="consent-actions">
          <button class="consent-btn consent-reject" type="button">
            <span class="btn-label">
              <slot name="reject-label">Reject All</slot>
            </span>
          </button>
          <button class="consent-btn consent-accept" type="button">
            <span class="btn-label">
              <slot name="accept-label">Accept All</slot>
            </span>
          </button>
        </div>

        <div class="consent-footer">
          <a href="#" class="consent-learn-more" target="_blank" rel="noopener">
            <slot name="learn-more-label">Learn more about our privacy policy</slot>
          </a>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(container);
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return;

    const acceptBtn = this.shadowRoot.querySelector('.consent-accept') as HTMLButtonElement;
    const rejectBtn = this.shadowRoot.querySelector('.consent-reject') as HTMLButtonElement;
    const closeBtn = this.shadowRoot.querySelector('.consent-close') as HTMLButtonElement;

    acceptBtn?.addEventListener('click', () => this.handleAccept());
    rejectBtn?.addEventListener('click', () => this.handleReject());
    closeBtn?.addEventListener('click', () => this.handleDismiss());

    // Handle category checkboxes
    const checkboxes = this.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkboxes) {
      checkboxes.addEventListener('change', () => {
        this.updatePreferences();
      });
    }
  }

  private getAllPreferences(): Record<string, boolean> {
    const preferences: Record<string, boolean> = {};
    const checkboxes = this.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(cb => {
      preferences[cb.name] = cb.checked;
    });
    return preferences;
  }

  private updatePreferences() {
    const prefs = this.getAllPreferences();
    // Update displayed checkboxes
    const checkboxes = this.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(cb => {
      cb.checked = prefs[cb.name] ?? false;
    });
  }

  private handleAccept() {
    const preferences = this.getAllPreferences();
    // Set all categories to true
    Object.keys(preferences).forEach(key => {
      preferences[key] = true;
    });

    this.saveConsentState(preferences);

    this.dispatchEvent(new CustomEvent('consent-accept', {
      detail: { preferences },
      bubbles: true,
      composed: true
    }));

    this.dismiss();
  }

  private handleReject() {
    const preferences = this.getAllPreferences();
    // Set all categories to false
    Object.keys(preferences).forEach(key => {
      preferences[key] = false;
    });

    this.saveConsentState(preferences, false);

    this.dispatchEvent(new CustomEvent('consent-reject', {
      detail: { preferences },
      bubbles: true,
      composed: true
    }));

    this.dismiss();
  }

  private handleDismiss() {
    this.dispatchEvent(new CustomEvent('consent-dismiss', {
      bubbles: true,
      composed: true
    }));

    this.dismiss();
  }

  private dismiss() {
    this.classList.add('dismissing');
    setTimeout(() => {
      this.remove();
    }, 300);
  }

  /**
   * Get current consent state
   */
  getConsentState(): ConsentState | null {
    return this.consentState;
  }

  /**
   * Clear stored consent
   */
  clearConsent() {
    try {
      const storage = this.getAttribute('storage') === 'session' ? sessionStorage : localStorage;
      storage.removeItem(this.persistentKey);
    } catch (err) {
      console.warn('Failed to clear consent:', err);
    }
  }

  private getStyles(variant: string): string {
    const isFloating = variant === 'floating';
    const position = this.getAttribute('position') || 'bottom-right';
    
    return `
      :host {
        --consent-z-index: 9998;
        --consent-bg: white;
        --consent-text: #374151;
        --consent-border: #e5e7eb;
        --consent-primary: #3b82f6;
        --consent-danger: #ef4444;
      }

      .consent-banner {
        ${isFloating ? `
          position: fixed;
          ${position.includes('top') ? 'top' : 'bottom'}: 1.5rem;
          ${position.includes('right') ? 'right' : 'left'}: 1.5rem;
          max-width: 420px;
          border-radius: 0.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideIn 300ms ease-out;
        ` : `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: var(--consent-z-index);
          animation: slideDown 300ms ease-out;
        `}
        
        background-color: var(--consent-bg);
        color: var(--consent-text);
        z-index: var(--consent-z-index);
        font-family: inherit;
      }

      .consent-banner.dismissing {
        animation: slideOut 300ms ease-out forwards;
      }

      .consent-content {
        padding: ${isFloating ? '1.5rem' : '1rem 1.5rem'};
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .consent-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .consent-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
      }

      .consent-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 200ms;
      }

      .consent-close:hover {
        color: #1f2937;
      }

      .consent-message {
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--consent-text);
      }

      .consent-categories {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .consent-categories label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.95rem;
      }

      .consent-categories input[type="checkbox"] {
        cursor: pointer;
      }

      .consent-actions {
        display: flex;
        gap: 0.75rem;
        ${isFloating ? 'flex-direction: row;' : 'flex-direction: row;'}
      }

      .consent-btn {
        padding: 0.625rem 1rem;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 200ms;
        font-family: inherit;
      }

      .consent-reject {
        background-color: transparent;
        color: var(--consent-primary);
        border: 1px solid var(--consent-border);
      }

      .consent-reject:hover {
        background-color: #f9fafb;
        border-color: var(--consent-primary);
      }

      .consent-accept {
        background-color: var(--consent-primary);
        color: white;
        flex: 1;
      }

      .consent-accept:hover {
        background-color: #2563eb;
      }

      .consent-footer {
        text-align: center;
        font-size: 0.85rem;
      }

      .consent-learn-more {
        color: var(--consent-primary);
        text-decoration: none;
      }

      .consent-learn-more:hover {
        text-decoration: underline;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideOut {
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      @media (max-width: 640px) {
        .consent-banner {
          ${isFloating ? `
            left: 0.75rem !important;
            right: 0.75rem !important;
            max-width: none;
          ` : ''}
        }

        .consent-actions {
          flex-direction: column;
        }

        .consent-btn {
          width: 100%;
        }
      }
    `;
  }
}

if (!customElements.get('ux-consent-banner')) {
  customElements.define('ux-consent-banner', UxConsentBanner);
}
