/**
 * UX3 Panel / Card Component
 *
 * Container for grouping related content with optional collapsible header
 *
 * Usage:
 * Simple panel:
 * <ux-panel title="User Details">
 *   <p>Content here...</p>
 * </ux-panel>
 *
 * Collapsible:
 * <ux-panel title="Settings" collapsible="true" expanded="true">
 *   <div slot="actions">
 *     <button>Edit</button>
 *   </div>
 *   <p>Content here...</p>
 *   <div slot="footer">
 *     <small>Last updated: today</small>
 *   </div>
 * </ux-panel>
 */
import { LifecycleComponent } from '../../lifecycle-component.js';
import { escapeHtml } from '../../../security/sanitizer.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-panel-style';
const STYLE_CSS = `
  ux-panel {
    display: block;
    background: var(--color-bg, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: var(--radius-lg, 0.75rem);
    overflow: hidden;
    transition: box-shadow var(--transition-normal, 200ms ease);
  }
  ux-panel:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  ux-panel .panel-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm, 0.5rem);
    padding: var(--spacing-lg, 1.25rem) var(--spacing-lg, 1.25rem) 0;
  }
  ux-panel .panel-header.collapsible {
    cursor: pointer;
    user-select: none;
  }
  ux-panel .panel-toggle {
    appearance: none;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: var(--spacing-xs, 0.25rem);
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
    transition: transform var(--transition-fast, 150ms ease);
    flex-shrink: 0;
  }
  ux-panel .panel-toggle[aria-expanded="true"] .toggle-icon {
    display: inline-block;
    transform: rotate(90deg);
  }
  ux-panel .toggle-icon {
    display: inline-block;
    transition: transform 0.2s;
  }
  ux-panel .panel-title-group {
    flex: 1;
    min-width: 0;
  }
  ux-panel .panel-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #0f172a);
  }
  ux-panel .panel-subtitle {
    margin: var(--spacing-xxs, 0.25rem) 0 0;
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
  }
  ux-panel .panel-actions {
    display: flex;
    gap: var(--spacing-xs, 0.5rem);
    flex-shrink: 0;
  }
  ux-panel .panel-content {
    padding: var(--spacing-lg, 1.25rem);
  }
  ux-panel .panel-footer {
    padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.25rem);
    border-top: 1px solid var(--color-border, #e2e8f0);
    background: var(--color-bg-muted, #f8fafc);
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
  }
  ux-panel .panel-header + .panel-content {
    padding-top: var(--spacing-sm, 0.5rem);
  }
  ux-panel[variant="accent"] {
    border-color: var(--color-primary, #3b82f6);
    border-width: 2px;
  }
  ux-panel[variant="subtle"] {
    background: var(--color-bg-muted, #f8fafc);
    border-color: transparent;
  }
  ux-panel:not([title]) .panel-header {
    display: none;
  }
  ux-panel:not([title]) .panel-content {
    padding-top: var(--spacing-lg, 1.25rem);
  }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxPanel extends LifecycleComponent {
  private isExpanded = true;
  private panelEl: HTMLDivElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private contentEl: HTMLDivElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.setupPanel();
    this.render();
    this.setupEventListeners();
  }

  get title(): string {
    return this.getAttribute('title') || '';
  }

  get subtitle(): string {
    return this.getAttribute('subtitle') || '';
  }

  get collapsible(): boolean {
    return this.hasAttribute('collapsible');
  }

  get expanded(): boolean {
    return this.isExpanded;
  }

  set expanded(value: boolean) {
    this.isExpanded = value;
    this.updateExpandedState();
  }

  get variant(): 'default' | 'accent' | 'subtle' {
    return (this.getAttribute('variant') as any) || 'default';
  }

  private render() {
    const panel = document.createElement('div');
    panel.className = `panel panel-${this.variant}`;

    if (this.title) {
      const header = document.createElement('div');
      header.className = `panel-header${this.collapsible ? ' collapsible' : ''}`;

      if (this.collapsible) {
        const toggleSlot = document.createElement('slot');
        toggleSlot.name = 'toggle';
        header.appendChild(toggleSlot);

        const btn = document.createElement('button');
        btn.className = 'panel-toggle';
        btn.type = 'button';
        btn.setAttribute('aria-expanded', String(this.expanded));
        btn.innerHTML = '<span class="toggle-icon">▶</span>';
        header.appendChild(btn);
        this.toggleBtn = btn;
      }

      const titleGroup = document.createElement('div');
      titleGroup.className = 'panel-title-group';

      const titleSlot = document.createElement('slot');
      titleSlot.name = 'title';
      titleGroup.appendChild(titleSlot);

      if (this.title) {
        const h3 = document.createElement('h3');
        h3.className = 'panel-title';
        h3.textContent = this.title;
        titleGroup.appendChild(h3);
      }
      if (this.subtitle) {
        const p = document.createElement('p');
        p.className = 'panel-subtitle';
        p.textContent = this.subtitle;
        titleGroup.appendChild(p);
      }

      header.appendChild(titleGroup);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'panel-actions';
      const actionsSlot = document.createElement('slot');
      actionsSlot.name = 'actions';
      actionsDiv.appendChild(actionsSlot);
      header.appendChild(actionsDiv);

      panel.appendChild(header);
    }

    const content = document.createElement('div');
    content.className = 'panel-content';
    const defaultSlot = document.createElement('slot');
    content.appendChild(defaultSlot);
    panel.appendChild(content);
    this.contentEl = content;

    const footer = document.createElement('div');
    footer.className = 'panel-footer';
    const footerSlot = document.createElement('slot');
    footerSlot.name = 'footer';
    footer.appendChild(footerSlot);
    panel.appendChild(footer);

    this.panelEl = panel;
    this.appendChild(panel);
    this.updateExpandedState();
  }

  private setupPanel() {
    if (this.hasAttribute('expanded')) {
      this.isExpanded = this.getAttribute('expanded') !== 'false';
    }
  }

  private updateExpandedState() {
    if (!this.contentEl) return;
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-expanded', String(this.isExpanded));
    }
    this.contentEl.style.display = this.isExpanded ? '' : 'none';
    if (this.isExpanded) {
      this.setAttribute('expanded', '');
    } else {
      this.removeAttribute('expanded');
    }
  }

  private setupEventListeners() {
    const header = this.querySelector('.panel-header.collapsible');
    if (header) {
      header.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, select, [role="button"]')) return;
        this.toggle();
      });
    }

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }

    this.panelEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const toggle = this.querySelector('.panel-toggle');
        if (toggle && document.activeElement === toggle) {
          e.preventDefault();
          this.toggle();
        }
      }
    });
  }

  toggle() {
    if (!this.collapsible) return;
    this.expanded = !this.isExpanded;
    this.dispatchEvent(new CustomEvent('ux:panel.toggle', {
      bubbles: true, composed: true,
      detail: { expanded: this.isExpanded },
    }));
  }

  static get observedAttributes(): string[] {
    return ['title', 'subtitle', 'variant', 'collapsible', 'expanded'];
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'expanded') {
      this.isExpanded = this.hasAttribute('expanded') && this.getAttribute('expanded') !== 'false';
      this.updateExpandedState();
    }
  }
}
