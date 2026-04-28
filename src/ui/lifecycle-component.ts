/**
 * Shared lifecycle contract for internal UX3 web components.
 *
 * Components override hook methods instead of raw custom-element callbacks.
 * This keeps lifecycle behavior declarative and guarantees cleanup.
 */
export abstract class LifecycleComponent extends HTMLElement {
  private readonly managedCleanups = new Set<() => void>();

  connectedCallback(): void {
    this.onConnected();
  }

  disconnectedCallback(): void {
    this.runManagedCleanups();
    this.onDisconnected();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    this.onAttributeChanged(name, oldValue, newValue);
  }

  protected onConnected(): void {}

  protected onDisconnected(): void {}

  protected onAttributeChanged(_name: string, _oldValue: string | null, _newValue: string | null): void {}

  protected listen(
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): () => void {
    target.addEventListener(eventName, handler, options);

    let active = true;
    const cleanup = () => {
      if (!active) {
        return;
      }
      active = false;
      target.removeEventListener(eventName, handler, options);
      this.managedCleanups.delete(cleanup);
    };

    this.managedCleanups.add(cleanup);
    return cleanup;
  }

  protected observe(
    observer: MutationObserver,
    target: Node,
    options: MutationObserverInit,
  ): () => void {
    observer.observe(target, options);

    let active = true;
    const cleanup = () => {
      if (!active) {
        return;
      }
      active = false;
      observer.disconnect();
      this.managedCleanups.delete(cleanup);
    };

    this.managedCleanups.add(cleanup);
    return cleanup;
  }

  protected manageCleanup(cleanup: () => void): () => void {
    let active = true;
    const wrapped = () => {
      if (!active) {
        return;
      }
      active = false;
      cleanup();
      this.managedCleanups.delete(wrapped);
    };

    this.managedCleanups.add(wrapped);
    return wrapped;
  }

  protected clearManagedCleanups(): void {
    this.runManagedCleanups();
  }

  private runManagedCleanups(): void {
    const cleanups = Array.from(this.managedCleanups);
    this.managedCleanups.clear();
    for (const cleanup of cleanups) {
      cleanup();
    }
  }
}