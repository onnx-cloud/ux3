/**
 * Unit tests for Slot Observation Utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { observeSlot, getAssignedElements } from '../slot-utils.js';

describe('slot-utils', () => {
    let host: HTMLElement;
    let shadow: ShadowRoot;
    let slot: HTMLSlotElement;

    beforeEach(() => {
        // Create custom element with shadow root
        host = document.createElement('div');
        shadow = host.attachShadow({ mode: 'open' });
        slot = document.createElement('slot');
        shadow.appendChild(slot);
        
        // Mock assignedNodes on the slot (not fully simulated by JSDOM)
        slot.assignedNodes = vi.fn().mockImplementation((options?) => {
            // Very simple mock: return everything in the light DOM
            return Array.from(host.childNodes);
        });
    });

    describe('getAssignedElements', () => {
        it('filters non-element nodes', () => {
            const el1 = document.createElement('div');
            const el2 = document.createElement('div');
            const text = document.createTextNode('Hello');
            host.append(el1, text, el2);
            
            const results = getAssignedElements(slot);
            expect(results).toHaveLength(2);
            expect(results[0]).toBe(el1);
            expect(results[1]).toBe(el2);
        });

        it('returns empty array if no matches', () => {
            const results = getAssignedElements(slot);
            expect(results).toHaveLength(0);
        });
    });

    describe('observeSlot', () => {
        it('calls back on registration', () => {
            const callback = vi.fn();
            const disconnect = observeSlot(host, null, callback);
            
            expect(callback).toHaveBeenCalledTimes(1);
            disconnect();
        });

        it('calls back on slotchange event', () => {
            const callback = vi.fn();
            const disconnect = observeSlot(host, null, callback);
            
            slot.dispatchEvent(new Event('slotchange'));
            expect(callback).toHaveBeenCalledTimes(2);
            disconnect();
        });

        it('supports named slots', () => {
             // Setup named slot
             const namedSlot = document.createElement('slot');
             namedSlot.setAttribute('name', 'header');
             shadow.appendChild(namedSlot);
             
             namedSlot.assignedNodes = vi.fn().mockReturnValue([]);
             
             const callback = vi.fn();
             const disconnect = observeSlot(host, 'header', callback);
             
             expect(callback).toHaveBeenCalledTimes(1);
             disconnect();
        });
    });
});
