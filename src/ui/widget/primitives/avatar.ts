import { UxBase } from './base.js';

export class UxAvatar extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const src = this.getAttribute('src');
    const name = this.getAttribute('name') || '';
    const size = this.getAttribute('size') || 'md';
    const dims = { sm: '2rem', md: '2.5rem', lg: '3.5rem' } as const;
    const d = dims[size as keyof typeof dims] || dims.md;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; justify-content: center; width: ${d}; height: ${d}; border-radius: 50%; overflow: hidden; background: #e5e7eb; color: #6b7280; font-weight: 600; font-size: calc(${d} * 0.4); }
        img { width: 100%; height: 100%; object-fit: cover; }
      </style>
      ${src ? `<img src="${src}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <span style="${src ? 'display:none' : ''}">${initials || '\uD83D\uDC64'}</span>
    `;
  }
}
