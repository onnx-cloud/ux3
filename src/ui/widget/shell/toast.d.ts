/**
 * UX3 Toast / Notification Component
 *
 * Auto-dismissing toast notifications with stacking support and i18n
 *
 * Usage:
 * <ux-toast-container position="top-right"></ux-toast-container>
 *
 * Then emit toasts via:
 * const container = document.querySelector('ux-toast-container');
 * container.show({ message: 'Saved!', type: 'success', duration: 3000 });
 */
export interface ToastConfig {
    message: string;
    messageKey?: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    action?: {
        label: string;
        labelKey?: string;
        callback: () => void;
    };
    onDismiss?: () => void;
}
export declare class UxToastContainer extends HTMLElement {
    private toasts;
    private toastCounter;
    connectedCallback(): void;
    private setupContainer;
    /**
     * Show a toast notification
     */
    show(config: ToastConfig): string;
    /**
     * Dismiss a toast by ID
     */
    dismiss(id: string): void;
    /**
     * Dismiss all toasts
     */
    dismissAll(): void;
}
