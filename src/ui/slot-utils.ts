/**
 * Slot Observation Utility - Cross-browser utilities for managing shadow-dom slots
 */

/**
 * Observes a slot for assignment changes
 * 
 * @param host The custom element host containing the shadow root
 * @param slotName The name attribute of the slot (or empty for default)
 * @param callback Callback triggered on slot mutation
 * @returns Disconnect function
 */
export function observeSlot(
    host: HTMLElement,
    slotName: string | null,
    callback: (nodes: Node[]) => void
): () => void {
    if (!host.shadowRoot) {
        throw new Error('observeSlot requires a shadowRoot on the host');
    }

    const slotSelector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
    const slot = host.shadowRoot.querySelector(slotSelector) as HTMLSlotElement;

    if (!slot) {
        throw new Error(`Slot not found: ${slotName || 'default'}`);
    }

    const handler = () => {
        // Debounce slightly to handle mutations batching
        const assigned = slot.assignedNodes({ flatten: true });
        callback(assigned);
    };

    slot.addEventListener('slotchange', handler);
    
    // Initial call to sync current assignment
    handler();

    return () => {
        slot.removeEventListener('slotchange', handler);
    };
}

/**
 * Gets all assigned elements (skips text and comment nodes)
 * Normalizes assignedElements behavior
 * 
 * @param slot The slot element
 * @param flatten Whether to flatten nested slots
 * @returns Array of assigned elements
 */
export function getAssignedElements(slot: HTMLSlotElement, flatten: boolean = true): Element[] {
    const nodes = slot.assignedNodes({ flatten });
    return nodes.filter(node => node.nodeType === Node.ELEMENT_NODE) as Element[];
}
