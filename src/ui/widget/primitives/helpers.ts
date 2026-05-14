/** Shared helper utilities for primitives */

export function collectFieldValues(host: HTMLElement): Record<string, string> {
  const values: Record<string, string> = {};
  const elements = host.querySelectorAll('ux-input, ux-textarea, ux-select, ux-combobox, ux-radio-group, ux-date-picker, ux-slider');
  elements.forEach((element) => {
    const name = element.getAttribute('name');
    if (!name) return;
    values[name] = element.getAttribute('value') ?? '';
  });
  const nativeInputs = host.querySelectorAll('input, textarea, select');
  nativeInputs.forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!input.name) return;
    if (values[input.name]) return;
    if (input instanceof HTMLInputElement && (input.type === 'radio' || input.type === 'checkbox')) {
      if (input.checked) values[input.name] = input.value;
    } else {
      values[input.name] = input.value;
    }
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
