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
export declare class UxConsentBanner extends HTMLElement {
    private consentState;
    private persistentKey;
    connectedCallback(): void;
    private isConsentGiven;
    private getStoredConsent;
    private loadConsentState;
    private saveConsentState;
    private render;
    private setupEventListeners;
    private getAllPreferences;
    private updatePreferences;
    private handleAccept;
    private handleReject;
    private handleDismiss;
    private dismiss;
    /**
     * Get current consent state
     */
    getConsentState(): ConsentState | null;
    /**
     * Clear stored consent
     */
    clearConsent(): void;
    private getStyles;
}
