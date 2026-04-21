/**
 * UX3 Form Field Component
 *
 * Encapsulates label + input + error + focus management
 * Integrates with ElementInternals for proper form association
 * Auto-infers label from i18n based on name and context
 *
 * Usage (simplified - slot inferred):
 * <ux-field name="email" type="email" required error="{{ctx.errors.email}}">
 *   <input />
 * </ux-field>
 *
 * Usage (explicit slot):
 * <ux-field name="email" type="email" required error="{{ctx.errors.email}}">
 *   <input slot="control" />
 * </ux-field>
 *
 * Usage (explicit label override):
 * <ux-field name="email" label="Custom Label" type="email" required>
 *   <input />
 * </ux-field>
 */
export declare class UxField extends HTMLElement {
    static formAssociated: boolean;
    private internals;
    private controlSlot;
    private errorEl;
    private labelEl;
    private control;
    constructor();
    connectedCallback(): void;
    get name(): string;
    get context(): string;
    /**
     * Get label: explicit attribute > auto-inferred from i18n > empty string
     * If label="" (empty string), it's still explicit and prevents auto-infer
     */
    get label(): string;
    get type(): string;
    get required(): boolean;
    get disabled(): boolean;
    get error(): string;
    get touched(): boolean;
    get hint(): string;
    /**
     * Infer form context from parent view or data-context attribute
     * Priority: data-context attr > ux-style > default to 'common'
     */
    private inferContext;
    /**
     * Infer label from i18n using context + field name
     * Expected key: {{i18n.{context}.fields.{name}.label}}
     */
    private inferLabel;
    set error(value: string);
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    private render;
    private updateLabel;
    private updateHint;
    /**
     * Auto-detect control from direct children (for implicit slot binding)
     * Looks for input, textarea, or select elements
     */
    private detectControlFromChildren;
    private setupSlotListener;
    private syncControlAttributes;
    private setupValidation;
    private setupAccessibility;
    private updateAccessibility;
    private updateError;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    static get observedAttributes(): string[];
    private getStyles;
}
