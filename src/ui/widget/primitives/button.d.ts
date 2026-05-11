/**
 * UX3 Button Web Component
 *
 * Autonomous custom element used as:
 * <ux-button variant="primary">Save</ux-button>
 */
export declare class UxButton extends HTMLElement {
    private buttonEl;
    constructor();
    connectedCallback(): void;
    get variant(): 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
    get size(): 'sm' | 'md' | 'lg';
    get loading(): boolean;
    set loading(value: boolean);
    private setupAccessibility;
    private updateLoadingState;
    private render;
    private getStyles;
    attributeChangedCallback(name: string, _oldVal: string, _newVal: string): void;
    static get observedAttributes(): string[];
}
