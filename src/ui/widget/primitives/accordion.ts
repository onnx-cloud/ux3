import { UxToggle } from './toggle.js';

export class UxAccordion extends UxToggle {
  protected onConnected(): void {
    super.onConnected();
    this.ensureDetailsStructure();
    this.querySelectorAll('[ux-accordion-item], details').forEach((item) => {
      item.addEventListener('toggle', this.onItemToggle as EventListener);
    });
  }

  private ensureDetailsStructure(): void {
    const existing = this.querySelectorAll('[ux-accordion-item], details');
    if (existing.length > 0) return;

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const content = document.createElement('div');

    while (this.firstChild) {
      if (this.firstChild !== details) {
        content.appendChild(this.firstChild);
      }
    }

    summary.textContent = this.getAttribute('label') || 'Toggle';
    details.appendChild(summary);
    details.appendChild(content);
    this.appendChild(details);

    if (this.hasAttribute('open') || this.hasAttribute('checked')) {
      details.setAttribute('open', '');
    }
  }

  private readonly onItemToggle = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.hasAttribute('open')) return;
    this.querySelectorAll('[ux-accordion-item][open], details[open]').forEach((item) => {
      if (item !== target) item.removeAttribute('open');
    });
    this.dispatchEvent(new CustomEvent('ux:accordion.section.change', {
      bubbles: true,
      detail: { openItem: target },
    }));
  };
}
