import { UxBase } from './base.js';
import { collectFieldValues } from './helpers.js';

export class UxForm extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.addEventListener('submit', this.onSubmit);
  }

  protected onDisconnected(): void {
    this.removeEventListener('submit', this.onSubmit);
  }

  private readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('ux:submit', {
      bubbles: true,
      detail: collectFieldValues(this),
    }));
  };
}
