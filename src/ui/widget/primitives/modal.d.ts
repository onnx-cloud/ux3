import { LifecycleComponent } from '../../lifecycle-component.js';

export declare class UxModal extends LifecycleComponent {
    private dialog;
    constructor();
    protected onConnected(): void;
    onDisconnected(): void;
    private render;
    private setupCloseButtons;
    openModal(): void;
    closeModal(): void;
    open(): void;
    close(): void;
    private emit;
    protected onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void;
    static get observedAttributes(): string[];
    private styles;
}
