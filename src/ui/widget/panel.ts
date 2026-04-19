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
 * 
 *   <p>Content here...</p>
 *   
 *   <div slot="footer">
 *     <small>Last updated: today</small>
 *   </div>
 * </ux-panel>
 */

export class UxPanel extends HTMLElement {
  private isExpanded = true;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.setupPanel();
    this.render();
    this.setupEventListeners();
  }

  // ==================== Attributes ====================

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

  // ==================== Rendering ====================

  private render() {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(style);

    const panel = document.createElement('div');
    panel.className = `panel panel-${this.variant}`;
    panel.innerHTML = `
      ${this.title ? `
        <div class="panel-header ${this.collapsible ? 'collapsible' : ''}">
          ${this.collapsible ? `
            <button class="panel-toggle" type="button" aria-expanded="${this.expanded}">
              <span class="toggle-icon">▶</span>
            </button>
          ` : ''}
          
          <div class="panel-title-group">
            <h3 class="panel-title">${this.escapeHtml(this.title)}</h3>
            ${this.subtitle ? `<p class="panel-subtitle">${this.escapeHtml(this.subtitle)}</p>` : ''}
          </div>

          <div class="panel-actions">
            <slot name="actions"></slot>
          </div>
        </div>
      ` : ''}

      <div class="panel-content">
        <slot></slot>
      </div>

      <div class="panel-footer">
        <slot name="footer"></slot>
      </div>
    `;

    this.shadowRoot.appendChild(panel);

    // Update expanded state
    this.updateExpandedState();
  }

  private setupPanel() {
    // Check initial expanded state from attribute
    if (this.hasAttribute('expanded')) {
      this.isExpanded = this.getAttribute('expanded') !== 'false';
    }
  }

  private updateExpandedState() {
    if (!this.shadowRoot) return;

    const panel = this.shadowRoot.querySelector('.panel');
    const content = this.shadowRoot.querySelector('.panel-content');
    const toggle = this.shadowRoot.querySelector('.panel-toggle') as HTMLButtonElement;

    if (!panel || !content) return;

    if (this.isExpanded) {
      panel.classList.remove('collapsed');
      content.classList.remove('hidden');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    } else {
      panel.classList.add('collapsed');
      content.classList.add('hidden');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    // Emit expand/collapse event
    const eventName = this.isExpanded ? 'panel-expand' : 'panel-collapse';
    this.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true
    }));
  }

  // ==================== Event Listeners ====================

  private setupEventListeners() {
    if (!this.shadowRoot) return;

    const toggle = this.shadowRoot.querySelector('.panel-toggle') as HTMLButtonElement;
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        this.updateExpandedState();
      });
    }
  }

  // ==================== Utilities ====================

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== Styles ====================

  private getStyles(): string {
    return `
      :host {
        --panel-bg: white;
        --panel-border: #e5e7eb;
        --panel-text: #374151;
        --panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .panel {
        background-color: var(--panel-bg);
        border: 1px solid var(--panel-border);
        border-radius: 0.5rem;
        overflow: hidden;
        transition: all 200ms ease;
      }

      .panel-default {
        box-shadow: var(--panel-shadow);
      }

      .panel-default:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .panel-accent {
        border-left: 4px solid #3b82f6;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
      }

      .panel-subtle {
        background-color: #f9fafb;
        border-color: #f3f4f6;
      }

      .panel-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--panel-border);
        display: flex;
        align-items: stretch;
        gap: 1rem;
      }

      .panel-header.collapsible {
        cursor: pointer;
        user-select: none;
      }

      .panel-header.collapsible:hover {
        background-color: #f9fafb;
      }

      .panel-toggle {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        flex-shrink: 0;
        transition: transform 200ms ease;
      }

      .panel-toggle:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
        border-radius: 0.25rem;
      }

      [aria-expanded="true"] .toggle-icon {
        transform: rotate(90deg);
      }

      .toggle-icon {
        display: inline-block;
        transition: transform 200ms ease;
        font-size: 0.75rem;
      }

      .panel-title-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.25rem;
      }

      .panel-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
      }

      .panel-subtitle {
        margin: 0;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .panel-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .panel-content {
        padding: 1.5rem;
        color: var(--panel-text);
        line-height: 1.6;
        transition: all 200ms ease;
      }

      .panel-content.hidden {
        display: none;
      }

      .panel-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--panel-border);
        background-color: #f9fafb;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .panel-footer:empty {
        display: none;
      }

      @media (max-width: 640px) {
        .panel-header {
          flex-wrap: wrap;
          padding: 1rem;
        }

        .panel-content {
          padding: 1rem;
        }

        .panel-footer {
          padding: 0.75rem 1rem;
        }

        .panel-title {
          font-size: 1rem;
        }
      }
    `;
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name === 'expanded') {
      this.isExpanded = newVal !== 'false';
      this.updateExpandedState();
    }
    if (name === 'title' || name === 'subtitle' || name === 'variant') {
      this.render();
      this.setupEventListeners();
    }
  }

  static get observedAttributes() {
    return ['title', 'subtitle', 'expanded', 'variant', 'collapsible'];
  }
}

if (!customElements.get('ux-panel')) {
  customElements.define('ux-panel', UxPanel);
}
