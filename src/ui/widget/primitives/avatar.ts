/**
 * UX3 Avatar Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-avatar-style';
const STYLE_CSS = `
  ux-avatar { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; background: #e5e7eb; color: #6b7280; font-weight: 600; }
  ux-avatar[size="sm"] { width: 2rem; height: 2rem; font-size: 0.8rem; }
  ux-avatar[size="md"], ux-avatar:not([size]) { width: 2.5rem; height: 2.5rem; font-size: 1rem; }
  ux-avatar[size="lg"] { width: 3.5rem; height: 3.5rem; font-size: 1.4rem; }
  ux-avatar img { width: 100%; height: 100%; object-fit: cover; }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxAvatar extends UxBase {
  protected onConnected(): void {
    super.onConnected();

    const src = this.getAttribute('src');
    const name = this.getAttribute('name') || '';
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    this.innerHTML = src
      ? `<img src="${src}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span style="display:none">${initials || '\uD83D\uDC64'}</span>`
      : initials || '\uD83D\uDC64';
  }
}
