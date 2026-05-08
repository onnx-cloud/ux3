import { UxBase } from './base.js';

export class UxNotifications extends UxBase {
  private stack!: HTMLDivElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected onConnected(): void {
    super.onConnected();
    const position = this.getAttribute('position') || 'top-right';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { position: fixed; ${position.includes('top') ? 'top' : 'bottom'}: 1rem; ${position.includes('right') ? 'right' : 'left'}: 1rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; max-width: 360px; }
        .toast {
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; align-items: flex-start; gap: 0.5rem;
          animation: slideIn 0.2s ease-out;
          border-left: 4px solid;
        }
        .toast.info { border-left-color: #3b82f6; }
        .toast.success { border-left-color: #10b981; }
        .toast.warning { border-left-color: #f59e0b; }
        .toast.error { border-left-color: #ef4444; }
        .msg { flex: 1; font-size: 0.875rem; }
        .dismiss { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 1rem; line-height: 1; }
        .dismiss:hover { color: #6b7280; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
      </style>
    `;

    this.stack = (this.shadowRoot as unknown) as HTMLDivElement;

    this.addEventListener('ux:event', ((e: CustomEvent) => {
      if (e.detail?.action === 'RECEIVE') {
        this.push(e.detail.message || '', e.detail.type || 'info', e.detail.duration || 4000);
      }
    }) as EventListener);
  }

  push(message: string, type = 'info', duration = 4000): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="msg">${message}</span><button class="dismiss">&times;</button>`;
    this.stack.appendChild(toast);

    toast.querySelector('.dismiss')!.addEventListener('click', () => toast.remove());
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
  }
}
