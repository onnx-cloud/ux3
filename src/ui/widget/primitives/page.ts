/**
 * UX3 Page Component (light DOM)
 */
import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-page-style';
const STYLE_CSS = `    ux-page { display: flex; flex-direction: column; min-height: 100vh; }
    ux-page .header { flex-shrink: 0; }
    ux-page .main { flex: 1; }
    ux-page .footer { flex-shrink: 0; }
    ux-page[ux-state$=".loading"] .main { opacity: 0.5; pointer-events: none; }
    ux-page[ux-state$=".error"] .error-slot { display: block; }
    ux-page .error-slot { display: none; padding: 1rem; background: #fef2f2; color: #7f1d1d; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);
export class UxPage extends UxBase {
  protected onConnected(): void {
    super.onConnected();
}
}
