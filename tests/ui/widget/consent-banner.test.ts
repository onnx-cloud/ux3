/**
 * UxConsentBanner Component Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UxConsentBanner } from '../../../src/ui/widget/consent-banner';

describe('UxConsentBanner - Consent Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    if (!customElements.get('ux-consent-banner')) {
      customElements.define('ux-consent-banner', UxConsentBanner);
    }
    localStorage.clear();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null as unknown as HTMLDivElement;
  });

  it('registers the consent banner element', () => {
    expect(customElements.get('ux-consent-banner')).toBe(UxConsentBanner);
  });

  it('accepts consent and persists state to localStorage', async () => {
    const banner = document.createElement('ux-consent-banner') as UxConsentBanner;
    banner.setAttribute('persistent-key', 'test-consent');
    container.appendChild(banner);
    await Promise.resolve();

    const acceptButton = banner.shadowRoot?.querySelector('.consent-accept') as HTMLButtonElement;
    expect(acceptButton).toBeTruthy();

    const acceptSpy = vi.fn();
    banner.addEventListener('consent-accept', acceptSpy);

    acceptButton.click();

    expect(acceptSpy).toHaveBeenCalledTimes(1);
    const stored = localStorage.getItem('test-consent');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).accepted).toBe(true);
  });

  it('rejects consent and persists state to localStorage', async () => {
    const banner = document.createElement('ux-consent-banner') as UxConsentBanner;
    banner.setAttribute('persistent-key', 'test-consent');
    container.appendChild(banner);
    await Promise.resolve();

    const rejectButton = banner.shadowRoot?.querySelector('.consent-reject') as HTMLButtonElement;
    expect(rejectButton).toBeTruthy();

    const rejectSpy = vi.fn();
    banner.addEventListener('consent-reject', rejectSpy);

    rejectButton.click();

    expect(rejectSpy).toHaveBeenCalledTimes(1);
    const stored = localStorage.getItem('test-consent');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).accepted).toBe(false);
  });

  it('dismisses the banner and emits consent-dismiss', async () => {
    const banner = document.createElement('ux-consent-banner') as UxConsentBanner;
    container.appendChild(banner);
    await Promise.resolve();

    const dismissButton = banner.shadowRoot?.querySelector('.consent-close') as HTMLButtonElement;
    const dismissSpy = vi.fn();
    banner.addEventListener('consent-dismiss', dismissSpy);

    dismissButton.click();

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });
});
