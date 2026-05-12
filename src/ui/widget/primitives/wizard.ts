import { UxValue } from './value.js';

export class UxWizard extends UxValue {
  private steps: HTMLElement[] = [];
  private currentStep = 0;

  protected onConnected(): void {
    super.onConnected();
    this.steps = Array.from(this.querySelectorAll('[ux-wizard-step]'));
    this.goToStep(Number(this.getAttribute('value')) || 0);

    this.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.matches('[ux-wizard-next]')) { this.next(); }
      else if (target.matches('[ux-wizard-prev]')) { this.prev(); }
    });
  }

  private goToStep(index: number) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.steps.forEach((s, i) => {
      s.style.display = i === index ? '' : 'none';
    });
    this.setAttribute('value', String(index));
    this.dispatchEvent(new CustomEvent('ux:wizard.step.change', {
      bubbles: true,
      detail: { step: index, total: this.steps.length },
    }));
  }

  next() { this.goToStep(this.currentStep + 1); }
  prev() { this.goToStep(this.currentStep - 1); }
}
