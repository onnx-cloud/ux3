/**
 * UX3 Field Array Component
 *
 * Manages repeated fields (e.g., multiple addresses)
 *
 * Usage:
 * <ux-field-array name="addresses" context="shipping">
 *   <template slot="item">
 *     <ux-field name="street">
 *       <input slot="control" />
 *     </ux-field>
 *   </template>
 * </ux-field-array>
 */
export declare class UxFieldArray extends HTMLElement {
    private items;
    private template;
    connectedCallback(): void;
    get name(): string;
    get context(): string;
    /**
     * Add a new field to the array
     */
    addItem(data?: Record<string, any>): void;
    /**
     * Remove a field from the array
     */
    removeItem(element: HTMLElement): void;
    /**
     * Get all field values
     */
    getValues(): any[];
    /**
     * Get item count
     */
    getItemCount(): number;
    private render;
}
