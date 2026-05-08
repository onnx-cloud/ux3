import { UxToggle } from './toggle.js';

export class UxAccordion extends UxToggle {
  protected onConnected(): void {
    super.onConnected();
    this.querySelectorAll('[ux-accordion-item], details').forEach((item) => {
      item.addEventListener('toggle', this.onItemToggle as EventListener);
    });
  }

  private readonly onItemToggle = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.hasAttribute('open')) return;
    this.querySelectorAll('[ux-accordion-item][open], details[open]').forEach((item) => {
      if (item !== target) item.removeAttribute('open');
    });
    this.dispatchEvent(new CustomEvent('ux:change', {
      bubbles: true,
      detail: { openItem: target },
    }));
  };
}
