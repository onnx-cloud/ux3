/**
 * UX3 Modal / Dialog Web Component
 *
 * FSM-driven modal dialog with keyboard support, focus trapping, and accessibility
 *
 * Usage:
 * <ux-modal ux-fsm="confirmDelete" ux-view="deleteConfirm" opened="false">
 *   <div slot="header">
 *     <h2>Confirm Delete</h2>
 *   </div>
 *   <div slot="body">
 *     <p>Are you sure you want to delete this item?</p>
 *   </div>
 *   <div slot="footer">
 *     <ux-button variant="secondary" ux-event="click:CANCEL">Cancel</ux-button>
 *     <ux-button variant="danger" ux-event="click:CONFIRM">Delete</ux-button>
 *   </div>
 * </ux-modal>
 */
export declare class UxModal extends HTMLElement {
    private backdrop;
    private dialog;
    private focusTrap;
    constructor();
    connectedCallback(): void;
    private render;
    private initializeModal;
    /**
     * Sync 'opened' attribute with dialog open state
     */
    private syncOpenedAttribute;
    /**
     * Open modal dialog
     */
    openModal(): void;
    /**
     * Close modal dialog
     */
    closeModal(): void;
    /**
     * Setup backdrop click to close
     */
    private setupBackdrop;
    private setupCloseButton;
    /**
     * Setup keyboard handling (Escape to close)
     */
    private setupKeyboardHandling;
    /**
     * Setup focus trap (Tab cycling within modal)
     */
    private setupFocusTrap;
    protected getStyles(): string;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    static get observedAttributes(): string[];
}
