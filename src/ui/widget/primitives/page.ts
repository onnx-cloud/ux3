import { UxBase } from './base.js';

export class UxPage extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; min-height: 100vh; }
        .header { flex-shrink: 0; }
        .main { flex: 1; }
        .footer { flex-shrink: 0; }
        :host([ux-state$=".loading"]) .main { opacity: 0.5; pointer-events: none; }
        :host([ux-state$=".error"]) .error-slot { display: block; }
        .error-slot { display: none; padding: 1rem; background: #fef2f2; color: #7f1d1d; }
      </style>
      <div class="header"><slot name="header"></slot></div>
      <div class="main"><slot></slot></div>
      <div class="footer"><slot name="footer"></slot></div>
      <div class="error-slot"><slot name="error"></slot></div>
    `;
  }
}
