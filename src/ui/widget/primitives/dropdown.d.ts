/**
 * UX3 Dropdown / Select Component
 *
 * Custom dropdown with keyboard support, filtering, and custom rendering
 *
 * Usage:
 * <ux-dropdown name="country" placeholder="Select a country">
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 *   <option value="mx">Mexico</option>
 * </ux-dropdown>
 *
 * With filtering:
 * <ux-dropdown name="country" filterable="true" placeholder="Search...">
 *   <option value="us">United States</option>
 *   ...
 * </ux-dropdown>
 *
 * Multi-select:
 * <ux-dropdown name="tags" multiple="true">
 *   <option value="tag1">Tag 1</option>
 *   ...
 * </ux-dropdown>
 */
export declare class UxDropdown extends HTMLElement {
    static formAssociated: boolean;
    private internals;
    private isOpen;
    private selectedValues;
    private filteredOptions;
    private allOptions;
    private highlightedIndex;
    constructor();
    connectedCallback(): void;
    get name(): string;
    get placeholder(): string;
    get filterable(): boolean;
    get multiple(): boolean;
    get disabled(): boolean;
    get value(): string | string[];
    set value(val: string | string[]);
    private loadOptions;
    private renderOptions;
    private render;
    private setupInternalEventListeners;
    private setupEventListeners;
    private toggleDropdown;
    private filterOptions;
    private selectOption;
    private updateDisplay;
    private updateFormValue;
    private handleKeydown;
    private setupAccessibility;
    private getStyles;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    static get observedAttributes(): string[];
}
