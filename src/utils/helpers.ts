export function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export const UX_EVENT = 'ux:overlay.toggle';
export const UX_CHANGE = 'ux:input.change';
