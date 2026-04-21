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
export declare class UxPanel extends HTMLElement {
    private isExpanded;
    constructor();
    connectedCallback(): void;
    get title(): string;
    get subtitle(): string;
    get collapsible(): boolean;
    get expanded(): boolean;
    set expanded(value: boolean);
    get variant(): 'default' | 'accent' | 'subtle';
    private render;
    private setupPanel;
    private updateExpandedState;
    private setupEventListeners;
    private escapeHtml;
    private getStyles;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    static get observedAttributes(): string[];
}
