import { UxBase } from './base.js';

export class UxWizard extends UxBase {
  private steps: HTMLElement[] = [];
  private currentStep = 0;

  protected onConnected(): void {
    super.onConnected();
    this.steps = Array.from(this.querySelectorAll('[ux-wizard-step]'));
    this.goToStep(Number(this.getAttribute('value')) || 0);

    this.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.matches('[ux-wizard-next]')) this.next();
      else if (target.matches('[ux-wizard-prev]')) this.prev();
    });
  }

  protected onFSMContext(state: string, context: Record<string, any>): void {
    super.onFSMContext(state, context);
    if (context && 'step' in context) {
      const step = context.step as number;
      if (typeof step === 'number') {
        this.goToStep(step);
      }
    }
  }

  protected applyData(data: any): void {
    if (typeof data === 'object' && data !== null && 'step' in data) {
      const step = data.step as number;
      if (typeof step === 'number') {
        this.goToStep(step);
      }
    }
  }

  private goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.steps.forEach((s, i) => {
      s.style.display = i === index ? '' : 'none';
    });
    this.setAttribute('value', String(index));
    this.dispatchEvent(new CustomEvent('ux:wizard.step.change', {
      bubbles: true,
      composed: true,
      detail: { step: index, total: this.steps.length },
    }));
  }

  next(): void {
    if (this.hasAttribute('ux-state')) {
      this.sendToFSM('NEXT', { step: this.currentStep, total: this.steps.length });
      return;
    }
    this.goToStep(this.currentStep + 1);
  }

  prev(): void {
    if (this.hasAttribute('ux-state')) {
      this.sendToFSM('PREV', { step: this.currentStep, total: this.steps.length });
      return;
    }
    this.goToStep(this.currentStep - 1);
  }
}
