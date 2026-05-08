/** Shared helper utilities for primitives */

export function collectFieldValues(host: HTMLElement): Record<string, string> {
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

export function emitReadyOnce(el: HTMLElement): void {
  if (el.dataset.uxReady === '1') {
    return;
  }
  el.dataset.uxReady = '1';
  queueMicrotask(() => {
    el.dispatchEvent(new CustomEvent('ux:ready', { bubbles: true }));
  });
}

export function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
